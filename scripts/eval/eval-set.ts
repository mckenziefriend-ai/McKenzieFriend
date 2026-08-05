/**
 * Retrieval eval set.
 *
 * Each case is a question a litigant in person might actually ask, mapped to
 * the provision(s) that canonically answer it. Several provisions may be
 * acceptable — "faulty goods" is genuinely answered by the quality standard in
 * s.9 or by the remedies in ss.19-24 — so a case is a hit if ANY expected
 * provision is retrieved, and we record which one and at what rank.
 *
 * Every expected provision below was verified against the live corpus on
 * 2026-08-03: all present, in force, not content-omitted, extent covering E&W.
 * An eval set that quietly points at repealed or non-E&W provisions would
 * measure the wrong thing.
 *
 * Expand this set rather than tuning to any single case. A ranking change is
 * only acceptable if it improves the whole set with no regressions.
 */

export type ExpectedProvision = {
  legGovRef: string;
  ref: string;
};

export type EvalCase = {
  id: string;
  question: string;
  expected: ExpectedProvision[];
  /** Why these provisions are the right answer. */
  rationale: string;
};

export const EVAL_SET: EvalCase[] = [
  {
    id: "divorce-finances",
    question: "what factors does the court consider when dividing finances on divorce?",
    expected: [{ legGovRef: "ukpga/1973/18", ref: "section/25" }],
    rationale: "MCA 1973 s.25 is the statutory checklist for financial relief on divorce.",
  },
  {
    id: "welfare-checklist",
    question: "what is the welfare checklist the court uses for decisions about a child?",
    expected: [{ legGovRef: "ukpga/1989/41", ref: "section/1" }],
    rationale: "CA 1989 s.1 contains the paramountcy principle and the welfare checklist.",
  },
  {
    id: "child-arrangements-order",
    question: "how do I apply for a child arrangements order about who my child lives with?",
    expected: [{ legGovRef: "ukpga/1989/41", ref: "section/8" }],
    rationale: "CA 1989 s.8 defines child arrangements orders.",
  },
  {
    id: "non-molestation-order",
    question: "how can I get a non-molestation order against my ex-partner?",
    expected: [{ legGovRef: "ukpga/1996/27", ref: "section/42" }],
    rationale: "FLA 1996 s.42 is the non-molestation order provision.",
  },
  {
    id: "occupation-order",
    question: "can I get an order to stay in the family home and exclude my partner?",
    expected: [{ legGovRef: "ukpga/1996/27", ref: "section/33" }],
    rationale: "FLA 1996 s.33 is the principal occupation order provision.",
  },
  {
    id: "parental-responsibility",
    question: "what is parental responsibility and how does a father get it?",
    expected: [
      { legGovRef: "ukpga/1989/41", ref: "section/3" },
      { legGovRef: "ukpga/1989/41", ref: "section/4" },
    ],
    rationale: "CA 1989 s.3 defines it; s.4 covers acquisition by the father.",
  },
  {
    id: "limitation-contract",
    question: "how long do I have to bring a claim for breach of contract?",
    expected: [{ legGovRef: "ukpga/1980/58", ref: "section/5" }],
    rationale: "Limitation Act 1980 s.5 — six years for simple contract.",
  },
  {
    id: "limitation-personal-injury",
    question: "what is the time limit for making a personal injury claim?",
    expected: [{ legGovRef: "ukpga/1980/58", ref: "section/11" }],
    rationale: "Limitation Act 1980 s.11 — special time limit for personal injury.",
  },
  {
    id: "faulty-goods",
    question: "the item I bought is faulty, what am I entitled to?",
    expected: [
      { legGovRef: "ukpga/2015/15", ref: "section/9" },
      { legGovRef: "ukpga/2015/15", ref: "section/19" },
      { legGovRef: "ukpga/2015/15", ref: "section/20" },
      { legGovRef: "ukpga/2015/15", ref: "section/23" },
      { legGovRef: "ukpga/2015/15", ref: "section/24" },
    ],
    rationale: "CRA 2015 s.9 sets the quality standard; ss.19-24 give the remedies.",
  },
  {
    id: "evicting-ast",
    question: "how do I evict an assured shorthold tenant from my property?",
    expected: [
      { legGovRef: "ukpga/1988/50", ref: "section/21" },
      { legGovRef: "ukpga/1988/50", ref: "section/8" },
    ],
    rationale: "Housing Act 1988 s.21 (no-fault) and s.8 (grounds-based) notices.",
  },

  // -------------------------------------------------------------------------
  // Cases whose correct answer IS a schedule.
  //
  // Without these the set was 100% sections, which would let a ranking change
  // that demotes schedules look free when it is not. A schedule is often the
  // operative law — Convention rights live in a schedule, and so does the whole
  // child-financial-provision regime. These cases exist to catch that harm.
  // -------------------------------------------------------------------------
  {
    id: "child-financial-provision",
    question: "how do I apply for financial support for my child from the other parent?",
    expected: [
      { legGovRef: "ukpga/1989/41", ref: "schedule/1/paragraph/1" },
      { legGovRef: "ukpga/1989/41", ref: "schedule/1/paragraph/2" },
      { legGovRef: "ukpga/1989/41", ref: "schedule/1/paragraph/4" },
    ],
    rationale:
      "CA 1989 Sch 1 is the financial provision for children regime: para 1 orders " +
      "against parents, para 2 for those over 18, para 4 the matters to consider.",
  },
  {
    id: "fair-trial-right",
    question: "do I have a right to a fair hearing in court?",
    expected: [
      { legGovRef: "ukpga/1998/42", ref: "schedule/1/part/I/chapter/5/paragraph/1" },
      { legGovRef: "ukpga/1998/42", ref: "schedule/1/part/I/chapter/5/paragraph/2" },
      { legGovRef: "ukpga/1998/42", ref: "schedule/1/part/I/chapter/5/paragraph/3" },
    ],
    rationale:
      "HRA 1998 Sch 1 Article 6 is the right to a fair trial. The Convention " +
      "rights are IN a schedule — demoting schedules must not bury them.",
  },
  {
    id: "civil-partnership-finances",
    question: "how are finances divided when a civil partnership is dissolved?",
    expected: [
      { legGovRef: "ukpga/2004/33", ref: "schedule/5/paragraph/20" },
      { legGovRef: "ukpga/2004/33", ref: "schedule/5/paragraph/21" },
      { legGovRef: "ukpga/2004/33", ref: "schedule/5/paragraph/22" },
    ],
    rationale:
      "CPA 2004 Sch 5 is the financial relief regime for civil partnerships, " +
      "mirroring MCA 1973 s.25. Directly adversarial to the divorce-finances " +
      "case: the same text must rank DOWN there and UP here.",
  },
];
