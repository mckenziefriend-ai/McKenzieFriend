/**
 * Track B step 1 — ingest legislation.gov.uk provisions with currency data.
 *
 * Standalone: NOT part of the app runtime. Run manually:
 *   npx tsx scripts/ingest-legislation.ts
 *
 * What it does:
 *   1. Verifies each instrument ref actually resolves before relying on it.
 *   2. Fetches each target provision's data.xml (CLML).
 *   3. Parses text + currency signals (captured, never computed).
 *   4. Emits idempotent INSERT SQL to scripts/out/ for the Supabase editor.
 *   5. Asserts the proof expectations and exits non-zero if they don't hold.
 *
 * Deliberately gentle on a public government API: sequential requests, a delay
 * between each, a descriptive User-Agent, and backoff on 429/5xx.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseInstrumentMeta, parseProvision } from "./lib/clml";
import {
  BASE_URL,
  MAX_RETRIES,
  PROOF_EXPECTATIONS,
  REQUEST_DELAY_MS,
  REQUEST_TIMEOUT_MS,
  TARGETS,
  USER_AGENT,
} from "./lib/targets";
import { buildSqlScript, type InstrumentRow, type ProvisionRow } from "./lib/writer";

const scriptDir = dirname(fileURLToPath(import.meta.url));

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string): Promise<string> {
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/xml" },
        signal: controller.signal,
        redirect: "follow",
      });

      if (res.ok) return await res.text();

      // Back off on rate limiting / transient server errors; give up on 4xx.
      if (res.status === 429 || res.status >= 500) {
        lastError = `HTTP ${res.status}`;
        const backoff = REQUEST_DELAY_MS * attempt * 2;
        console.warn(`    ${lastError} — backing off ${backoff}ms (attempt ${attempt}/${MAX_RETRIES})`);
        await sleep(backoff);
        continue;
      }
      throw new Error(`HTTP ${res.status} for ${url}`);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt === MAX_RETRIES) break;
      const backoff = REQUEST_DELAY_MS * attempt * 2;
      console.warn(`    ${lastError} — retrying in ${backoff}ms (attempt ${attempt}/${MAX_RETRIES})`);
      await sleep(backoff);
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(`Failed after ${MAX_RETRIES} attempts (${lastError}): ${url}`);
}

type SummaryRow = {
  legGovRef: string;
  ref: string;
  versionDate: string | null;
  inForce: boolean;
  hasUnapplied: boolean;
  note: string;
};

async function main() {
  console.log("Track B — legislation.gov.uk ingestion (proof run)\n");
  console.log(`User-Agent: ${USER_AGENT}`);
  console.log(`Politeness: sequential, ${REQUEST_DELAY_MS}ms between requests\n`);

  const instrumentRows: InstrumentRow[] = [];
  const provisionRows: ProvisionRow[] = [];
  const summary: SummaryRow[] = [];
  let requestCount = 0;

  for (const target of TARGETS) {
    // --- Step 1: confirm the identifier resolves before relying on it --------
    const instrumentUrl = `${BASE_URL}/${target.legGovRef}`;
    console.log(`Instrument ${target.legGovRef}`);
    if (requestCount > 0) await sleep(REQUEST_DELAY_MS);
    const instrumentXml = await fetchWithRetry(`${instrumentUrl}/data.xml`);
    requestCount++;

    const meta = parseInstrumentMeta(instrumentXml);
    if (!meta.title) throw new Error(`No title returned for ${target.legGovRef}`);
    if (!meta.type) {
      throw new Error(
        `Could not classify ${target.legGovRef} (DocumentMainType=${meta.documentMainType})`
      );
    }

    const titleMatches = meta.title.trim() === target.expectedTitle;
    console.log(`  resolved: "${meta.title}" ${titleMatches ? "(matches expected)" : "(!! EXPECTED: " + target.expectedTitle + ")"}`);
    console.log(`  type: ${meta.type} | up to date to: ${meta.upToDateTo ?? "(none)"}`);
    if (!titleMatches) {
      throw new Error(
        `Title mismatch for ${target.legGovRef}: got "${meta.title}", expected "${target.expectedTitle}"`
      );
    }

    instrumentRows.push({
      title: meta.title,
      type: meta.type,
      jurisdiction: target.jurisdiction,
      legGovRef: target.legGovRef,
      sourceUrl: instrumentUrl,
      upToDateTo: meta.upToDateTo,
    });

    // --- Step 2: each provision --------------------------------------------
    for (const provision of target.provisions) {
      const provisionUrl = `${BASE_URL}/${target.legGovRef}/${provision.ref}`;
      await sleep(REQUEST_DELAY_MS);
      const xml = await fetchWithRetry(`${provisionUrl}/data.xml`);
      requestCount++;

      const parsed = parseProvision(xml, provision.sectionNumber);

      console.log(
        `  ${provision.ref}: "${parsed.heading ?? "(no heading)"}" ` +
          `| ${parsed.content.length} chars | version ${parsed.versionDate ?? "?"} ` +
          `| in force ${parsed.inForce} | unapplied ${parsed.hasUnappliedAmendments}`
      );

      provisionRows.push({
        legGovRef: target.legGovRef,
        ref: provision.ref,
        number: parsed.number,
        heading: parsed.heading,
        content: parsed.content,
        versionDate: parsed.versionDate,
        inForce: parsed.inForce,
        hasUnappliedAmendments: parsed.hasUnappliedAmendments,
        amendmentNote: parsed.amendmentNote,
        sourceUrl: provisionUrl,
        position: provision.position,
      });

      summary.push({
        legGovRef: target.legGovRef,
        ref: provision.ref,
        versionDate: parsed.versionDate,
        inForce: parsed.inForce,
        hasUnapplied: parsed.hasUnappliedAmendments,
        note: parsed.amendmentNote,
      });
    }
    console.log("");
  }

  // --- Step 3: emit SQL -----------------------------------------------------
  const outDir = join(scriptDir, "out");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = join(outDir, `ingest-${stamp}.sql`);
  writeFileSync(outPath, buildSqlScript(instrumentRows, provisionRows), "utf8");

  // --- Step 4: summary ------------------------------------------------------
  console.log("=".repeat(78));
  console.log("SUMMARY");
  console.log("=".repeat(78));
  for (const row of summary) {
    console.log(
      `${row.legGovRef.padEnd(14)} ${row.ref.padEnd(11)} ` +
        `version=${(row.versionDate ?? "?").padEnd(11)} ` +
        `in_force=${String(row.inForce).padEnd(5)} ` +
        `unapplied=${String(row.hasUnapplied).padEnd(5)}`
    );
    console.log(`  note: ${row.note.slice(0, 150)}${row.note.length > 150 ? "…" : ""}`);
  }

  console.log("\n" + "=".repeat(78));
  console.log("PROOF ASSERTIONS");
  console.log("=".repeat(78));

  const failures: string[] = [];
  for (const expected of PROOF_EXPECTATIONS) {
    const actual = provisionRows.find(
      (p) => p.legGovRef === expected.legGovRef && p.ref === expected.ref
    );
    const label = `${expected.legGovRef} ${expected.ref}`;

    if (!actual) {
      failures.push(`${label}: not ingested`);
      continue;
    }

    if (actual.hasUnappliedAmendments !== expected.hasUnappliedAmendments) {
      failures.push(
        `${label}: has_unapplied_amendments = ${actual.hasUnappliedAmendments}, expected ${expected.hasUnappliedAmendments}`
      );
    } else {
      console.log(`  PASS  ${label} has_unapplied_amendments = ${actual.hasUnappliedAmendments}`);
    }

    const noteOk = expected.requireNote
      ? Boolean(actual.amendmentNote && actual.amendmentNote !== "No outstanding effects.")
      : actual.amendmentNote === "No outstanding effects.";
    if (!noteOk) {
      failures.push(`${label}: amendment_note unexpected -> ${JSON.stringify(actual.amendmentNote)}`);
    } else {
      console.log(`  PASS  ${label} amendment_note as expected`);
    }
  }

  for (const inst of instrumentRows) {
    if (!inst.upToDateTo) failures.push(`${inst.legGovRef}: up_to_date_to missing`);
    else console.log(`  PASS  ${inst.legGovRef} up_to_date_to = ${inst.upToDateTo}`);
  }

  console.log("");
  console.log(`SQL written to: ${outPath}`);
  console.log(`Requests made: ${requestCount}`);

  if (failures.length) {
    console.error("\nPROOF FAILED:");
    for (const f of failures) console.error(`  - ${f}`);
    process.exitCode = 1;
    return;
  }

  console.log("\nAll proof assertions passed.");
  console.log("Next: run the migration, then paste the generated SQL into the Supabase SQL editor.");
}

main().catch((error) => {
  console.error("\nIngestion failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
