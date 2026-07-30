/**
 * Parsers for legislation.gov.uk CLML (`data.xml`).
 *
 * Pure functions over XML strings — no network, no database — so everything
 * here is unit-testable against saved fixtures.
 *
 * Guiding principle: CAPTURE, DON'T COMPUTE. We record the currency signals
 * legislation.gov.uk publishes. We never try to apply amendments ourselves to
 * derive "current" text — getting that subtly wrong is worse than not doing it.
 */

import {
  attrsOf,
  childByTag,
  childrenOf,
  collapseWhitespace,
  deepText,
  isTextNode,
  parseXml,
  tagOf,
  textOf,
  walk,
  type ClmlNode,
} from "./xml";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UnappliedEffect = {
  requiresApplied: boolean;
  type: string | null;
  affectedProvisionsLabel: string | null;
  /** Structured refs from <ukm:AffectedProvisions>, e.g. ["section-8"]. */
  affectedFoundRefs: string[];
  affectingTitle: string | null;
  affectingUri: string | null;
};

export type InstrumentMeta = {
  title: string | null;
  type: "act" | "si" | null;
  documentMainType: string | null;
  /** <dct:valid> — the date the revised text is up to date to. */
  upToDateTo: string | null;
};

export type EnumeratedProvision = {
  /** Path under the instrument, e.g. "section/8", "schedule/14/paragraph/33". */
  ref: string;
  /** CLML element id, e.g. "section-8" — used for currency matching. */
  id: string;
  number: string | null;
  heading: string | null;
  content: string;
  versionDate: string | null;
  /** Raw CLML Status verbatim, e.g. "Repealed" | "Prospective" | null. */
  status: string | null;
  /** Observed: the source carried no operative text (empty <Text/>). */
  contentOmitted: boolean;
  inForce: boolean;
  position: number;
};

export type ProvisionParse = {
  number: string | null;
  heading: string | null;
  content: string;
  versionDate: string | null;
  status: string | null;
  contentOmitted: boolean;
  inForce: boolean;
  hasUnappliedAmendments: boolean;
  amendmentNote: string;
  matchedEffects: UnappliedEffect[];
};

// ---------------------------------------------------------------------------
// Tag classification (derived from every tag observed inside Children Act
// provisions; unknown tags fall through to "recurse", so content is never lost)
// ---------------------------------------------------------------------------

/** Dropped entirely — editorial annotation markers, not statutory text. */
const SKIP_TAGS: ReadonlySet<string> = new Set(["CommentaryRef"]);

/** Unwrapped in place: their text joins the surrounding line. */
const INLINE_TAGS: ReadonlySet<string> = new Set([
  "Addition", "Substitution", "Repeal", "Term", "InlineAmendment", "Acronym",
  "Character", "Citation", "CitationSubRef", "Abbreviation", "AppendText",
  "Emphasis", "Strong", "Superscript", "Subscript", "Expanded", "Foreign",
  "InternalLink", "ExternalLink", "Span", "Inline", "Definition",
  "Uppercase", "SmallCaps", "Proviso",
]);

/** Numbered levels: each starts a new line with its own marker and indent. */
const NUMBERED_LEVELS: Readonly<Record<string, number>> = {
  P2: 0, P3: 1, P4: 2, P5: 3, P6: 4, P7: 5,
};

/** Transparent containers — recurse without starting a line. */
const PARA_CONTAINERS: ReadonlySet<string> = new Set([
  "P1para", "P2para", "P3para", "P4para", "P5para", "P6para", "P7para",
]);

/** Emit their content then end the line. */
const BLOCK_TAGS: ReadonlySet<string> = new Set(["Text", "Para", "BlockText"]);

const INDENT = "    ";

// ---------------------------------------------------------------------------
// Text formatting
// ---------------------------------------------------------------------------

/**
 * Accumulates rendered lines. Markers are attached to the line they introduce,
 * so "(a)" can never be jammed onto the following word.
 */
