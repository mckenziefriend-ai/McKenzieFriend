/**
 * Citation parsing for the retrieval short-circuit.
 *
 * "What does s.8 Children Act say?" is one of the most predictable questions
 * this product receives, and embeddings are mediocre at exact citation recall —
 * a semantic search for "section 8" happily returns section 9. So we detect an
 * explicit citation and look it up directly, merging exact hits ABOVE semantic
 * ones.
 */

export type ParsedCitation = {
  /** Provision refs in legislation.gov.uk form, e.g. ["section/8"]. */
  provisionRefs: string[];
  /** A fragment to narrow the instrument by: an abbreviation expansion or year. */
  instrumentHint: string | null;
};

/**
 * Abbreviations a litigant or their reading actually uses. Deliberately short
 * and stable — anything unrecognised simply falls through to semantic search.
 */
const ABBREVIATIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bCA\s*1989\b/i, "Children Act 1989"],
  [/\bMCA\s*1973\b/i, "Matrimonial Causes Act 1973"],
  [/\bFLA\s*1996\b/i, "Family Law Act 1996"],
  [/\bDAA\s*2021\b/i, "Domestic Abuse Act 2021"],
  [/\bCFA\s*2014\b/i, "Children and Families Act 2014"],
  [/\bACA\s*2002\b/i, "Adoption and Children Act 2002"],
  [/\bCSA\s*1991\b/i, "Child Support Act 1991"],
  [/\bCPA\s*2004\b/i, "Civil Partnership Act 2004"],
  [/\bLA\s*1980\b/i, "Limitation Act 1980"],
  [/\bSCA\s*1981\b/i, "Senior Courts Act 1981"],
  [/\bCCA\s*1984\b/i, "County Courts Act 1984"],
  [/\bCRA\s*2015\b/i, "Consumer Rights Act 2015"],
  [/\bHA\s*1988\b/i, "Housing Act 1988"],
  [/\bLTA\s*1985\b/i, "Landlord and Tenant Act 1985"],
  [/\bERA\s*1996\b/i, "Employment Rights Act 1996"],
  [/\bPHA\s*1997\b/i, "Protection from Harassment Act 1997"],
  [/\bHRA\s*1998\b/i, "Human Rights Act 1998"],
  [/\bEA\s*2010\b/i, "Equality Act 2010"],
  [/\bLASPO\b/i, "Legal Aid, Sentencing and Punishment of Offenders Act 2012"],
];

/**
 * Matches "s.8", "s. 8", "s 8", "ss. 8", "section 8", "sections 8".
 *
 * The leading \b prevents matching the trailing "s" of ordinary words: in
 * "was 8" there is no word boundary before the "s", so it cannot fire.
 * A trailing subsection like "(3)" is ignored — we cite the whole section.
 */
// Longest alternatives first: "sch" must not match the start of "schedule",
// which would leave "edule 1" and capture nonsense.
const SECTION_PATTERN = /\b(?:sections?|ss?\.?)\s*(\d+[A-Z]*)\b/gi;

/** Matches "sch. 1 para. 2", "schedule 1 paragraph 2", "Sch 1". */
const SCHEDULE_PATTERN =
  /\b(?:schedules?|sch\.?)\s*([0-9A-Z]+)(?:\s*,?\s*(?:paragraphs?|paras?\.?)\s*([0-9A-Z]+))?\b/gi;

/** A four-digit year, used to narrow the instrument when no abbreviation matched. */
const YEAR_PATTERN = /\b(?:1[89]|20)\d{2}\b/;

const MAX_REFS = 6;

export function parseCitation(query: string): ParsedCitation {
  const text = String(query ?? "");
  const refs: string[] = [];

  for (const match of text.matchAll(SECTION_PATTERN)) {
    const ref = `section/${match[1].toUpperCase()}`;
    if (!refs.includes(ref)) refs.push(ref);
  }

  for (const match of text.matchAll(SCHEDULE_PATTERN)) {
    const schedule = match[1].toUpperCase();
    const paragraph = match[2]?.toUpperCase();
    const ref = paragraph
      ? `schedule/${schedule}/paragraph/${paragraph}`
      : `schedule/${schedule}`;
    if (!refs.includes(ref)) refs.push(ref);
  }

  return {
    provisionRefs: refs.slice(0, MAX_REFS),
    instrumentHint: findInstrumentHint(text),
  };
}

function findInstrumentHint(text: string): string | null {
  for (const [pattern, expansion] of ABBREVIATIONS) {
    if (pattern.test(text)) return expansion;
  }

  // A named Act: "... Children Act 1989 ...". Capture the title itself so the
  // SQL ILIKE can match it.
  const named = text.match(/\b((?:[A-Z][\w'-]*\s+){1,6}Act\s+(?:1[89]|20)\d{2})\b/);
  if (named) return named[1].trim();

  const year = text.match(YEAR_PATTERN);
  return year ? year[0] : null;
}

/** True when the query contains an explicit citation worth looking up directly. */
export function hasCitation(parsed: ParsedCitation): boolean {
  return parsed.provisionRefs.length > 0;
}
