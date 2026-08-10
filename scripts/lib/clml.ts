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
  /**
   * Territorial extent captured verbatim from RestrictExtent, e.g. "E+W",
   * "E+W+S+N.I.", "S", "N.I.". Hierarchical: most provisions inherit it from
   * an ancestor rather than carrying it themselves.
   */
  extent: string | null;
  /**
   * Observed: the source carried no operative text — either an empty <Text/>
   * or nothing but legislation.gov.uk's repeal dot-notation (". . . .").
   */
  contentOmitted: boolean;
  inForce: boolean;
  position: number;
  /**
   * The enclosing Part or Chapter, e.g. "PART 27 (THE SMALL CLAIMS TRACK)".
   *
   * Already folded into `heading` for schedule paragraphs, where it is what
   * makes "paragraph 1" identifiable. Carried separately here because body
   * provisions need it too, for a different reason: in a procedure rule it is
   * the only statement of subject matter anywhere in the provision. Null where
   * the provision sits directly under the body with no Part above it.
   */
  partLabel: string | null;
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

/**
 * Dropped entirely — editorial annotation markers, not statutory text.
 *
 * FootnoteRef is CommentaryRef's twin in the procedure rules: `<FootnoteRef
 * Ref="f00002"/>` marks the footnote citing the enabling Act. Every one of the
 * 58 in the CPR is self-closing, so dropping them changes nothing today; the
 * point is that a variant carrying text could not leak a bare marker into the
 * middle of a sentence.
 */
const SKIP_TAGS: ReadonlySet<string> = new Set(["CommentaryRef", "FootnoteRef"]);

/** Unwrapped in place: their text joins the surrounding line. */
const INLINE_TAGS: ReadonlySet<string> = new Set([
  "Addition", "Substitution", "Repeal", "Term", "InlineAmendment", "Acronym",
  "Character", "Citation", "CitationSubRef", "Abbreviation", "AppendText",
  "Emphasis", "Strong", "Superscript", "Subscript", "Expanded", "Foreign",
  "InternalLink", "ExternalLink", "Span", "Inline", "Definition",
  "Uppercase", "SmallCaps", "Proviso",
  // Superscript run. In the procedure rules this is the glossary marker —
  // FPR r.2.2 says glossary words are followed by "GL", and that "GL" lives in
  // a <Superior>. It is operative text, so it is unwrapped, not dropped.
  "Superior",
]);

/** Numbered levels: each starts a new line with its own marker and indent. */
const NUMBERED_LEVELS: Readonly<Record<string, number>> = {
  P2: 0, P3: 1, P4: 2, P5: 3, P6: 4, P7: 5,
};

/** Transparent containers — recurse without starting a line. */
const PARA_CONTAINERS: ReadonlySet<string> = new Set([
  "P1para", "P2para", "P3para", "P4para", "P5para", "P6para", "P7para",
]);

/**
 * Emit their content then end the line. `Formula` is here so a displayed
 * formula does not run into the "where—" clause that follows it.
 */
const BLOCK_TAGS: ReadonlySet<string> = new Set([
  "Text", "Para", "BlockText", "P", "Formula",
]);

/**
 * CLML documents vary in whether elements carry a namespace prefix: the same
 * construct appears as `Text` in one instrument and `leg:Text` in another, and
 * tables as `td` or `xhtml:td`. Classify on the local name so behaviour does
 * not depend on which prefix a given document happens to use.
 */
export function localName(tag: string): string {
  const colon = tag.indexOf(":");
  return colon === -1 ? tag : tag.slice(colon + 1);
}

/** Local name of a node's element, or null for text nodes. */
function localOf(node: ClmlNode): string | null {
  const tag = tagOf(node);
  return tag === null ? null : localName(tag);
}

/** First child whose local name matches, ignoring any namespace prefix. */
function childByLocal(node: ClmlNode, local: string): ClmlNode | null {
  return childrenOf(node).find((child) => localOf(child) === local) ?? null;
}

