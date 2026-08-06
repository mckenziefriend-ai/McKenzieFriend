/**
 * Ingestion targets — the primary-legislation and procedure-rules half of
 * drafts/legal-whitelist.md.
 *
 * Extending the corpus is a data edit here, no code change.
 *
 * Titles below are the OFFICIAL titles returned by legislation.gov.uk, all
 * verified to resolve on 2026-07-31 (21/21: 20 exact, 1 differing from the
 * whitelist only by its "(Pt 4)" annotation). Verification re-runs on every
 * ingest — nothing is ingested against an identifier that fails or mismatches.
 *
 * The procedure rules (FPR, CPR) are now ingested alongside the Acts. Two
 * things had to change first, both done: rule numbers are split between the
 * Pnumber text and a PuncAfter attribute (see joinPnumber), and rules cite as
 * "r. 12.3" rather than "s. 12" (see provisionLabel).
 *
 * KNOWN, out of scope: the CPR still carries the old RSC and CCR as Schedules 1
 * and 2, and those 827 paragraphs do not number like anything else. Measured:
 * refs of the form schedule/1/part/2/paragraph/Rule1A, numbers reading
 * "Rule 4", "Rule1A" or null, and the same number recurring across Orders (572
 * paragraphs share 99 distinct numbers), because the Order is the `part`
 * segment rather than part of the number. They are therefore identified by ref
 * and by heading — which does carry the Order — and not by number.
 * provisionLabel leaves that ref shape alone deliberately rather than invent a
 * citation that would be ambiguous. Pre-existing, unchanged here.
 *
 * DEFERRED — the Practice Directions. They live on justice.gov.uk rather than
 * legislation.gov.uk, are not statutory instruments, and carry none of the
 * currency or extent data this pipeline depends on. They need their own
 * mechanism, not a target row.
 *
 * TODO (prospective path): as of the Children Act and MCA, no instrument had a
 * Status="Prospective" provision, so that branch of in_force was implemented
 * but never exercised on real data. The ingest run scans for it across every
 * instrument and reports what it finds.
 */

export type InstrumentTarget = {
  /** legislation.gov.uk ref, e.g. "ukpga/1989/41". */
  legGovRef: string;
  /** Official title, checked against what the API returns before ingesting. */
  expectedTitle: string;
  jurisdiction: string;
  /** Whitelist grouping, for the per-instrument report. */
  area: "family" | "civil" | "cross-cutting" | "procedure";
};

