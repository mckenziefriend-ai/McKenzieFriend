/**
 * Pure parsers for legislation.gov.uk CLML (`data.xml`).
 *
 * No network, no database — everything here is a pure function over an XML
 * string so it can be unit-tested against saved fixtures.
 *
 * Guiding principle: CAPTURE, DON'T COMPUTE. We record the currency signals
 * legislation.gov.uk publishes. We never try to apply amendments ourselves to
 * derive "current" text — getting that subtly wrong is worse than not doing it.
 */

export type UnappliedEffect = {
  requiresApplied: boolean;
  type: string | null;
  affectedProvisionsLabel: string | null;
  /** Structured section refs from <ukm:AffectedProvisions>, e.g. ["section-8"]. */
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

export type ProvisionParse = {
  number: string | null;
  heading: string | null;
  content: string;
  versionDate: string | null;
  inForce: boolean;
  hasUnappliedAmendments: boolean;
  amendmentNote: string;
  matchedEffects: UnappliedEffect[];
};

// ---------------------------------------------------------------------------
// Small XML helpers (regex-based; CLML here is machine-generated and regular)
// ---------------------------------------------------------------------------

function attrsOf(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([\w:.-]+)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

function firstTagText(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? stripTags(m[1]).trim() || null : null;
}

export function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function stripTags(fragment: string): string {
  return fragment.replace(/<[^>]+>/g, "");
}

/** Extracts the <P1group>…</P1group> block for the requested provision. */
export function extractProvisionBlock(xml: string): string | null {
  const start = xml.indexOf("<P1group");
  if (start === -1) return null;
  const end = xml.indexOf("</P1group>", start);
  if (end === -1) return null;
  return xml.slice(start, end + "</P1group>".length);
}

// ---------------------------------------------------------------------------
// Instrument-level metadata
// ---------------------------------------------------------------------------

export function parseInstrumentMeta(xml: string): InstrumentMeta {
  const documentMainType =
    xml.match(/<ukm:DocumentMainType\s+Value="([^"]*)"/)?.[1] ?? null;

  let type: "act" | "si" | null = null;
  if (documentMainType) {
    // e.g. UnitedKingdomPublicGeneralAct -> act; UnitedKingdomStatutoryInstrument -> si
    if (/StatutoryInstrument|StatutoryRule|Order|Regulation/i.test(documentMainType)) type = "si";
    else if (/Act/i.test(documentMainType)) type = "act";
  }

  return {
    title: firstTagText(xml, "dc:title"),
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

  // Match both self-closing and container forms.
  const re = /<ukm:UnappliedEffect\s([^>]*?)(\/)?>([\s\S]*?)(?:<\/ukm:UnappliedEffect>|(?=<ukm:UnappliedEffect|<\/ukm:UnappliedEffects>))/g;

  for (const m of xml.matchAll(re)) {
    const attrs = attrsOf("<x " + m[1] + ">");
    const inner = m[3] ?? "";

    const affectedBlock = inner.match(
      /<ukm:AffectedProvisions>([\s\S]*?)<\/ukm:AffectedProvisions>/
    )?.[1] ?? "";

    const affectedFoundRefs: string[] = [];
    for (const sec of affectedBlock.matchAll(/<ukm:Section\s([^>]*)>/g)) {
      const secAttrs = attrsOf("<x " + sec[1] + ">");
      // FoundRef is the parent section (e.g. "section-8" for an effect on s. 8(3)).
      // Ref is the precise target (e.g. "section-8-3"). Prefer FoundRef, fall back
      // to Ref so subsection-only effects still roll up to their parent section.
      const ref = secAttrs.FoundRef || secAttrs.Ref;
      if (ref) affectedFoundRefs.push(ref);
    }

    effects.push({
      requiresApplied: attrs.RequiresApplied === "true",
      type: attrs.Type ?? null,
      affectedProvisionsLabel: attrs.AffectedProvisions ?? null,
      affectedFoundRefs,
      affectingTitle:
        inner.match(/<ukm:AffectingTitle>([\s\S]*?)<\/ukm:AffectingTitle>/)?.[1]?.trim() ?? null,
      affectingUri: attrs.AffectingURI ?? null,
    });
  }

  return effects;
}

/**
 * Does this effect target the given section?
 *
 * Roll-up matters: a pending change to s. 8(3) MUST flag s. 8. CLML gives us
 * `FoundRef="section-8"` on the nested <ukm:Section> for exactly that reason,
 * and `Ref="section-8-3"` is normalised down to its parent section here.
 *
 * The display-string fallback is deliberately strict so that "s. 25B(2)(c)"
 * does NOT match section 25, and "s. 104(3AZA)" does NOT match section 1.
 */
export function effectAffectsSection(effect: UnappliedEffect, sectionNumber: string): boolean {
  for (const ref of effect.affectedFoundRefs) {
    // "section-8" or "section-8-3" -> parent section "8"
    const m = ref.match(/^section-(\d+[A-Z]*)(?:-|$)/i);
    if (m && m[1].toLowerCase() === sectionNumber.toLowerCase()) return true;
  }

  const label = effect.affectedProvisionsLabel;
  if (!label) return false;
  if (/^Sch\b/i.test(label)) return false; // schedule, not a section

  const body = label.replace(/^ss?\.\s*/i, "");
  for (const token of body.split(/[,;]|\s+and\s+|\s+/)) {
    const t = token.trim();
    if (!t) continue;
    // Leading number plus any suffix letters: "8(3)" -> 8, "25B(2)" -> 25B
    const m = t.match(/^(\d+[A-Z]*)/i);
    if (m && m[1].toLowerCase() === sectionNumber.toLowerCase()) return true;
  }
  return false;
}

export function buildAmendmentNote(
  matched: UnappliedEffect[],
  sectionNumber: string
): string {
  if (!matched.length) return "No outstanding effects.";

  const parts = matched.map((e) => {
    const what = e.type || "change";
    const where = e.affectedProvisionsLabel || `s. ${sectionNumber}`;
    const by = e.affectingTitle || e.affectingUri?.split("/id/")[1] || "an unidentified instrument";
    return `${what} in ${where} by ${by}`;
  });

  const count = matched.length;
  return `${count} change${count === 1 ? "" : "s"} not yet applied to s. ${sectionNumber}: ${parts.join("; ")}.`;
}

// ---------------------------------------------------------------------------
// Provision text
// ---------------------------------------------------------------------------

export function extractProvisionText(block: string): string {
  let working = block;

  // Drop editorial annotation markers and the heading (captured separately).
  working = working.replace(/<CommentaryRef[^>]*\/>/g, "");
  working = working.replace(/<Title>[\s\S]*?<\/Title>/, "");

  // Give block-level elements a line break so numbering doesn't run together.
  working = working.replace(/<\/(P1para|P2para|P3para|P1|P2|P3|Text|Para)>/g, "\n");
  working = working.replace(/<(P2|P3)\s/g, "\n<$1 ");

  const text = decodeEntities(stripTags(working));

  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

// ---------------------------------------------------------------------------
// Top level
// ---------------------------------------------------------------------------

export function parseProvision(xml: string, sectionNumber: string): ProvisionParse {
  const block = extractProvisionBlock(xml);
  if (!block) {
    throw new Error(`No <P1group> found for section ${sectionNumber}`);
  }

  const groupTag = block.match(/<P1group[^>]*>/)?.[0] ?? "";
  const groupAttrs = attrsOf(groupTag);

  const heading = firstTagText(block, "Title");
  const number = firstTagText(block, "Pnumber") ?? sectionNumber;

  // in_force: CLML marks not-yet-commenced material with Status="Prospective".
  // NOTE: all three proof provisions are in force, so the false branch is not
  // exercised by real data yet — see TODO in scripts/lib/targets.ts.
  const p1Tag = block.match(/<P1\s[^>]*>/)?.[0] ?? "";
  const prospective =
    /Status="Prospective"/i.test(groupTag) || /Status="Prospective"/i.test(p1Tag);

  const allEffects = parseUnappliedEffects(xml);
  const matched = allEffects.filter(
    (e) => e.requiresApplied && effectAffectsSection(e, number)
  );

  return {
    number,
    heading,
    content: extractProvisionText(block),
    versionDate: groupAttrs.RestrictStartDate ?? null,
    inForce: !prospective,
    hasUnappliedAmendments: matched.length > 0,
    amendmentNote: buildAmendmentNote(matched, number),
    matchedEffects: matched,
  };
}
