/**
 * Track B — ingest legislation.gov.uk instruments with currency data.
 *
 * Standalone: NOT part of the app runtime. Run manually:
 *   npm run ingest:legislation            (uses the on-disk cache if present)
 *   npm run ingest:legislation -- --refresh   (force re-download)
 *
 * What it does, per instrument:
 *   1. Fetches the WHOLE instrument's data.xml in ONE request (~5 MB), rather
 *      than one request per provision (~600 against a free public service).
 *   2. Verifies the returned title matches what we expected before storing.
 *   3. Enumerates every section and schedule paragraph from that document.
 *   4. Captures currency per provision (never computes it).
 *   5. Emits idempotent INSERT SQL in numbered chunks for the Supabase editor.
 *   6. Asserts the proof expectations and exits non-zero if they don't hold.
 *
 * Resumable: downloaded XML is cached under scripts/.cache/, so re-runs make
 * zero network requests unless --refresh is passed.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildAmendmentNote,
  effectAffectsProvision,
  enumerateProvisions,
  parseInstrumentMeta,
  parseUnappliedEffects,
  provisionLabel,
} from "./lib/clml";
import {
  BASE_URL,
  MAX_RETRIES,
  PROOF_EXPECTATIONS,
  REQUEST_DELAY_MS,
  REQUEST_TIMEOUT_MS,
  SQL_CHUNK_SIZE,
  TARGETS,
  USER_AGENT,
} from "./lib/targets";
import { buildSqlChunks, type InstrumentRow, type ProvisionRow } from "./lib/writer";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(scriptDir, ".cache");
const outDir = join(scriptDir, "out");
const refresh = process.argv.includes("--refresh");

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

/** Fetch-with-cache so re-runs cost the API nothing. */
async function getInstrumentXml(
  legGovRef: string,
  requestBudget: { made: number }
): Promise<string> {
  mkdirSync(cacheDir, { recursive: true });
  const cachePath = join(cacheDir, `${legGovRef.replace(/\//g, "-")}.data.xml`);

  if (!refresh && existsSync(cachePath)) {
    const cached = readFileSync(cachePath, "utf8");
    console.log(`  cache hit (${(cached.length / 1e6).toFixed(1)} MB) — no request made`);
    return cached;
  }

  if (requestBudget.made > 0) await sleep(REQUEST_DELAY_MS);
  const url = `${BASE_URL}/${legGovRef}/data.xml`;
  const started = Date.now();
  const xml = await fetchWithRetry(url);
  requestBudget.made++;
  console.log(
    `  fetched ${(xml.length / 1e6).toFixed(1)} MB in ${Date.now() - started}ms (1 request)`
  );
  writeFileSync(cachePath, xml, "utf8");
  return xml;
}

