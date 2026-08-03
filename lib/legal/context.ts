/**
 * Builds the "Retrieved legal sources" block that grounds legal answers.
 *
 * Pure: no network, no database. The rules that matter for safety — what gets
 * included, what gets truncated, and how a non-current or out-of-jurisdiction
 * provision is labelled — are all decided here and unit-tested.
 */

import { describeExtent } from "@/lib/legal/extent";

/** Why a source is shown despite not being current E&W law. */
export type SourceFlag = "not-in-force" | "outside-jurisdiction";

export type ContextSource = {
  title: string;
  jurisdiction: string;
  sourceType: string;
  heading: string | null;
  content: string;
  citationLabel: string | null;
  provisionRef?: string | null;
  inForce?: boolean | null;
  status?: string | null;
  extent?: string | null;
  hasUnappliedAmendments?: boolean | null;
  upToDateTo?: string | null;
  sourceUrl?: string | null;
  matchType?: "citation" | "semantic" | "keyword";
  /**
   * Set only when the user named this provision explicitly. Flagged sources are
   * shown so the assistant can say what happened to it rather than "not found",
   * and never reach the model unlabelled.
   */
  flags?: SourceFlag[];
};

/**
 * Budget. The chat already carries a large case context, and the earlier review
 * found that role-boundary adherence degrades in long contexts — so this cap is
 * a safety measure as much as a cost one.
 *
 * Measured against the live corpus, a typical question retrieves ~13,000 chars
 * across 8 sources, so these limits bite only the largest results.
 */
export const MAX_SOURCES = 6;
export const MAX_CHARS_PER_SOURCE = 2500;
export const MAX_TOTAL_CHARS = 12000;

export const NO_SOURCES_BLOCK = [
  "Retrieved legal sources: NONE — no provision matched this question.",
  "",
  "You have no legal source for this question. Say so plainly. Do not answer it",
  "from memory as though you had one.",
].join("\n");

function truncate(content: string, sourceUrl: string | null | undefined, limit: number) {
  const text = content.trim();
  if (text.length <= limit) return { text, truncated: false };
  // Cut at a line boundary where possible so a subsection is not sliced mid-sentence.
  const slice = text.slice(0, limit);
  const lastBreak = slice.lastIndexOf("\n");
  const cut = lastBreak > limit * 0.6 ? slice.slice(0, lastBreak) : slice;
  const marker = sourceUrl
    ? `\n[text truncated — full provision at ${sourceUrl}]`
    : "\n[text truncated — this is not the complete provision]";
  return { text: cut.trimEnd() + marker, truncated: true };
}

/** Human-readable status line for a source that is not current E&W law. */
export function statusLineFor(source: ContextSource): string | null {
  const flags = source.flags ?? [];

  if (flags.includes("outside-jurisdiction")) {
    const where = source.extent ? `extends to ${source.extent} only` : "does not extend to England and Wales";
    return (
      `DOES NOT APPLY IN ENGLAND AND WALES — this provision ${where}. ` +
      `It is NOT the law in the user's jurisdiction. It is shown only because the ` +
      `user named it. Say that plainly and do NOT explain it as if it governed their case.`
    );
  }

  if (flags.includes("not-in-force")) {
    const what =
      source.status === "Repealed"
        ? "has been REPEALED"
        : source.status === "Prospective"
          ? "is NOT YET IN FORCE (never commenced)"
          : "is NOT IN FORCE";
    return (
      `NOT IN FORCE — this provision ${what}. It is NOT current law. ` +
      `It is shown only because the user named it. Tell the user its status; ` +
      `do NOT present it as the law that applies now.`
    );
  }

  return null;
}

function currencyLineFor(source: ContextSource): string | null {
  const parts: string[] = [];
  if (source.upToDateTo) parts.push(`up to date to ${source.upToDateTo}`);
  const extentNote = describeExtent(source.extent);
  if (extentNote) parts.push(extentNote);
  if (source.hasUnappliedAmendments) {
    parts.push("AMENDMENTS NOT YET APPLIED — tell the user to check the current version");
  }
  return parts.length ? parts.join("; ") : null;
}

/**
 * Removes the citation/heading prefix that the indexer prepends before
 * embedding.
 *
 * That prefix exists to give short provisions enough context to match a
 * plain-English question, and it is stored as the embedded text — so the
 * semantic RPC returns it. We already render citation and heading as their own
 * lines, so leaving it in the body would repeat them and waste budget. The
 * citation lookup returns the raw provision and is unaffected.
 */
export function stripEmbeddingPrefix(content: string, source: ContextSource): string {
  let text = content.trimStart();
  for (const prefix of [source.citationLabel, source.heading]) {
    if (!prefix) continue;
    const trimmed = prefix.trim();
    if (trimmed && text.startsWith(trimmed)) {
      text = text.slice(trimmed.length).trimStart();
    }
  }
  return text || content.trim();
}

function renderSource(source: ContextSource, index: number, limit: number): string {
  const body = stripEmbeddingPrefix(source.content, source);
  const { text } = truncate(body, source.sourceUrl, limit);
  const flagged = (source.flags ?? []).length > 0;

  return [
    `Source ${index}: ${source.title}${flagged ? "  [FLAGGED — SEE STATUS]" : ""}`,
    `Jurisdiction: ${source.jurisdiction}`,
    `Type: ${source.sourceType}`,
    source.heading ? `Heading: ${source.heading}` : null,
    source.citationLabel ? `Citation: ${source.citationLabel}` : null,
    statusLineFor(source) ? `Status: ${statusLineFor(source)}` : null,
    currencyLineFor(source) ? `Currency: ${currencyLineFor(source)}` : null,
    `Content: ${text}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export type BuiltContext = {
  text: string;
  used: number;
  dropped: number;
  truncated: number;
  totalChars: number;
};

/**
 * Orders, caps and renders sources.
 *
 * Explicitly-cited provisions are admitted first so a direct question is never
 * crowded out by semantically similar material.
 */
export function buildLegalContext(
  sources: ContextSource[],
  options: {
    maxSources?: number;
    maxCharsPerSource?: number;
    maxTotalChars?: number;
  } = {}
): BuiltContext {
  const maxSources = options.maxSources ?? MAX_SOURCES;
  const perSource = options.maxCharsPerSource ?? MAX_CHARS_PER_SOURCE;
  const maxTotal = options.maxTotalChars ?? MAX_TOTAL_CHARS;

  if (!sources.length) {
    return { text: NO_SOURCES_BLOCK, used: 0, dropped: 0, truncated: 0, totalChars: 0 };
  }

  // Citation hits first, otherwise preserve incoming rank order.
  const ordered = [
    ...sources.filter((s) => s.matchType === "citation"),
    ...sources.filter((s) => s.matchType !== "citation"),
  ];

  const rendered: string[] = [];
  let totalChars = 0;
  let used = 0;
  let truncatedCount = 0;

  for (const source of ordered) {
    if (used >= maxSources) break;
    const block = renderSource(source, used + 1, perSource);
    // Always admit the first source, even if it alone exceeds the budget —
    // returning nothing would be worse than returning one long provision.
    if (used > 0 && totalChars + block.length > maxTotal) break;
    if (block.includes("[text truncated")) truncatedCount++;
    rendered.push(block);
    totalChars += block.length;
    used++;
  }

  return {
    text: rendered.join("\n\n---\n\n"),
    used,
    dropped: sources.length - used,
    truncated: truncatedCount,
    totalChars,
  };
}
