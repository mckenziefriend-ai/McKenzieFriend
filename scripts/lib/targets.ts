/**
 * Ingestion targets. Extending the corpus is a data edit here — no code change.
 *
 * Refs are legislation.gov.uk paths and are verified to resolve at run time
 * before anything is stored (see drafts/legal-whitelist.md, caveat 1).
 *
 * Whole-instrument mode: one request per instrument fetches the complete
 * document (~5 MB for the Children Act), from which every section and schedule
 * paragraph is enumerated. Fetching per-provision would be ~600 requests
 * against a free public service for the same data.
 *
 * TODO (before we rely on in_force for prospective law): no instrument here
 * contains a Status="Prospective" provision, so the prospective branch of
 * in_force is implemented but has never run against real data. The Children Act
 * does exercise the Repealed branch (29 provisions). Add a known
 * not-yet-commenced provision when one is identified.
 */

export type InstrumentTarget = {
  /** legislation.gov.uk ref, e.g. "ukpga/1989/41". */
  legGovRef: string;
  /** Expected title, checked against what the API returns. */
  expectedTitle: string;
  jurisdiction: string;
};

export const TARGETS: InstrumentTarget[] = [
  {
    legGovRef: "ukpga/1989/41",
    expectedTitle: "Children Act 1989",
    jurisdiction: "England and Wales",
  },
  {
    legGovRef: "ukpga/1973/18",
    expectedTitle: "Matrimonial Causes Act 1973",
    jurisdiction: "England and Wales",
  },
];

/**
 * Expected currency outcomes. The script asserts these and exits non-zero on
 * mismatch, so a silent parser regression fails loudly rather than shipping.
 */
export type ProofExpectation = {
  legGovRef: string;
  ref: string;
  hasUnappliedAmendments: boolean;
  requireNote: boolean;
};

export const PROOF_EXPECTATIONS: ProofExpectation[] = [
  // "changes not yet applied" state
  { legGovRef: "ukpga/1989/41", ref: "section/8", hasUnappliedAmendments: true, requireNote: true },
  // "no outstanding effects" state
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
