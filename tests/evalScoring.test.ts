import { describe, it, expect } from "vitest";
import {
  compareRuns,
  computeMetrics,
  isAcceptableChange,
  isExpected,
  scoreCase,
  type CaseResult,
  type RetrievedRow,
} from "@/scripts/eval/scoring";
import { EVAL_SET } from "@/scripts/eval/eval-set";

const row = (legGovRef: string, provisionRef: string, similarity = 0.5): RetrievedRow => ({
  legGovRef,
  provisionRef,
  similarity,
  title: legGovRef,
});

const CASE = {
  id: "t",
  question: "q",
  expected: [
    { legGovRef: "ukpga/1973/18", ref: "section/25" },
    { legGovRef: "ukpga/1973/18", ref: "section/23" },
  ],
  rationale: "",
};

describe("isExpected", () => {
  it("matches on instrument AND provision, not either alone", () => {
    expect(isExpected(row("ukpga/1973/18", "section/25"), CASE.expected)).toBe(true);
    // Right section number, wrong Act — must not count.
    expect(isExpected(row("ukpga/1989/41", "section/25"), CASE.expected)).toBe(false);
    // Right Act, wrong section.
    expect(isExpected(row("ukpga/1973/18", "section/99"), CASE.expected)).toBe(false);
  });
});

describe("scoreCase", () => {
  it("reports the rank of the first expected provision", () => {
    const result = scoreCase(CASE, [
      row("ukpga/2004/33", "schedule/5/paragraph/21"),
      row("ukpga/1973/18", "section/25"),
    ]);
    expect(result.rank).toBe(2);
    expect(result.matched?.ref).toBe("section/25");
    expect(result.rowsAbove).toBe(1);
  });

  it("accepts ANY of several acceptable provisions", () => {
    // Several provisions can genuinely answer one question.
    const result = scoreCase(CASE, [row("ukpga/1973/18", "section/23")]);
    expect(result.rank).toBe(1);
    expect(result.matched?.ref).toBe("section/23");
  });

  it("records a miss rather than pretending a rank exists", () => {
    const result = scoreCase(CASE, [row("ukpga/2004/33", "section/1")]);
    expect(result.rank).toBeNull();
    expect(result.matched).toBeNull();
  });
});

describe("computeMetrics", () => {
  const results = [
    { id: "a", question: "", rank: 1, matched: null, rowsAbove: 0, top: [] },
    { id: "b", question: "", rank: 4, matched: null, rowsAbove: 3, top: [] },
    { id: "c", question: "", rank: null, matched: null, rowsAbove: 0, top: [] },
  ] as CaseResult[];

  it("counts hits at each cutoff", () => {
    const m = computeMetrics(results);
    expect(m.hitAt1).toBe(1);
    expect(m.hitAt3).toBe(1);
    expect(m.hitAt5).toBe(2);
    expect(m.misses).toBe(1);
  });

  it("scores a miss as zero rather than skipping it", () => {
    // Averaging only over hits would flatter a change that loses a provision.
    const m = computeMetrics(results);
    expect(m.mrr).toBeCloseTo((1 + 0.25 + 0) / 3, 5);
  });
});

describe("compareRuns — the no-regressions rule", () => {
  const before = [
    { id: "a", question: "", rank: 5, matched: null, rowsAbove: 4, top: [] },
    { id: "b", question: "", rank: 1, matched: null, rowsAbove: 0, top: [] },
  ] as CaseResult[];

  it("identifies improvement and leaves the rest unchanged", () => {
    const after = [
      { id: "a", question: "", rank: 2, matched: null, rowsAbove: 1, top: [] },
      { id: "b", question: "", rank: 1, matched: null, rowsAbove: 0, top: [] },
    ] as CaseResult[];
    const cmp = compareRuns(before, after);
    expect(cmp.improved.map((i) => i.id)).toEqual(["a"]);
    expect(cmp.regressed).toHaveLength(0);
    expect(isAcceptableChange(cmp)).toBe(true);
  });

  it("rejects a change that fixes one case and breaks another", () => {
    const after = [
      { id: "a", question: "", rank: 1, matched: null, rowsAbove: 0, top: [] },
      { id: "b", question: "", rank: 6, matched: null, rowsAbove: 5, top: [] },
    ] as CaseResult[];
    const cmp = compareRuns(before, after);
    expect(cmp.regressed.map((r) => r.id)).toEqual(["b"]);
    expect(isAcceptableChange(cmp)).toBe(false);
  });

  it("treats losing a provision entirely as a regression, not an improvement", () => {
    const after = [
      { id: "a", question: "", rank: null, matched: null, rowsAbove: 0, top: [] },
      { id: "b", question: "", rank: 1, matched: null, rowsAbove: 0, top: [] },
    ] as CaseResult[];
    const cmp = compareRuns(before, after);
    expect(cmp.regressed.map((r) => r.id)).toEqual(["a"]);
    expect(isAcceptableChange(cmp)).toBe(false);
  });

  it("rejects a no-op change (nothing improved)", () => {
    const cmp = compareRuns(before, before);
    expect(isAcceptableChange(cmp)).toBe(false);
  });
});

describe("EVAL_SET integrity", () => {
  it("has unique ids", () => {
    const ids = EVAL_SET.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every case at least one expected provision and a rationale", () => {
    for (const c of EVAL_SET) {
      expect(c.expected.length, c.id).toBeGreaterThan(0);
      expect(c.rationale.length, c.id).toBeGreaterThan(0);
      for (const e of c.expected) {
        expect(e.legGovRef, c.id).toMatch(/^(ukpga|uksi)\/\d{4}\/\d+$/);
        expect(e.ref, c.id).toMatch(/^(section|schedule|rule|part)\//);
      }
    }
  });

  it("covers cases whose correct answer is a SCHEDULE, not only sections", () => {
    // Guards the set itself: a purely section-based set would let a change
    // that demotes schedules appear harmless when it is not.
    const scheduleCases = EVAL_SET.filter((c) =>
      c.expected.every((e) => e.ref.startsWith("schedule/"))
    );
    expect(scheduleCases.length).toBeGreaterThanOrEqual(3);
  });

  it("covers cases whose correct answer is a PROCEDURE RULE, not only statute", () => {
    // The same guard, one level out. Litigants ask what they must DO at least
    // as often as what the law is, and only the FPR/CPR answer that. A set
    // without rule cases would let a change that buries the rules — or drops
    // them from the corpus — look free.
    const ruleCases = EVAL_SET.filter((c) => c.expected.every((e) => e.ref.startsWith("rule/")));
    expect(ruleCases.length).toBeGreaterThanOrEqual(2);
  });
});