/**
 * Tags we knowingly recurse through without special handling. Listing them
 * explicitly means the diagnostics collector only reports genuinely novel
 * constructs — the ones worth a human look when a new instrument is added.
 */
const STRUCTURAL_TAGS: ReadonlySet<string> = new Set([
  "P1group", "P1", "P2group", "P3group", "Pnumber", "Title", "TitleBlock", "Number",
  "Body", "Group", "Part", "Chapter", "Pblock", "PsubBlock",
  "Schedules", "Schedule", "ScheduleBody",
  "OrderedList", "UnorderedList", "ListItem",
  "Tabular", "table", "tbody", "thead", "tr", "td", "th", "colgroup", "col", "caption",
  "BlockAmendment", "Version", "Reference",
  // Formulae. MathML is rendered as inline text; see renderMath note below.
  "Formula", "Where", "math", "mrow", "mi", "mo", "mn", "mtext", "mstyle",
  "mfrac", "msup", "msub", "msqrt", "mfenced",
]);

const INDENT = "    ";

/**
 * Separates table cells.
 *
 * A table read as running prose is worse than useless in a legal answer: FPR
 * r.12.3 is a three-column table of proceedings, applicants and respondents,
 * and without a delimiter its header rendered "Proceedings forApplicantsRespondents"
 * — the <th> cells carried no separator at all. A pipe is unambiguous, survives
 * whitespace collapsing, and marks a column boundary the model can read.
 */
const CELL_SEPARATOR = " | ";

/**
 * Records constructs the parser did not recognise, so scaling to a new
 * instrument surfaces unfamiliar markup rather than silently recursing.
 */
export type ParseDiagnostics = { unknownTags: Map<string, number> };

export function createDiagnostics(): ParseDiagnostics {
  return { unknownTags: new Map() };
}

function isKnownTag(tag: string): boolean {
  const local = localName(tag);
  return (
    SKIP_TAGS.has(local) ||
    INLINE_TAGS.has(local) ||
    local in NUMBERED_LEVELS ||
    PARA_CONTAINERS.has(local) ||
    BLOCK_TAGS.has(local) ||
    STRUCTURAL_TAGS.has(local)
  );
}

