/**
 * Retrieval ranking eval.
 *
 *   npm run eval:retrieval                  score the whole set
 *   npm run eval:retrieval -- --verbose     also dump the top rows per case
 *   npm run eval:retrieval -- --k=20        retrieve deeper than the app does
 *   npm run eval:retrieval -- --save=base   write results for later comparison
 *   npm run eval:retrieval -- --compare=base   compare against a saved run
 *
 * Measures the SEMANTIC ranking directly via search_legal_semantic, not the
 * whole app path: the citation short-circuit would mask ranking problems on
 * questions that happen to name a section, and it is ranking we are diagnosing.
 *
 * Reads OPENAI_API_KEY and the service-role key from scripts/.env, same
 * isolation as every other script here.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
  createOpenAIEmbeddingProvider,
} from "../../lib/ai/embeddings";
import { EVAL_SET } from "./eval-set";
import {
  compareRuns,
  computeMetrics,
  isAcceptableChange,
  scoreCase,
  type CaseResult,
  type RetrievedRow,
} from "./scoring";

const evalDir = dirname(fileURLToPath(import.meta.url));
const runsDir = join(evalDir, "runs");

const argv = process.argv.slice(2);
const verbose = argv.includes("--verbose");
const k = Number(argv.find((a) => a.startsWith("--k="))?.split("=")[1] ?? 20);
const saveAs = argv.find((a) => a.startsWith("--save="))?.split("=")[1] ?? null;
const compareWith = argv.find((a) => a.startsWith("--compare="))?.split("=")[1] ?? null;

/** What the app actually shows the model, for context on whether a rank matters. */
const APP_MATCH_LIMIT = 8;

async function main() {
  const { getServiceClient } = await import("../lib/db");
  const client = getServiceClient();

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY missing from scripts/.env");

  const provider = createOpenAIEmbeddingProvider({
    apiKey,
    model: DEFAULT_EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  console.log(`Retrieval eval — ${EVAL_SET.length} cases, k=${k}\n`);

  const results: CaseResult[] = [];

  for (const evalCase of EVAL_SET) {
    const { vectors } = await provider.embed([evalCase.question]);
    const { data, error } = await client.rpc("search_legal_semantic", {
      query_embedding: vectors[0],
      match_limit: k,
      similarity_floor: 0,
      model_filter: DEFAULT_EMBEDDING_MODEL,
    });
    if (error) throw new Error(`search failed for ${evalCase.id}: ${error.message}`);

    const rows: RetrievedRow[] = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
      legGovRef: (r.leg_gov_ref as string) ?? null,
      provisionRef: (r.provision_ref as string) ?? null,
      similarity: Number(r.similarity ?? 0),
      title: (r.title as string) ?? null,
    }));

    results.push(scoreCase(evalCase, rows));
  }

  // --- Per-case table -------------------------------------------------------
  console.log("case                      rank  in app top-8  matched");
  console.log("-".repeat(78));
  for (const r of results) {
    const rank = r.rank === null ? "MISS" : String(r.rank);
    const inApp = r.rank !== null && r.rank <= APP_MATCH_LIMIT ? "yes" : "NO";
    const matched = r.matched ? `${r.matched.legGovRef} ${r.matched.ref}` : "-";
    console.log(`${r.id.padEnd(25)} ${rank.padStart(4)}  ${inApp.padStart(12)}  ${matched}`);
  }

  // --- Metrics --------------------------------------------------------------
  const m = computeMetrics(results);
  console.log("-".repeat(78));
  console.log(
    `hit@1 ${m.hitAt1}/${m.cases}   hit@3 ${m.hitAt3}/${m.cases}   ` +
      `hit@5 ${m.hitAt5}/${m.cases}   hit@10 ${m.hitAt10}/${m.cases}   ` +
      `misses ${m.misses}   MRR ${m.mrr.toFixed(3)}`
  );

  // --- Diagnosis ------------------------------------------------------------
  if (verbose) {
    for (const r of results) {
      console.log(`\n=== ${r.id} — "${r.question}"`);
      r.top.slice(0, 10).forEach((row, i) => {
        const hit = r.rank === i + 1 ? " <== EXPECTED" : "";
        const kind = row.provisionRef?.startsWith("schedule") ? "sched" : "sec  ";
        console.log(
          `  ${String(i + 1).padStart(2)}. ${row.similarity.toFixed(3)} ${kind} ` +
            `${(row.title ?? "").slice(0, 34).padEnd(34)} ${row.provisionRef}${hit}`
        );
      });
    }
  }

  // --- Save / compare -------------------------------------------------------
  if (saveAs) {
    mkdirSync(runsDir, { recursive: true });
    const path = join(runsDir, `${saveAs}.json`);
    writeFileSync(path, JSON.stringify(results, null, 2));
    console.log(`\nsaved run to ${path}`);
  }

  if (compareWith) {
    const path = join(runsDir, `${compareWith}.json`);
    if (!existsSync(path)) throw new Error(`no saved run named "${compareWith}"`);
    const before = JSON.parse(readFileSync(path, "utf8")) as CaseResult[];
    const cmp = compareRuns(before, results);

    console.log(`\n=== compared against "${compareWith}" ===`);
    for (const i of cmp.improved) console.log(`  IMPROVED  ${i.id}: ${i.from ?? "MISS"} -> ${i.to ?? "MISS"}`);
    for (const r of cmp.regressed) console.log(`  REGRESSED ${r.id}: ${r.from ?? "MISS"} -> ${r.to ?? "MISS"}`);
    console.log(`  unchanged: ${cmp.unchanged.length}`);
    console.log(
      isAcceptableChange(cmp)
        ? "\nACCEPTABLE: net improvement with no regressions."
        : "\nNOT ACCEPTABLE: " +
            (cmp.regressed.length ? `${cmp.regressed.length} regression(s).` : "no improvement.")
    );
    if (cmp.regressed.length) process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("\neval failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
