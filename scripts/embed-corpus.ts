/**
 * Track B — build the semantic index over the legal corpus.
 *
 * Standalone: NOT part of the app runtime. Run manually:
 *   npm run embed:corpus                    embed everything missing/changed
 *   npm run embed:corpus -- --dry-run       report the work without calling OpenAI
 *   npm run embed:corpus -- --limit=50      cap the number of chunks embedded
 *   npm run embed:corpus -- --corpus=provision|guidance
 *
 * Needs BOTH keys, from scripts/.env only (same isolation as ingestion):
 *   OPENAI_API_KEY             to embed
 *   SUPABASE_SERVICE_ROLE_KEY  to write (bypasses RLS — never in the app)
 *
 * Idempotent and resumable: a chunk is re-embedded only when it is missing, its
 * text changed, or the model changed. Re-running after a completed pass costs
 * nothing and calls no API.
 */

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
  createOpenAIEmbeddingProvider,
  type EmbeddingProvider,
} from "../lib/ai/embeddings";
import { checkEnvIgnored, checkKeyNotCommitted } from "./lib/guard";
import {
  guidanceToPending,
  provisionToPending,
  selectWorkToDo,
  toEmbeddingRecord,
  type ExistingEmbedding,
  type PendingEmbedding,
} from "./lib/embedRows";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const limit = Number(argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 0) || 0;
const corpusFilter = argv.find((a) => a.startsWith("--corpus="))?.split("=")[1] ?? null;
const model = argv.find((a) => a.startsWith("--model="))?.split("=")[1] ?? DEFAULT_EMBEDDING_MODEL;