function noteUnknown(tag: string, diagnostics?: ParseDiagnostics): void {
  if (!diagnostics || isKnownTag(tag)) return;
  diagnostics.unknownTags.set(tag, (diagnostics.unknownTags.get(tag) ?? 0) + 1);
}

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
  /**
   * A separator waiting for something to separate. Held rather than written so
   * it can never trail off the end of a row: an empty last cell would otherwise
   * leave "Equality Act 2010 (c. 15) |". It survives a flush on purpose, so a
   * cell whose text began on its own line still opens with the delimiter.
   */
  private pending: string | null = null;

  startLine(indent: number, prefix: string) {
    this.flush();
    this.indent = indent;
    this.open = true;
    this.takePending();
    if (prefix) this.parts.push(prefix);
  }

  append(text: string, indent: number) {
    if (!text) return;
    if (!this.open) {
      this.indent = indent;
      this.open = true;
    }
    this.takePending();
    this.parts.push(text);
  }

  /** Queue a separator, to be written only if content follows it. */
  separate(separator: string) {
    this.pending = separator;
  }

  /** Discard an unwritten separator, so it cannot leak into the next row. */
  clearPending() {
    this.pending = null;
  }

  private takePending() {
    if (this.pending === null) return;
    this.parts.push(this.pending);
    this.pending = null;
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

/**
 * Reassembles a provision number that CLML has split across the <Pnumber> text
 * and its PuncAfter attribute.
 *
 * The Family Procedure Rules encode rule 1.1 as
 *   <Pnumber PuncAfter=".1.">1</Pnumber>
 * so reading the text alone yields "1" — wrong for 626 of the FPR's 852 rules,
 * and inconsistently, since the remaining 226 carry the whole number in the
 * text.
 *
 * PuncAfter is only appended when it CONTAINS A DIGIT, because it is not always
 * a continuation of the number. CPR schedule/5/paragraph/10 carries
 * PuncBefore="(" PuncAfter=")" — it renders as "(10)" — and appending blindly
 * produces "10)". That single case is why this is a digit test rather than a
 * simple concatenation.
 *
 * Effect measured across both instruments: FPR 626 numbers corrected, 852/852
 * now match their own DocumentURI. The CPR cannot be affected at all — not one
 * of its 2,205 PuncAfter values contains a digit.
 */
export function joinPnumber(text: string, puncAfter?: string | null): string {
  const base = collapseWhitespace(text ?? "");
  if (!puncAfter || !/[0-9]/.test(puncAfter)) return base;
  return collapseWhitespace(base + puncAfter).replace(/[.\s]+$/, "");
}

/**
 * The marker text of a node's own <Pnumber>, e.g. "2A" or "a".
 *
 * Deliberately does NOT apply joinPnumber. render() wraps this in brackets to
 * produce "(2A)", and some subsections carry the entire marker in PuncAfter
 * (text empty, PuncAfter="(1)"), which joining would turn into "((1))".
 * Six Acts were corrupted this way before the split — see provisionNumberOf.
 */
function markerOf(node: ClmlNode): string {
  const pnumber = childByLocal(node, "Pnumber");
  if (!pnumber) return "";
  return collapseWhitespace(deepText(childrenOf(pnumber), SKIP_TAGS));
}

/**
 * The provision's own citable number — "8", "16A", or the FPR's "1.1".
 *
 * Only this reassembles a split PuncAfter number. Confining the join here keeps
 * it out of rendered text entirely: it changes the `number` field and nothing
 * a user reads, so existing embeddings stay valid.
 */
function provisionNumberOf(node: ClmlNode): string {
  const pnumber = childByLocal(node, "Pnumber");
  if (!pnumber) return "";
  const text = collapseWhitespace(deepText(childrenOf(pnumber), SKIP_TAGS));
  return joinPnumber(text, attrsOf(pnumber).PuncAfter);
}

function render(
  nodes: ClmlNode[],
  lb: LineBuilder,
  indent: number,
  diagnostics?: ParseDiagnostics
): void {
  for (const node of nodes) {
    if (isTextNode(node)) {
      lb.append(textOf(node), indent);
      continue;
    }

    const rawTag = tagOf(node);
    if (!rawTag) continue;
    const tag = localName(rawTag);
    if (SKIP_TAGS.has(tag)) continue;

    const kids = childrenOf(node);

    if (tag === "Pnumber") continue; // consumed by the parent's marker

    // MathML fractions must not collapse: R over D is "R/D", not "RD".
    if (tag === "mfrac") {
      const parts = kids.filter((child) => tagOf(child) !== null);
      if (parts.length >= 2) {
        render([parts[0]], lb, indent, diagnostics);
        lb.append("/", indent);
        render(parts.slice(1), lb, indent, diagnostics);
        continue;
      }
    }

    if (INLINE_TAGS.has(tag)) {
      render(kids, lb, indent, diagnostics);
      continue;
    }

    if (tag in NUMBERED_LEVELS) {
      const level = indent + NUMBERED_LEVELS[tag];
      const marker = markerOf(node);
      lb.startLine(level, marker ? `(${marker}) ` : "");
      render(
        kids.filter((child) => localOf(child) !== "Pnumber"),
        lb,
        level,
        diagnostics
      );
      lb.flush();
      continue;
    }

    if (PARA_CONTAINERS.has(tag)) {
      render(kids, lb, indent, diagnostics);
      continue;
    }

    if (BLOCK_TAGS.has(tag)) {
      render(kids, lb, indent, diagnostics);
      lb.flush();
      continue;
    }

    // A table row owns the separation between its own cells, so the delimiter
    // can be placed BETWEEN them and never trail off the end of the row.
    if (tag === "tr") {
      lb.flush();
      lb.clearPending();
      let seenCell = false;
      for (const kid of kids) {
        const kidTag = localOf(kid);
        if (kidTag === "td" || kidTag === "th") {
          if (seenCell) lb.separate(CELL_SEPARATOR);
          seenCell = true;
          render(childrenOf(kid), lb, indent, diagnostics);
          continue;
        }
        render([kid], lb, indent, diagnostics);
      }
      lb.flush();
      lb.clearPending();
      continue;
    }

    // `Where` sits inside `Formula` and explains its terms, so it must start
    // a new line rather than running on from the formula itself.
    if (tag === "ListItem" || tag === "Where") {
      lb.flush();
      render(kids, lb, indent, diagnostics);
      lb.flush();
      continue;
    }

    // A cell reached outside a <tr> — malformed, but never drop its text.
    if (tag === "td" || tag === "th") {
      render(kids, lb, indent, diagnostics);
      continue;
    }

    // Unrecognised tag: recurse so nothing is ever dropped, but record it.
    noteUnknown(rawTag, diagnostics);
    render(kids, lb, indent, diagnostics);
  }
}

/**
 * Renders a provision node (a <P1group> or bare <P1>) to structured text.
 * The provision's own <Title> is excluded — it is stored as `heading`.
 */
export function renderProvision(node: ClmlNode, diagnostics?: ParseDiagnostics): string {
  const lb = new LineBuilder();
  const tag = localOf(node);
  const kids = childrenOf(node).filter((child) => {
    const childTag = localOf(child);
    // Drop only the provision's own heading, not nested ones.
    if (childTag === "Title" || childTag === "TitleBlock") return false;
    // A bare P1's own Pnumber is the section number, already stored separately.
    if (tag === "P1" && childTag === "Pnumber") return false;
    return true;
  });

  for (const child of kids) {
    if (localOf(child) === "P1") {
      // Skip the P1's own Pnumber too when descending from a P1group.
      const inner = childrenOf(child).filter((c) => localOf(c) !== "Pnumber");
      render(inner, lb, 0, diagnostics);
      continue;
    }
    render([child], lb, 0, diagnostics);
  }

  return lb.result();
}

/**
 * Extracts provision text from an XML fragment containing a <P1group> or <P1>.
 * Kept as a string API so it can be called directly in tests.
 */
export function extractProvisionText(fragment: string): string {
  const tree = parseXml(fragment);
  const provision = findFirst(tree, (tag) => localName(tag) === "P1group" || localName(tag) === "P1");
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
  extent?: string;
};

function titleTextOf(node: ClmlNode): string | null {
  const title = childByLocal(node, "Title");
  if (title) return collapseWhitespace(deepText(childrenOf(title), SKIP_TAGS)) || null;
  const titleBlock = childByLocal(node, "TitleBlock");
  if (titleBlock) {
    const inner = childByLocal(titleBlock, "Title");
    if (inner) return collapseWhitespace(deepText(childrenOf(inner), SKIP_TAGS)) || null;
  }
  return null;
}

function numberTextOf(node: ClmlNode): string | null {
  const number = childByLocal(node, "Number");
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
export function enumerateProvisions(
  xml: string,
  legGovRef: string,
  diagnostics?: ParseDiagnostics
): EnumeratedProvision[] {
  const tree = parseXml(xml);
  const provisions: EnumeratedProvision[] = [];
  const prefix = `/${legGovRef}/`;

  const visit = (nodes: ClmlNode[], ctx: EnumContext): void => {
    for (const node of nodes) {
      const rawTag = tagOf(node);
      if (!rawTag) continue;
      const tag = localName(rawTag);

      const attrs = attrsOf(node);
      const next: EnumContext = { ...ctx };
      if (attrs.RestrictStartDate) next.versionDate = attrs.RestrictStartDate;
      if (attrs.Status) next.status = attrs.Status;
      // Extent is hierarchical in the same way: the root always carries one and
      // most provisions inherit rather than declaring their own.
      if (attrs.RestrictExtent) next.extent = attrs.RestrictExtent;

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
          const content = renderProvision(node, diagnostics);
          const contentOmitted = isContentOmitted(content);

          provisions.push({
            ref,
            id,
            number: provisionNumberOf(node) || null,
            heading: composeHeading(next, isSchedule),
            content,
            versionDate: next.versionDate ?? null,
            status,
            extent: next.extent ?? null,
            contentOmitted,
            inForce: deriveInForce(status, contentOmitted),
            position: provisions.length + 1,
            partLabel: next.partLabel ?? null,
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
 * legislation.gov.uk renders a repealed or wholly-omitted provision as a run of
 * dots rather than as empty text — ". . . . . . . ." — with no Status attribute
 * and no empty element to detect. 753 of the 7,284 provisions in the corpus are
 * in this state, and 564 of them were reading as in force.
 *
 * Deliberately strict: the whole content, once trimmed, must consist of nothing
 * but dot-notation characters and whitespace. A single letter or digit anywhere
 * disqualifies it, so a short but genuine provision is never caught. Where the
 * source is ambiguous we keep the provision — hiding real law is the worse
 * error, exactly as with the extent filter.
 *
 * This observes the document; it does not infer a legal conclusion. As with
 * empty content, no Status is fabricated — see deriveInForce.
 */
const REPEAL_DOT_NOTATION = /^[.…·•\s]+$/;

export function isContentOmitted(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return true;
  return REPEAL_DOT_NOTATION.test(trimmed);
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

/**
 * Subdivisions of a provision number: "8/3/a" is cited "8(3)(a)".
 * The head is the number itself; every further segment is a bracketed level.
 */
function subdivide(number: string): string {
  const [head, ...levels] = number.split("/");
  return head + levels.map((level) => `(${level})`).join("");
}

/**
 * Human label for a provision, used in amendment notes and mirrored in SQL by
 * public.provision_citation_label (supabase/trackb6_citation_labels.sql). Keep
 * the two in step — they are read by the model and by the user respectively.
 *
 * An unrecognised shape returns the raw ref rather than a guess. Human Rights
 * Act 1998 Sch 1 nests part and chapter above the paragraph, and collapsing
 * that to "Sch. 1 para. 1" would give two different Articles the same citation.
 */
export function provisionLabel(ref: string): string {
  const section = ref.match(/^section\/(.+)$/);
  if (section) return `s. ${subdivide(section[1])}`;

  // Procedure rules cite as "r. 12.3", never "s. 12.3".
  const rule = ref.match(/^rule\/(.+)$/);
  if (rule) return `r. ${subdivide(rule[1])}`;

  const partPara = ref.match(/^part\/([^/]+)\/paragraph\/(.+)$/);
  if (partPara) return `Part ${partPara[1]}, para. ${partPara[2]}`;

  const part = ref.match(/^part\/([^/]+)$/);
  if (part) return `Part ${part[1]}`;

  const schedulePara = ref.match(/^schedule\/([^/]+)\/paragraph\/(.+)$/);
  if (schedulePara) return `Sch. ${schedulePara[1]} para. ${schedulePara[2]}`;

  const schedule = ref.match(/^schedule\/([^/]+)$/);
  if (schedule) return `Sch. ${schedule[1]}`;

  return ref;
}

// ---------------------------------------------------------------------------
// Single-provision parse (kept for the per-provision path and its tests)
// ---------------------------------------------------------------------------

export function parseProvision(xml: string, sectionNumber: string): ProvisionParse {
  const tree = parseXml(xml);
  const provision = findFirst(tree, (tag) => localName(tag) === "P1group" || localName(tag) === "P1");
  if (!provision) throw new Error(`No <P1group> found for section ${sectionNumber}`);

  const attrs = attrsOf(provision);
  const inner = childByLocal(provision, "P1");
  const number = provisionNumberOf(inner ?? provision) || sectionNumber;
  const status = attrs.Status ?? attrsOf(inner ?? provision).Status ?? null;

  const allEffects = parseUnappliedEffects(xml);
  const matched = allEffects.filter(
    (effect) => effect.requiresApplied && effectAffectsSection(effect, number)
  );

  const content = renderProvision(provision);
  const contentOmitted = isContentOmitted(content);

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
