/**
 * Ingestion targets. Extending the corpus is a data edit here — no code change.
 *
 * Refs are legislation.gov.uk paths and are verified to resolve at run time
 * before anything is stored (see drafts/legal-whitelist.md, caveat 1).
 *
 * TODO (before we rely on in_force): every provision below is currently in
 * force, so the `in_force = false` branch of the parser is implemented but has
 * never run against real data. When we scale past this proof, deliberately add
 * one known not-yet-commenced provision here so the prospective path is
 * exercised for real.
 */

export type ProvisionTarget = {
  /** Path under the instrument, e.g. "section/8". */
  ref: string;
  /** Section number used for effect matching, e.g. "8". */
  sectionNumber: string;
  position: number;
};

export type InstrumentTarget = {
  /** legislation.gov.uk ref, e.g. "ukpga/1989/41". */
  legGovRef: string;
  /** Expected title, used as a sanity check against what the API returns. */
  expectedTitle: string;
  jurisdiction: string;
  provisions: ProvisionTarget[];
};

export const TARGETS: InstrumentTarget[] = [
  {
    legGovRef: "ukpga/1989/41",
    expectedTitle: "Children Act 1989",
    jurisdiction: "England and Wales",
    provisions: [
      { ref: "section/1", sectionNumber: "1", position: 1 },
      { ref: "section/8", sectionNumber: "8", position: 2 },
    ],
  },
  {
    legGovRef: "ukpga/1973/18",
    expectedTitle: "Matrimonial Causes Act 1973",
    jurisdiction: "England and Wales",
    provisions: [{ ref: "section/25", sectionNumber: "25", position: 1 }],
  },
];

/**
 * Expected currency outcomes for the proof run. The script asserts these and
 * exits non-zero on mismatch, so a silent parser regression fails loudly.
 */
export const PROOF_EXPECTATIONS: {
  legGovRef: string;
  ref: string;
  hasUnappliedAmendments: boolean;
  requireNote: boolean;
}[] = [
  // Exercises the "changes not yet applied" state.
  {
    legGovRef: "ukpga/1989/41",
    ref: "section/8",
    hasUnappliedAmendments: true,
    requireNote: true,
  },
  // Exercises the "no outstanding effects" state.
  {
    legGovRef: "ukpga/1973/18",
    ref: "section/25",
    hasUnappliedAmendments: false,
    requireNote: false,
  },
];

export const BASE_URL = "https://www.legislation.gov.uk";

export const USER_AGENT =
  "McKenzieFriend.ai-ingest/0.1 (+https://mckenziefriend.ai; contact info@mckenziefriend.ai)";

/** Politeness settings for a public government API. */
export const REQUEST_DELAY_MS = 2000;
export const REQUEST_TIMEOUT_MS = 60000;
export const MAX_RETRIES = 3;