class LineBuilder {
  private lines: string[] = [];
  private parts: string[] = [];
  private indent = 0;
  private open = false;

  startLine(indent: number, prefix: string) {
    this.flush();
    this.indent = indent;
    this.open = true;
    if (prefix) this.parts.push(prefix);
  }

  append(text: string, indent: number) {
    if (!text) return;
    if (!this.open) {
      this.indent = indent;
      this.open = true;
    }
    this.parts.push(text);
  }

  flush() {
    const text = collapseWhitespace(this.parts.join(""));
    this.parts = [];
    this.open = false;
    if (text) this.lines.push(INDENT.repeat(Math.max(0, this.indent)) + text);
  }

  result(): string {
    this.flush();
    return this.lines.join("\n").trim();
  }
}

/** The marker text of a node's own <Pnumber>, e.g. "2A" or "a". */
function markerOf(node: ClmlNode): string {
  const pnumber = childByTag(node, "Pnumber");
  if (!pnumber) return "";
  return collapseWhitespace(deepText(childrenOf(pnumber), SKIP_TAGS));
}

function render(nodes: ClmlNode[], lb: LineBuilder, indent: number): void {
  for (const node of nodes) {
    if (isTextNode(node)) {
      lb.append(textOf(node), indent);
      continue;
    }

    const tag = tagOf(node);
    if (!tag || SKIP_TAGS.has(tag)) continue;

    const kids = childrenOf(node);

    if (tag === "Pnumber") continue; // consumed by the parent's marker

    if (INLINE_TAGS.has(tag)) {
      render(kids, lb, indent);
      continue;
    }

    if (tag in NUMBERED_LEVELS) {
      const level = indent + NUMBERED_LEVELS[tag];
      const marker = markerOf(node);
      lb.startLine(level, marker ? `(${marker}) ` : "");
      render(
        kids.filter((child) => tagOf(child) !== "Pnumber"),
        lb,
        level
      );
      lb.flush();
      continue;
    }

    if (PARA_CONTAINERS.has(tag)) {
      render(kids, lb, indent);
      continue;
    }

    if (BLOCK_TAGS.has(tag)) {
      render(kids, lb, indent);
      lb.flush();
      continue;
    }

    if (tag === "ListItem" || tag === "tr") {
      lb.flush();
      render(kids, lb, indent);
      lb.flush();
      continue;
    }

    if (tag === "td") {
      render(kids, lb, indent);
      lb.append(" ", indent);
      continue;
    }

    // Unknown / structural tag: recurse so nothing is ever dropped.
    render(kids, lb, indent);
  }
}

/**
 * Renders a provision node (a <P1group> or bare <P1>) to structured text.
 * The provision's own <Title> is excluded — it is stored as `heading`.
 */
export function renderProvision(node: ClmlNode): string {
  const lb = new LineBuilder();
  const tag = tagOf(node);
  const kids = childrenOf(node).filter((child) => {
    const childTag = tagOf(child);
    // Drop only the provision's own heading, not nested ones.
    if (childTag === "Title" || childTag === "TitleBlock") return false;
    // A bare P1's own Pnumber is the section number, already stored separately.
    if (tag === "P1" && childTag === "Pnumber") return false;
    return true;
  });

  for (const child of kids) {
    if (tagOf(child) === "P1") {
      // Skip the P1's own Pnumber too when descending from a P1group.
      const inner = childrenOf(child).filter((c) => tagOf(c) !== "Pnumber");
      render(inner, lb, 0);
      continue;
    }
    render([child], lb, 0);
  }

  return lb.result();
}

/**
 * Extracts provision text from an XML fragment containing a <P1group> or <P1>.
 * Kept as a string API so it can be called directly in tests.
 */
export function extractProvisionText(fragment: string): string {
  const tree = parseXml(fragment);
  const provision = findFirst(tree, (tag) => tag === "P1group" || tag === "P1");
  if (!provision) return "";
  return renderProvision(provision);
}