export const TARGETS: InstrumentTarget[] = [
  // A. Family law
  { legGovRef: "ukpga/1989/41", expectedTitle: "Children Act 1989", jurisdiction: "England and Wales", area: "family" },
  { legGovRef: "ukpga/1973/18", expectedTitle: "Matrimonial Causes Act 1973", jurisdiction: "England and Wales", area: "family" },
  { legGovRef: "ukpga/1996/27", expectedTitle: "Family Law Act 1996", jurisdiction: "England and Wales", area: "family" },
  { legGovRef: "ukpga/2021/17", expectedTitle: "Domestic Abuse Act 2021", jurisdiction: "England and Wales", area: "family" },
  { legGovRef: "ukpga/2014/6", expectedTitle: "Children and Families Act 2014", jurisdiction: "England and Wales", area: "family" },
  { legGovRef: "ukpga/2020/11", expectedTitle: "Divorce, Dissolution and Separation Act 2020", jurisdiction: "England and Wales", area: "family" },
  { legGovRef: "ukpga/2002/38", expectedTitle: "Adoption and Children Act 2002", jurisdiction: "England and Wales", area: "family" },
  { legGovRef: "ukpga/1991/48", expectedTitle: "Child Support Act 1991", jurisdiction: "England and Wales", area: "family" },
  { legGovRef: "ukpga/2004/33", expectedTitle: "Civil Partnership Act 2004", jurisdiction: "England and Wales", area: "family" },

  // B. Civil law
  { legGovRef: "ukpga/1980/58", expectedTitle: "Limitation Act 1980", jurisdiction: "England and Wales", area: "civil" },
  { legGovRef: "ukpga/1981/54", expectedTitle: "Senior Courts Act 1981", jurisdiction: "England and Wales", area: "civil" },
  { legGovRef: "ukpga/1984/28", expectedTitle: "County Courts Act 1984", jurisdiction: "England and Wales", area: "civil" },
  { legGovRef: "ukpga/2015/15", expectedTitle: "Consumer Rights Act 2015", jurisdiction: "England and Wales", area: "civil" },
  { legGovRef: "ukpga/1988/50", expectedTitle: "Housing Act 1988", jurisdiction: "England and Wales", area: "civil" },
  { legGovRef: "ukpga/1977/43", expectedTitle: "Protection from Eviction Act 1977", jurisdiction: "England and Wales", area: "civil" },
  { legGovRef: "ukpga/1985/70", expectedTitle: "Landlord and Tenant Act 1985", jurisdiction: "England and Wales", area: "civil" },
  { legGovRef: "ukpga/1996/18", expectedTitle: "Employment Rights Act 1996", jurisdiction: "England and Wales", area: "civil" },
  { legGovRef: "ukpga/1997/40", expectedTitle: "Protection from Harassment Act 1997", jurisdiction: "England and Wales", area: "civil" },

  // C. Cross-cutting
  { legGovRef: "ukpga/1998/42", expectedTitle: "Human Rights Act 1998", jurisdiction: "England and Wales", area: "cross-cutting" },
  { legGovRef: "ukpga/2010/15", expectedTitle: "Equality Act 2010", jurisdiction: "England and Wales", area: "cross-cutting" },
  { legGovRef: "ukpga/2012/10", expectedTitle: "Legal Aid, Sentencing and Punishment of Offenders Act 2012", jurisdiction: "England and Wales", area: "cross-cutting" },

  // D. Procedure rules. These are SIs, so they carry the same currency and
  // extent data as the Acts and need no special ingestion path — only the
  // rule-numbering fix (see joinPnumber) and rule citation conventions.
  { legGovRef: "uksi/2010/2955", expectedTitle: "The Family Procedure Rules 2010", jurisdiction: "England and Wales", area: "procedure" },
  { legGovRef: "uksi/1998/3132", expectedTitle: "The Civil Procedure Rules 1998", jurisdiction: "England and Wales", area: "procedure" },
];

/**
 * Currency outcomes asserted on every run. These come from the two Acts proven
 * in earlier steps, so a parser regression anywhere fails the whole ingest.
 */
export type ProofExpectation = {
  legGovRef: string;
  ref: string;
  hasUnappliedAmendments: boolean;
  requireNote: boolean;
};

export const PROOF_EXPECTATIONS: ProofExpectation[] = [
  { legGovRef: "ukpga/1989/41", ref: "section/8", hasUnappliedAmendments: true, requireNote: true },
  { legGovRef: "ukpga/1989/41", ref: "section/1", hasUnappliedAmendments: false, requireNote: false },
  { legGovRef: "ukpga/1973/18", ref: "section/25", hasUnappliedAmendments: false, requireNote: false },
];

export const BASE_URL = "https://www.legislation.gov.uk";

export const USER_AGENT =
  "McKenzieFriend.ai-ingest/0.1 (+https://mckenziefriend.ai; contact info@mckenziefriend.ai)";

/** Politeness settings for a public government API. */
export const REQUEST_DELAY_MS = 2000;
export const REQUEST_TIMEOUT_MS = 180000;
export const MAX_RETRIES = 3;

/** Provisions per generated SQL file, to keep each pasteable in the editor. */
export const SQL_CHUNK_SIZE = 100;

/** Rows per upsert batch in --writer=db mode. */
export const DB_BATCH_SIZE = 500;

/** Report an instrument if enumeration falls this far below the declared count. */
export const SHORTFALL_WARN_RATIO = 0.1;
