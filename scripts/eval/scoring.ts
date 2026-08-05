/**
 * Pure scoring for the retrieval eval — separated from the network so the
 * metrics themselves are unit-testable.
 */

import type { EvalCase, ExpectedProvision } from "./eval-set";

export type RetrievedRow = {
  legGovRef: string | null;
  provisionRef: string | null;
  similarity: number;
  title: string | null;
};

export type CaseResult = {
  id: string;
  question: string;
  /** 1-based rank of the first expected provision, or null if absent. */
  rank: number | null;
  matched: ExpectedProvision | null;
  /** How many of the rows above the first hit came from other instruments. */
  rowsAbove: number;
  top: RetrievedRow[];
};

export function isExpected(row: RetrievedRow, expected: ExpectedProvision[]): boolean {
  return expected.some(
    (e) => e.legGovRef === row.legGovRef && e.ref === row.provisionRef
  );
}

export function scoreCase(
  evalCase: EvalCase,
  rows: RetrievedRow[]
): CaseResult {
  let rank: number | null = null;
  let matched: ExpectedProvision | null = null;

  for (const [index, row] of rows.entries()) {
    if (!isExpected(row, evalCase.expected)) continue;
    rank = index + 1;
    matched =
      evalCase.expected.find(
        (e) => e.legGovRef === row.legGovRef && e.ref === row.provisionRef
      ) ?? null;
    break;
  }

  return {
    id: evalCase.id,
    question: evalCase.question,
    rank,
    matched,
    rowsAbove: rank === null ? rows.length : rank - 1,
    top: rows,
  };
}

export type Metrics = {
  cases: number;
  hitAt1: number;
  hitAt3: number;
  hitAt5: number;
  hitAt10: number;
  misses: number;
  /** Mean reciprocal rank; misses contribute 0. */
  mrr: number;
};

export function computeMetrics(results: CaseResult[]): Metrics {
  const hitAt = (k: number) =>
    results.filter((r) => r.rank !== null && r.rank <= k).length;

  const reciprocal = results.reduce(
    (sum, r) => sum + (r.rank === null ? 0 : 1 / r.rank),
    0
  );

  return {
    cases: results.length,
    hitAt1: hitAt(1),
    hitAt3: hitAt(3),
    hitAt5: hitAt(5),
    hitAt10: hitAt(10),
    misses: results.filter((r) => r.rank === null).length,
    mrr: results.length ? reciprocal / results.length : 0,
  };
}

/**
 * Compares two runs. The hard rule for any ranking change is net improvement
 * with NO regressions, so regressions are listed explicitly rather than being
 * averaged away by an aggregate that happens to improve.
 */
export type Comparison = {
  improved: { id: string; from: number | null; to: number | null }[];
  regressed: { id: string; from: number | null; to: number | null }[];
  unchanged: string[];
};

export function compareRuns(before: CaseResult[], after: CaseResult[]): Comparison {
  const byId = new Map(before.map((r) => [r.id, r]));
  const comparison: Comparison = { improved: [], regressed: [], unchanged: [] };

  for (const now of after) {
    const then = byId.get(now.id);
    if (!then) continue;

    // A miss is worse than any rank; treat it as infinity for ordering.
    const rankOf = (r: CaseResult) => (r.rank === null ? Number.POSITIVE_INFINITY : r.rank);
    const from = rankOf(then);
    const to = rankOf(now);

    if (to < from) comparison.improved.push({ id: now.id, from: then.rank, to: now.rank });
    else if (to > from) comparison.regressed.push({ id: now.id, from: then.rank, to: now.rank });
    else comparison.unchanged.push(now.id);
  }

  return comparison;
}

export function isAcceptableChange(comparison: Comparison): boolean {
  return comparison.regressed.length === 0 && comparison.improved.length > 0;
}