function findFirst(nodes: ClmlNode[], match: (tag: string) => boolean): ClmlNode | null {
  for (const node of nodes) {
    const tag = tagOf(node);
    if (tag && match(tag)) return node;
    const found = findFirst(childrenOf(node), match);
    if (found) return found;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Instrument metadata
// ---------------------------------------------------------------------------

export function parseInstrumentMeta(xml: string): InstrumentMeta {
  const documentMainType = xml.match(/<ukm:DocumentMainType\s+Value="([^"]*)"/)?.[1] ?? null;

  let type: "act" | "si" | null = null;
  if (documentMainType) {
    if (/StatutoryInstrument|StatutoryRule/i.test(documentMainType)) type = "si";
    else if (/Act/i.test(documentMainType)) type = "act";
  }

  return {
    title: xml.match(/<dc:title>([^<]*)<\/dc:title>/)?.[1]?.trim() || null,
    documentMainType,
    type,
    upToDateTo: xml.match(/<dct:valid>([^<]*)<\/dct:valid>/)?.[1]?.trim() || null,
  };
}

// ---------------------------------------------------------------------------
// Unapplied effects
// ---------------------------------------------------------------------------

export function parseUnappliedEffects(xml: string): UnappliedEffect[] {
  const effects: UnappliedEffect[] = [];
  const tree = parseXml(xml);

  walk(tree, (node, tag) => {
    if (tag !== "ukm:UnappliedEffect") return;
    const attrs = attrsOf(node);
    const kids = childrenOf(node);

    const affectedBlock = kids.find((child) => tagOf(child) === "ukm:AffectedProvisions");
    const affectedFoundRefs: string[] = [];
    if (affectedBlock) {
      walk(childrenOf(affectedBlock), (secNode, secTag) => {
        if (secTag !== "ukm:Section") return;
        const secAttrs = attrsOf(secNode);
        // FoundRef is the parent provision (e.g. "section-8" for an effect on
        // s. 8(3)); Ref is the precise target. Either rolls up correctly.
        const ref = secAttrs.FoundRef || secAttrs.Ref;
        if (ref) affectedFoundRefs.push(ref);
      });
    }

    const affectingTitleNode = kids.find((child) => tagOf(child) === "ukm:AffectingTitle");

    effects.push({
      requiresApplied: attrs.RequiresApplied === "true",
      type: attrs.Type ?? null,
      affectedProvisionsLabel: attrs.AffectedProvisions ?? null,
      affectedFoundRefs,
      affectingTitle: affectingTitleNode
        ? collapseWhitespace(deepText(childrenOf(affectingTitleNode))) || null
        : null,
      affectingUri: attrs.AffectingURI ?? null,
    });
  });

  return effects;
}

/**
 * Does this effect target the given provision (by CLML id)?
 *
 * Roll-up matters: a pending change to s. 8(3) MUST flag s. 8. An effect ref of
 * "section-8-3" rolls up to "section-8", while "section-8A" must NOT — hence
 * requiring the next character to be "-" or end-of-string.
 */
export function effectAffectsProvision(effect: UnappliedEffect, provisionId: string): boolean {
  for (const ref of effect.affectedFoundRefs) {
    if (ref === provisionId) return true;
    if (ref.startsWith(`${provisionId}-`)) return true;
  }
  return labelRefersToProvision(effect.affectedProvisionsLabel, provisionId);
}

/**
 * Display-string fallback for when structured refs are absent. Deliberately
 * strict: "s. 25B(2)(c)" must not match section 25, and "s. 104(3AZA)" must not
 * match section 1.
 */
function labelRefersToProvision(label: string | null, provisionId: string): boolean {
  if (!label) return false;

  const sectionMatch = provisionId.match(/^section-(\w+)$/i);
  const scheduleParaMatch = provisionId.match(/^schedule-(\w+)-paragraph-(\w+)$/i);

  if (sectionMatch) {
    if (/^Sch\b/i.test(label)) return false; // a schedule, not a section
    const target = sectionMatch[1].toLowerCase();
    const body = label.replace(/^ss?\.\s*/i, "");
    for (const token of body.split(/[,;]|\s+and\s+|\s+/)) {
      const m = token.trim().match(/^(\d+[A-Z]*)/i);
      if (m && m[1].toLowerCase() === target) return true;
    }
    return false;
  }

  if (scheduleParaMatch) {
    if (!/^Sch\b/i.test(label)) return false;
    const [, sched, para] = scheduleParaMatch;
    const schedOk = new RegExp(`^Sch\\.\\s*${sched}\\b`, "i").test(label);
    const paraOk = new RegExp(`\\bpara\\.\\s*${para}\\b`, "i").test(label);
    return schedOk && paraOk;
  }

  return false;
}

/** Back-compatible wrapper: match by section number rather than provision id. */
export function effectAffectsSection(effect: UnappliedEffect, sectionNumber: string): boolean {
  return effectAffectsProvision(effect, `section-${sectionNumber}`);
}

export function buildAmendmentNote(matched: UnappliedEffect[], provisionLabel: string): string {
  if (!matched.length) return "No outstanding effects.";

  const parts = matched.map((e) => {
    const what = e.type || "change";
    const where = e.affectedProvisionsLabel || provisionLabel;
    const by = e.affectingTitle || e.affectingUri?.split("/id/")[1] || "an unidentified instrument";
    return `${what} in ${where} by ${by}`;
  });

  const count = matched.length;
  return `${count} change${count === 1 ? "" : "s"} not yet applied to ${provisionLabel}: ${parts.join("; ")}.`;
}

// ---------------------------------------------------------------------------
// Whole-instrument enumeration
// ---------------------------------------------------------------------------

type EnumContext = {
  scheduleLabel?: string;
  scheduleTitle?: string;
  partLabel?: string;
  groupTitle?: string;
  versionDate?: string;
  status?: string;
};

function titleTextOf(node: ClmlNode): string | null {
  const title = childByTag(node, "Title");
  if (title) return collapseWhitespace(deepText(childrenOf(title), SKIP_TAGS)) || null;
  const titleBlock = childByTag(node, "TitleBlock");
  if (titleBlock) {
    const inner = childByTag(titleBlock, "Title");
    if (inner) return collapseWhitespace(deepText(childrenOf(inner), SKIP_TAGS)) || null;
  }
  return null;
}

function numberTextOf(node: ClmlNode): string | null {
  const number = childByTag(node, "Number");
  if (!number) return null;
  return collapseWhitespace(deepText(childrenOf(number), SKIP_TAGS)) || null;
}

function composeHeading(ctx: EnumContext, isSchedule: boolean): string | null {
  if (!isSchedule) return ctx.groupTitle ?? null;

  const bits: string[] = [];
  if (ctx.scheduleLabel) {
    bits.push(ctx.scheduleTitle ? `${ctx.scheduleLabel} (${ctx.scheduleTitle})` : ctx.scheduleLabel);
  }
  if (ctx.partLabel) bits.push(ctx.partLabel);
  const prefix = bits.join(", ");
  if (prefix && ctx.groupTitle) return `${prefix} — ${ctx.groupTitle}`;
  return prefix || ctx.groupTitle || null;
}

/**
 * Enumerates every provision in a whole-instrument document: sections and
 * schedule paragraphs alike, in document order.
 */
export function enumerateProvisions(xml: string, legGovRef: string): EnumeratedProvision[] {
  const tree = parseXml(xml);
  const provisions: EnumeratedProvision[] = [];
  const prefix = `/${legGovRef}/`;

  const visit = (nodes: ClmlNode[], ctx: EnumContext): void => {
    for (const node of nodes) {
      const tag = tagOf(node);
      if (!tag) continue;

      const attrs = attrsOf(node);
      const next: EnumContext = { ...ctx };
      if (attrs.RestrictStartDate) next.versionDate = attrs.RestrictStartDate;
      if (attrs.Status) next.status = attrs.Status;

      if (tag === "Schedule") {
        next.scheduleLabel = numberTextOf(node) ?? next.scheduleLabel;
        next.scheduleTitle = titleTextOf(node) ?? undefined;
        next.partLabel = undefined;
        next.groupTitle = undefined;
      } else if (tag === "Part" || tag === "Chapter") {
        const label = numberTextOf(node);
        const title = titleTextOf(node);
        next.partLabel = label && title ? `${label} (${title})` : label ?? title ?? next.partLabel;
      } else if (tag === "P1group" || tag === "Pblock") {
        const title = titleTextOf(node);
        if (title) next.groupTitle = title;
      }

      if (tag === "P1") {
        const documentUri = attrs.DocumentURI ?? "";
        const at = documentUri.indexOf(prefix);
        if (at !== -1) {
          const ref = documentUri.slice(at + prefix.length);
          const id = attrs.id ?? ref.replace(/\//g, "-");
          const status = next.status ?? null;
          const isSchedule = ref.startsWith("schedule");
          const content = renderProvision(node);
          const contentOmitted = content.trim().length === 0;

          provisions.push({
            ref,
            id,
            number: markerOf(node) || null,
            heading: composeHeading(next, isSchedule),
            content,
            versionDate: next.versionDate ?? null,
            status,
            contentOmitted,
            inForce: deriveInForce(status, contentOmitted),
            position: provisions.length + 1,
          });
          // Do not descend further: nested P1s do not occur inside a provision.
          continue;
        }
      }

      visit(childrenOf(node), next);
    }
  };

  visit(tree, {});
  return provisions;
}

/**
 * A provision is in force unless legislation.gov.uk marks it otherwise, or the
 * source carries no operative text at all.
 *
 * The empty-text case matters: some repealed provisions carry NO Status
 * attribute — legislation.gov.uk shows a dotted heading with an empty <Text/>
 * and states the repeal only in the annotation block (verified against the live
 * page for Children Act 1989 s.54). Treating those as in force is the dangerous
 * direction for a legal tool, so empty text means not in force. This reads a
 * fact off the document; it does not compute amendments.
 */
export function deriveInForce(status: string | null, contentOmitted: boolean): boolean {
  if (status === "Prospective" || status === "Repealed") return false;
  return !contentOmitted;
}

/** Human label for a provision, used in amendment notes. */
export function provisionLabel(ref: string): string {
  const section = ref.match(/^section\/(.+)$/);
  if (section) return `s. ${section[1].replace(/\//g, "(")}`;
  const schedulePara = ref.match(/^schedule\/([^/]+)\/paragraph\/(.+)$/);
  if (schedulePara) return `Sch. ${schedulePara[1]} para. ${schedulePara[2]}`;
  return ref;
}

// ---------------------------------------------------------------------------
// Single-provision parse (kept for the per-provision path and its tests)
// ---------------------------------------------------------------------------

export function parseProvision(xml: string, sectionNumber: string): ProvisionParse {
  const tree = parseXml(xml);
  const provision = findFirst(tree, (tag) => tag === "P1group" || tag === "P1");
  if (!provision) throw new Error(`No <P1group> found for section ${sectionNumber}`);

  const attrs = attrsOf(provision);
  const inner = childByTag(provision, "P1");
  const number = markerOf(inner ?? provision) || sectionNumber;
  const status = attrs.Status ?? attrsOf(inner ?? provision).Status ?? null;

  const allEffects = parseUnappliedEffects(xml);
  const matched = allEffects.filter(
    (effect) => effect.requiresApplied && effectAffectsSection(effect, number)
  );

  const content = renderProvision(provision);
  const contentOmitted = content.trim().length === 0;

  return {
    number,
    heading: titleTextOf(provision),
    content,
    versionDate: attrs.RestrictStartDate ?? null,
    status,
    contentOmitted,
    inForce: deriveInForce(status, contentOmitted),
    hasUnappliedAmendments: matched.length > 0,
    amendmentNote: buildAmendmentNote(matched, `s. ${number}`),
    matchedEffects: matched,
  };
}