const EMBED_BATCH = 100;
const UPSERT_BATCH = 200;
const PAGE_SIZE = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Reads every row of a table, paging past PostgREST's row cap. */
async function readAll<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  table: string,
  columns: string
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Reading ${table} failed: ${error.message}`);
    if (!data?.length) break;
    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function main() {
  console.log("Track B — semantic index build\n");
  console.log(`Model:  ${model} @ ${EMBEDDING_DIMENSIONS} dims`);
  console.log(`Mode:   ${dryRun ? "dry run (no API calls, no writes)" : "live"}\n`);

  // --- Pre-flight -----------------------------------------------------------
  const { getServiceClient, readScriptEnv, describeKey } = await import("./lib/db");
  const env = readScriptEnv();
  const openaiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (!openaiKey && !dryRun) {
    throw new Error(
      "Missing OPENAI_API_KEY for embedding.\n" +
        "  Add it to scripts/.env (gitignored; see scripts/.env.example).\n" +
        "  Or pass --dry-run to report the work without embedding."
    );
  }

  console.log(`Service role key: ${describeKey(env.serviceRoleKey)}`);
  const findings = [
    ...checkEnvIgnored(repoRoot),
    ...checkKeyNotCommitted(repoRoot, env.serviceRoleKey),
    ...(openaiKey ? checkKeyNotCommitted(repoRoot, openaiKey) : []),
  ];
  if (findings.length) {
    console.error("\nPRE-FLIGHT FAILED — refusing to run:");
    for (const f of findings) console.error(`  [${f.check}] ${f.detail}`);
    process.exitCode = 1;
    return;
  }
  console.log("Pre-flight:       no key found in any tracked file\n");

  const client = getServiceClient();

  // --- Load the corpora -----------------------------------------------------
  console.log("Loading corpus…");

  type ProvisionRow = {
    id: string;
    ref: string;
    heading: string | null;
    content: string;
    content_omitted: boolean;
    legal_instruments: { title: string } | null;
  };
  type GuidanceRow = {
    id: string;
    heading: string | null;
    content: string;
    citation_label: string | null;
    legal_sources: { title: string } | null;
  };

  const pending: PendingEmbedding[] = [];

  if (corpusFilter !== "guidance") {
    const provisions = await readAll<ProvisionRow>(
      client,
      "legal_provisions",
      "id,ref,heading,content,content_omitted,legal_instruments(title)"
    );
    let omitted = 0;
    for (const row of provisions) {
      if (row.content_omitted) omitted++;
      pending.push(
        ...provisionToPending({
          id: row.id,
          ref: row.ref,
          heading: row.heading,
          content: row.content ?? "",
          contentOmitted: Boolean(row.content_omitted),
          instrumentTitle: row.legal_instruments?.title ?? "Legislation",
        })
      );
    }
    console.log(
      `  provisions: ${provisions.length} rows (${omitted} text-omitted, skipped)`
    );
  }

  if (corpusFilter !== "provision") {
    const guidance = await readAll<GuidanceRow>(
      client,
      "legal_chunks",
      "id,heading,content,citation_label,legal_sources(title)"
    );
    for (const row of guidance) {
      pending.push(
        ...guidanceToPending({
          id: row.id,
          heading: row.heading,
          content: row.content ?? "",
          citationLabel: row.citation_label,
          sourceTitle: row.legal_sources?.title ?? "Guidance",
        })
      );
    }
    console.log(`  guidance:   ${guidance.length} chunks`);
  }

  const split = pending.filter((p) => p.subChunkIndex > 0).length;
  console.log(`  → ${pending.length} chunks to index (${split} from split provisions)\n`);

  // --- Work out what actually needs embedding -------------------------------
  const existing = await readAll<ExistingEmbedding>(
    client,
    "legal_embeddings",
    "provision_id,chunk_id,sub_chunk_index,content_hash,embedding_model"
  );
  const { toEmbed, skipped, stale } = selectWorkToDo(pending, existing, model);

  console.log(
    `Already indexed: ${skipped} unchanged, ${stale} changed, ` +
      `${toEmbed.length - stale} never embedded`
  );

  const work = limit > 0 ? toEmbed.slice(0, limit) : toEmbed;
  if (limit > 0 && toEmbed.length > limit) {
    console.log(`Limited to ${limit} chunks this run (--limit).`);
  }

  const estTokens = Math.round(work.reduce((sum, w) => sum + w.content.length, 0) / 4);
  console.log(`To embed now: ${work.length} chunks (~${estTokens.toLocaleString()} tokens)\n`);

  if (!work.length) {
    console.log("Nothing to do — index is up to date.");
    return;
  }

  if (dryRun) {
    console.log("Dry run: stopping before any API call or write.");
    console.log("Sample of what would be embedded:");
    for (const item of work.slice(0, 3)) {
      console.log(`  [${item.corpus} sub=${item.subChunkIndex}] ${item.content.slice(0, 110)}…`);
    }
    return;
  }

  // --- Embed and write ------------------------------------------------------
  const provider: EmbeddingProvider = createOpenAIEmbeddingProvider({
    apiKey: openaiKey,
    model,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  let embedded = 0;
  let written = 0;

  // The two corpora have different partial unique indexes, so they must be
  // upserted with their own conflict targets rather than one guessed target.
  const buffers: Record<"provision" | "guidance", Record<string, unknown>[]> = {
    provision: [],
    guidance: [],
  };
  const conflictTarget = {
    provision: "provision_id,sub_chunk_index,embedding_model",
    guidance: "chunk_id,sub_chunk_index,embedding_model",
  } as const;

  const flush = async (corpus: "provision" | "guidance") => {
    const rows = buffers[corpus];
    if (!rows.length) return;
    const { error } = await client
      .from("legal_embeddings")
      .upsert(rows, { onConflict: conflictTarget[corpus] });
    if (error) {
      throw new Error(`Upsert of ${corpus} rows failed after ${written} written: ${error.message}`);
    }
    written += rows.length;
    rows.length = 0;
  };

  for (let i = 0; i < work.length; i += EMBED_BATCH) {
    const batch = work.slice(i, i + EMBED_BATCH);
    const result = await provider.embed(batch.map((b) => b.content));

    for (const [index, item] of batch.entries()) {
      buffers[item.corpus].push(
        toEmbeddingRecord(item, result.vectors[index], result.model, result.dimensions)
      );
    }
    embedded += batch.length;

    for (const corpus of ["provision", "guidance"] as const) {
      if (buffers[corpus].length >= UPSERT_BATCH) await flush(corpus);
    }
    console.log(`  embedded ${embedded}/${work.length}`);
    if (i + EMBED_BATCH < work.length) await sleep(200);
  }
  await flush("provision");
  await flush("guidance");

  console.log(`\nDone: embedded ${embedded} chunks, wrote ${written} rows.`);
  console.log(`Model recorded on every row: ${provider.model} @ ${provider.dimensions} dims`);
  console.log("\nNext: verify with");
  console.log("  select embedding_model, count(*) from legal_embeddings group by 1;");
}

main().catch((error) => {
  console.error("\nEmbedding failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
