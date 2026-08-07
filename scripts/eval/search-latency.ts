/**
 * Latency probe for search_legal_semantic.
 *
 *   npm run eval:latency              5 calls at the app's match_limit
 *   npm run eval:latency -- --k=20    at the eval's depth
 *   npm run eval:latency -- --runs=10
 *
 * Exists because the ranking eval measures ORDER and this measures TIME, and
 * the two fail differently: trackb5 left the function doing a sequential scan
 * over every embedding, which stayed invisible to the eval until the corpus
 * grew enough for the whole run to time out. See supabase/trackb7_hnsw_two_stage.sql.
 *
 * READ THE FIRST CALL, NOT THE MEDIAN. Once the embeddings are resident in
 * memory even a full sequential scan is fast — measured at 175ms warm against
 * 6,729-10,556ms cold on the same function. Running calls back to back is
 * exactly what keeps them resident, so the median here flatters whatever it is
 * measuring, and a green median is NOT evidence that the HNSW index is in use.
 * Real traffic arrives minutes apart and lands cold. The first call is the
 * closest thing this probe has to that, and EXPLAIN is the only actual proof.
 *
 * Sends a deterministic pseudo-random unit vector rather than a real embedding.
 * The query plan and the work done do not depend on which vector arrives, so
 * this needs no OpenAI key and costs nothing. It is read-only.
 *
 * Reads the service-role key from scripts/.env, same isolation as every other
 * script here, and never prints it.
 */

import { getServiceClient } from "../lib/db";
import { DEFAULT_EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from "../../lib/ai/embeddings";

const argv = process.argv.slice(2);
const k = Number(argv.find((a) => a.startsWith("--k="))?.split("=")[1] ?? 8);
const runs = Number(argv.find((a) => a.startsWith("--runs="))?.split("=")[1] ?? 5);

/** Above this, live retrieval is visibly slow and the eval starts timing out. */
const BUDGET_MS = 500;

/** Deterministic, so repeat runs are comparable across sessions. */
function probeVector(dims: number, seed = 12345): number[] {
  let s = seed;
  const v: number[] = [];
  for (let i = 0; i < dims; i++) {
    s = (s * 1103515245 + 12345) % 2147483648;
    v.push(s / 2147483648 - 0.5);
  }
  const norm = Math.sqrt(v.reduce((a, x) => a + x * x, 0));
  return v.map((x) => x / norm);
}

async function main() {
  const client = getServiceClient();
  const vector = probeVector(EMBEDDING_DIMENSIONS);

  const { count, error: countError } = await client
    .from("legal_embeddings")
    .select("*", { count: "exact", head: true });
  if (countError) throw new Error(`count failed: ${countError.message}`);

  console.log(`search_legal_semantic — ${runs} calls at match_limit=${k}`);
  console.log(`corpus: ${count ?? "?"} embedding rows\n`);

  const timings: number[] = [];
  let failures = 0;
  for (let i = 0; i < runs; i++) {
    const started = Date.now();
    try {
      const { data, error } = await client.rpc("search_legal_semantic", {
        query_embedding: vector,
        match_limit: k,
        similarity_floor: 0,
        model_filter: DEFAULT_EMBEDDING_MODEL,
      });
      const ms = Date.now() - started;
      if (error) throw new Error(error.message);
      timings.push(ms);
      console.log(`  run ${i + 1}: ${String(ms).padStart(6)} ms   ${(data ?? []).length} rows`);
    } catch (error) {
      // A slow enough query does not return an error, it drops the connection.
      // Timing the failure is the measurement that matters.
      failures++;
      const ms = Date.now() - started;
      const reason = error instanceof Error ? error.message : String(error);
      console.log(`  run ${i + 1}: ${String(ms).padStart(6)} ms   FAILED — ${reason}`);
    }
  }

  if (!timings.length) {
    console.log(`\nevery call failed after ~${runs} attempts — the query is not completing at all`);
    process.exitCode = 1;
    return;
  }

  const sorted = [...timings].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const slowest = sorted[sorted.length - 1];
  const first = timings[0];
  console.log(
    `\nfirst call ${first} ms (coldest, the one that matters)` +
      `\nmedian ${median} ms, slowest ${slowest} ms, budget ${BUDGET_MS} ms` +
      (failures ? `\n${failures} of ${runs} calls did not complete` : "")
  );

  // Judged on the first call, not the median: the later calls run against a
  // warmed cache and a sequential scan passes that easily. See the header.
  if (first > BUDGET_MS || failures > 0) {
    console.log(
      `\nOVER BUDGET. If this is a sequential scan, check that the two-stage\n` +
        `candidate selection in trackb7 is deployed — EXPLAIN should show\n` +
        `"Index Scan using legal_embeddings_hnsw", not "Seq Scan".`
    );
    process.exitCode = 1;
  } else if (median > BUDGET_MS) {
    console.log("\nfirst call within budget but the median is not — rerun");
    process.exitCode = 1;
  } else {
    console.log(
      `\nwithin budget on the first call. This does NOT by itself prove the index\n` +
        `is in use — a warm sequential scan also passes. Confirm with the EXPLAIN\n` +
        `in supabase/trackb7_hnsw_two_stage.sql.`
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