async function main() {
  console.log("Track B — legislation.gov.uk whole-instrument ingestion\n");
  console.log(`User-Agent: ${USER_AGENT}`);
  console.log(`Mode: ${refresh ? "refresh (re-download)" : "cache-first"}\n`);

  const instrumentRows: InstrumentRow[] = [];
  const provisionRows: ProvisionRow[] = [];
  const budget = { made: 0 };
  const perInstrument: { ref: string; sections: number; schedules: number; repealed: number }[] = [];

  for (const target of TARGETS) {
    console.log(`Instrument ${target.legGovRef}`);
    const xml = await getInstrumentXml(target.legGovRef, budget);

    const meta = parseInstrumentMeta(xml);
    if (!meta.title) throw new Error(`No title returned for ${target.legGovRef}`);
    if (!meta.type) {
      throw new Error(
        `Could not classify ${target.legGovRef} (DocumentMainType=${meta.documentMainType})`
      );
    }
    if (meta.title.trim() !== target.expectedTitle) {
      throw new Error(
        `Title mismatch for ${target.legGovRef}: got "${meta.title}", expected "${target.expectedTitle}"`
      );
    }
    console.log(`  "${meta.title}" | type=${meta.type} | up to date to ${meta.upToDateTo ?? "(none)"}`);

    instrumentRows.push({
      title: meta.title,
      type: meta.type,
      jurisdiction: target.jurisdiction,
      legGovRef: target.legGovRef,
      sourceUrl: `${BASE_URL}/${target.legGovRef}`,
      upToDateTo: meta.upToDateTo,
    });

    // Currency: parse the effects block once per instrument, then scope per provision.
    const pendingEffects = parseUnappliedEffects(xml).filter((e) => e.requiresApplied);
    const provisions = enumerateProvisions(xml, target.legGovRef);

    let sections = 0;
    let schedules = 0;
    let repealed = 0;

    for (const provision of provisions) {
      const matched = pendingEffects.filter((effect) =>
        effectAffectsProvision(effect, provision.id)
      );
      const label = provisionLabel(provision.ref);

      provisionRows.push({
        legGovRef: target.legGovRef,
        ref: provision.ref,
        number: provision.number,
        heading: provision.heading,
        content: provision.content,
        versionDate: provision.versionDate,
        inForce: provision.inForce,
        status: provision.status,
        contentOmitted: provision.contentOmitted,
        hasUnappliedAmendments: matched.length > 0,
        amendmentNote: buildAmendmentNote(matched, label),
        sourceUrl: `${BASE_URL}/${target.legGovRef}/${provision.ref}`,
        position: provision.position,
      });

      if (provision.ref.startsWith("section")) sections++;
      else if (provision.ref.startsWith("schedule")) schedules++;
      if (provision.status === "Repealed") repealed++;
    }

    console.log(
      `  enumerated ${provisions.length} provisions ` +
        `(${sections} sections, ${schedules} schedule paragraphs; ${repealed} repealed)`
    );
    perInstrument.push({ ref: target.legGovRef, sections, schedules, repealed });
    console.log("");
  }

  // --- Emit chunked SQL ------------------------------------------------------
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const chunks = buildSqlChunks(instrumentRows, provisionRows, stamp, SQL_CHUNK_SIZE);
  for (const chunk of chunks) {
    writeFileSync(join(outDir, chunk.filename), chunk.sql, "utf8");
  }

  // --- Summary ---------------------------------------------------------------
  console.log("=".repeat(78));
  console.log("SUMMARY");
  console.log("=".repeat(78));
  for (const row of perInstrument) {
    console.log(
      `${row.ref.padEnd(16)} sections=${String(row.sections).padEnd(5)} ` +
        `scheduleParas=${String(row.schedules).padEnd(5)} repealed=${row.repealed}`
    );
  }
  console.log(`TOTAL provisions:  ${provisionRows.length}`);
  console.log(`in_force=false:    ${provisionRows.filter((p) => !p.inForce).length}`);
  console.log(`  status=Repealed: ${provisionRows.filter((p) => p.status === "Repealed").length}`);
  console.log(`  content omitted: ${provisionRows.filter((p) => p.contentOmitted).length}`);
  console.log(`unapplied:         ${provisionRows.filter((p) => p.hasUnappliedAmendments).length}`);

  console.log("\nSQL files (run in this order):");
  for (const chunk of chunks) {
    const kb = (Buffer.byteLength(chunk.sql, "utf8") / 1024).toFixed(0);
    console.log(`  ${chunk.filename}  (${kb} KB)`);
  }

  // --- Proof assertions ------------------------------------------------------
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

  // Text-quality gate: the marker-jamming regression must not come back.
  //
  // Scoped to line-start markers, which is the signature of OUR bug (a Pnumber
  // glued to its text). Mid-sentence cases like "(e)or (f)" are faithful: the
  // source XML genuinely has no space there (".. (1)<Emphasis>(d), (e)</Emphasis>or ..").
  // Inserting spaces would alter statutory text, so we reproduce it verbatim.
  const markerJamPattern = /^[ \t]*\([0-9A-Za-z]{1,4}\)[A-Za-z]/m;
  const badMarkers = provisionRows.filter((p) => markerJamPattern.test(p.content));
  if (badMarkers.length) {
    failures.push(
      `${badMarkers.length} provision(s) contain jammed markers, e.g. ${badMarkers[0].ref}`
    );
  } else {
    console.log(`  PASS  no jammed line-start markers across ${provisionRows.length} provisions`);
  }

  // The Repealed branch of in_force must be exercised by real data.
  const repealedCount = provisionRows.filter((p) => p.status === "Repealed").length;
  if (repealedCount === 0) {
    failures.push("no Repealed provisions found — in_force=false path unexercised");
  } else {
    console.log(`  PASS  in_force=false exercised by ${repealedCount} Repealed provisions`);
  }

  // Nothing may be reported as in force while carrying no operative text.
  const emptyButInForce = provisionRows.filter((p) => p.contentOmitted && p.inForce);
  if (emptyButInForce.length) {
    failures.push(
      `${emptyButInForce.length} provision(s) have no text but are marked in force, ` +
        `e.g. ${emptyButInForce[0].ref}`
    );
  } else {
    const omitted = provisionRows.filter((p) => p.contentOmitted).length;
    console.log(`  PASS  ${omitted} text-omitted provisions all marked not in force`);
  }

  // The omitted-text case must never fabricate a captured status. Where CLML
  // stated no Status, status stays null and content_omitted carries the signal.
  const unmarkedOmitted = provisionRows.filter((p) => p.contentOmitted && p.status === null);
  console.log(
    `  INFO  ${unmarkedOmitted.length} provisions have no text and no CLML status ` +
      `(flagged via content_omitted, status left null)`
  );

  console.log(`\nRequests made: ${budget.made}${refresh ? "" : " (cache-first)"}`);

  if (failures.length) {
    console.error("\nPROOF FAILED:");
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log("\nAll proof assertions passed.");
  console.log("Next: run the two migrations, then the SQL files above in order.");
}

main().catch((error) => {
  console.error("\nIngestion failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
