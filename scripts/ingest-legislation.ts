/**
 * Track B — ingest the legislation.gov.uk statute whitelist with currency data.
 *
 * Standalone: NOT part of the app runtime. Run manually:
 *   npm run ingest:legislation -- --writer=sql     emit SQL files (no key needed)
 *   npm run ingest:legislation -- --writer=db      write directly (needs scripts/.env)
 *   npm run ingest:legislation -- --refresh        force re-download
 *   npm run ingest:legislation -- --only=ukpga/1989/41,ukpga/2010/15
 *
 * Pipeline, per instrument:
 *   1. Verify the identifier resolves and the title matches — BEFORE
 *      downloading anything large. Mismatches are skipped, never ingested.
 *   2. Fetch the whole instrument in ONE request (cached on disk).
 *   3. Enumerate every section and schedule paragraph.
 *   4. Capture currency per provision (never computed).
 *   5. Persist via the selected writer.
 *
 * Reports per instrument: counts, currency breakdown, unknown CLML tags,
 * text-quality checks, and anything anomalous.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildAmendmentNote,
  createDiagnostics,
  effectAffectsProvision,
  enumerateProvisions,
  parseInstrumentMeta,
  parseUnappliedEffects,
  provisionLabel,
} from "./lib/clml";
import {
  BASE_URL,
  DB_BATCH_SIZE,
  MAX_RETRIES,
  PROOF_EXPECTATIONS,
  REQUEST_DELAY_MS,
  REQUEST_TIMEOUT_MS,
  SHORTFALL_WARN_RATIO,
  SQL_CHUNK_SIZE,
  TARGETS,
  USER_AGENT,
} from "./lib/targets";
import { isIdentifierProblem, isUsable, verifyIdentifier, type VerifyResult } from "./lib/verify";
import {
  buildSqlChunks,
  writeToDatabase,
  type InstrumentRow,
  type ProvisionRow,
  type UpsertClient,
} from "./lib/writer";
import { checkEnvIgnored, checkKeyNotCommitted } from "./lib/guard";
import { extentCoversEnglandWales } from "../lib/legal/extent";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(scriptDir);
const cacheDir = join(scriptDir, ".cache");
const outDir = join(scriptDir, "out");

const argv = process.argv.slice(2);
const refresh = argv.includes("--refresh");
const writerMode = (argv.find((a) => a.startsWith("--writer="))?.split("=")[1] ?? "db") as
  | "db"
  | "sql";
const onlyList = argv.find((a) => a.startsWith("--only="))?.split("=")[1]?.split(",") ?? null;

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
        console.warn(`    ${lastError} — backing off ${backoff}ms (${attempt}/${MAX_RETRIES})`);
        await sleep(backoff);
        continue;
      }
      throw new Error(`HTTP ${res.status} for ${url}`);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt === MAX_RETRIES) break;
      const backoff = REQUEST_DELAY_MS * attempt * 2;
      console.warn(`    ${lastError} — retrying in ${backoff}ms (${attempt}/${MAX_RETRIES})`);
      await sleep(backoff);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`Failed after ${MAX_RETRIES} attempts (${lastError}): ${url}`);
}

async function getInstrumentXml(
  legGovRef: string,
  budget: { requests: number }
): Promise<{ xml: string; cached: boolean }> {
  mkdirSync(cacheDir, { recursive: true });
  const cachePath = join(cacheDir, `${legGovRef.replace(/\//g, "-")}.data.xml`);

  if (!refresh && existsSync(cachePath)) {
    return { xml: readFileSync(cachePath, "utf8"), cached: true };
  }

  if (budget.requests > 0) await sleep(REQUEST_DELAY_MS);
  const xml = await fetchWithRetry(`${BASE_URL}/${legGovRef}/data.xml`);
  budget.requests++;
  writeFileSync(cachePath, xml, "utf8");
  return { xml, cached: false };
}

type InstrumentReport = {
  legGovRef: string;
  title: string;
  area: string;
  upToDateTo: string | null;
  declared: number;
  ownProvisions: number;
  enumerated: number;
  sections: number;
  scheduleParas: number;
  /** Procedure rules — the FPR and CPR have these where an Act has sections. */
  rules: number;
  otherRefs: number;
  repealed: number;
  prospective: number;
  contentOmitted: number;
  notInForce: number;
  outsideEnglandWales: number;
  extentCounts: Map<string, number>;
  unapplied: number;
  unknownTags: Map<string, number>;
  jammed: number;
  megabytes: number;
  flags: string[];
};

const LINE_START_JAM = /^[ \t]*\([0-9A-Za-z]{1,4}\)[A-Za-z]/m;

async function main() {
  console.log("Track B — statute whitelist ingestion\n");
  console.log(`Writer:     ${writerMode}`);
  console.log(`User-Agent: ${USER_AGENT}`);
  console.log(`Mode:       ${refresh ? "refresh (re-download)" : "cache-first"}\n`);

  const targets = onlyList
    ? TARGETS.filter((t) => onlyList.includes(t.legGovRef))
    : TARGETS;
  if (!targets.length) throw new Error("No targets selected.");

  // --- Pre-flight: never let the service-role key reach version control -----
  let dbClient: UpsertClient | null = null;
  if (writerMode === "db") {
    const { getServiceClient, readScriptEnv, describeKey } = await import("./lib/db");
    const env = readScriptEnv();
    console.log(`Service role key: ${describeKey(env.serviceRoleKey)}`);

    const findings = [
      ...checkEnvIgnored(repoRoot),
      ...checkKeyNotCommitted(repoRoot, env.serviceRoleKey),
    ];
    if (findings.length) {
      console.error("\nPRE-FLIGHT FAILED — refusing to run:");
      for (const f of findings) console.error(`  [${f.check}] ${f.detail}`);
      process.exitCode = 1;
      return;
    }
    console.log("Pre-flight:       key is not in any tracked file, scripts/.env is ignored\n");
    dbClient = getServiceClient() as unknown as UpsertClient;
  } else {
    console.log("No service-role key required in --writer=sql mode.\n");
  }

  // --- Step 1: verify every identifier before downloading anything ----------
  console.log("=".repeat(96));
  console.log("IDENTIFIER VERIFICATION");
  console.log("=".repeat(96));

  const verifications: VerifyResult[] = [];
  for (const [index, target] of targets.entries()) {
    if (index > 0) await sleep(REQUEST_DELAY_MS);
    const result = await verifyIdentifier(target.legGovRef, target.expectedTitle);
    verifications.push(result);
    const note = isUsable(result.verdict)
      ? result.actualTitle
      : `${result.actualTitle ?? result.error ?? "-"}  (expected "${target.expectedTitle}")`;
    console.log(
      `  ${result.verdict.padEnd(9)} ${target.legGovRef.padEnd(15)} ` +
        `HTTP ${String(result.httpStatus).padEnd(4)} ${(result.bytesRead / 1024).toFixed(0).padStart(4)}KB  ${note}`
    );
  }

  const usable = targets.filter((t) =>
    isUsable(verifications.find((v) => v.legGovRef === t.legGovRef)!.verdict)
  );
  const badIdentifiers = verifications.filter((v) => isIdentifierProblem(v.verdict));
  const unreachable = verifications.filter((v) => v.verdict === "UNREACHABLE");

  console.log(`\n  ${usable.length}/${targets.length} identifiers usable.`);
  if (badIdentifiers.length) {
    console.log("  NOT INGESTED (identifier needs correcting):");
    for (const r of badIdentifiers) {
      console.log(`    ${r.legGovRef}  ${r.verdict}  got="${r.actualTitle ?? "-"}"  expected="${r.expectedTitle}"`);
    }
  }
  if (unreachable.length) {
    // A network failure is not an identifier problem. Ingesting the rest and
    // reporting success would quietly ship an incomplete corpus.
    console.error("\n  UNREACHABLE after retries — aborting rather than ingesting a partial corpus:");
    for (const r of unreachable) {
      console.error(`    ${r.legGovRef}  ${r.error ?? `HTTP ${r.httpStatus}`}`);
    }
    console.error("  Re-run when the network/service is available.");
    process.exitCode = 1;
    return;
  }

  // --- Step 2: ingest each verified instrument ------------------------------
  console.log("\n" + "=".repeat(96));
  console.log("INGESTION");
  console.log("=".repeat(96));

  const instrumentRows: InstrumentRow[] = [];
  const provisionRows: ProvisionRow[] = [];
  const reports: InstrumentReport[] = [];
  const budget = { requests: 0 };
  const prospectiveFound: { legGovRef: string; ref: string; inForce: boolean }[] = [];

  for (const target of usable) {
    const { xml, cached } = await getInstrumentXml(target.legGovRef, budget);
    const meta = parseInstrumentMeta(xml);

    if (!meta.title || !meta.type) {
      console.log(`  ${target.legGovRef}: FAILED to parse metadata — skipped`);
      continue;
    }

    const declared = Number(xml.match(/<Legislation[^>]*NumberOfProvisions="(\d+)"/)?.[1] ?? 0);
    // NumberOfProvisions counts every <P1>, including those inside
    // <BlockAmendment> — quoted text of amendments to OTHER instruments, which
    // are deliberately not ingested as provisions of this one. The meaningful
    // baseline is P1 elements that carry a DocumentURI of their own.
    const ownProvisions = (xml.match(/<[\w:]*P1\s[^>]*DocumentURI/g) ?? []).length;
    const diagnostics = createDiagnostics();
    const provisions = enumerateProvisions(xml, target.legGovRef, diagnostics);
    const pendingEffects = parseUnappliedEffects(xml).filter((e) => e.requiresApplied);

    instrumentRows.push({
      title: meta.title,
      type: meta.type,
      jurisdiction: target.jurisdiction,
      legGovRef: target.legGovRef,
      sourceUrl: `${BASE_URL}/${target.legGovRef}`,
      upToDateTo: meta.upToDateTo,
    });

    const report: InstrumentReport = {
      legGovRef: target.legGovRef,
      title: meta.title,
      area: target.area,
      upToDateTo: meta.upToDateTo,
      declared,
      ownProvisions,
      enumerated: provisions.length,
      sections: 0,
      scheduleParas: 0,
      rules: 0,
      otherRefs: 0,
      repealed: 0,
      prospective: 0,
      contentOmitted: 0,
      notInForce: 0,
      outsideEnglandWales: 0,
      extentCounts: new Map<string, number>(),
      unapplied: 0,
      unknownTags: diagnostics.unknownTags,
      jammed: 0,
      megabytes: xml.length / 1e6,
      flags: [],
    };

    for (const provision of provisions) {
      const matched = pendingEffects.filter((e) => effectAffectsProvision(e, provision.id));

      provisionRows.push({
        legGovRef: target.legGovRef,
        ref: provision.ref,
        number: provision.number,
        heading: provision.heading,
        content: provision.content,
        versionDate: provision.versionDate,
        inForce: provision.inForce,
        status: provision.status,
        extent: provision.extent,
        contentOmitted: provision.contentOmitted,
        hasUnappliedAmendments: matched.length > 0,
        amendmentNote: buildAmendmentNote(matched, provisionLabel(provision.ref)),
        sourceUrl: `${BASE_URL}/${target.legGovRef}/${provision.ref}`,
        position: provision.position,
        partLabel: provision.partLabel,
      });

      if (provision.ref.startsWith("section")) report.sections++;
      else if (provision.ref.startsWith("schedule")) report.scheduleParas++;
      else if (provision.ref.startsWith("rule")) report.rules++;
      else report.otherRefs++;

      if (provision.status === "Repealed") report.repealed++;
      if (provision.status === "Prospective") {
        report.prospective++;
        prospectiveFound.push({
          legGovRef: target.legGovRef,
          ref: provision.ref,
          inForce: provision.inForce,
        });
      }
      if (provision.contentOmitted) report.contentOmitted++;
      if (!extentCoversEnglandWales(provision.extent)) report.outsideEnglandWales++;
      report.extentCounts.set(
        provision.extent ?? "(none)",
        (report.extentCounts.get(provision.extent ?? "(none)") ?? 0) + 1
      );
      if (!provision.inForce) report.notInForce++;
      if (matched.length) report.unapplied++;
      if (LINE_START_JAM.test(provision.content)) report.jammed++;
    }

    // Anomaly flags
    if (provisions.length === 0) report.flags.push("ZERO PROVISIONS");
    if (ownProvisions > 0 && provisions.length < ownProvisions * (1 - SHORTFALL_WARN_RATIO)) {
      report.flags.push(`SHORTFALL ${provisions.length}/${ownProvisions} own provisions`);
    }
    if (report.jammed) report.flags.push(`JAMMED x${report.jammed}`);
    if (diagnostics.unknownTags.size) {
      report.flags.push(`UNKNOWN TAGS: ${[...diagnostics.unknownTags.keys()].join(",")}`);
    }

    reports.push(report);
    console.log(
      `  ${target.legGovRef.padEnd(15)} ${String(provisions.length).padStart(5)} provisions ` +
        `${cached ? "(cached)" : `(${report.megabytes.toFixed(1)}MB fetched)`}` +
        `${report.flags.length ? "  << " + report.flags.join("; ") : ""}`
    );
  }

  // --- Step 3: persist ------------------------------------------------------
  console.log("\n" + "=".repeat(96));
  console.log(`PERSISTENCE (--writer=${writerMode})`);
  console.log("=".repeat(96));

  if (writerMode === "db" && dbClient) {
    const result = await writeToDatabase(
      dbClient,
      instrumentRows,
      provisionRows,
      DB_BATCH_SIZE,
      (written, total) => {
        if (written % (DB_BATCH_SIZE * 4) === 0 || written === total) {
          console.log(`  upserted ${written}/${total} provisions`);
        }
      }
    );
    console.log(
      `  wrote ${result.instrumentsWritten} instruments, ${result.provisionsWritten} provisions`
    );
  } else {
    mkdirSync(outDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const chunks = buildSqlChunks(instrumentRows, provisionRows, stamp, SQL_CHUNK_SIZE);
    let bytes = 0;
    for (const chunk of chunks) {
      writeFileSync(join(outDir, chunk.filename), chunk.sql, "utf8");
      bytes += Buffer.byteLength(chunk.sql, "utf8");
    }
    console.log(`  ${chunks.length} SQL files written to scripts/out/ (${(bytes / 1e6).toFixed(1)} MB total)`);
    console.log(`  run them in order, starting with ${chunks[0].filename}`);
  }

  // --- Step 4: per-instrument report ---------------------------------------
  console.log("\n" + "=".repeat(96));
  console.log("PER-INSTRUMENT REPORT");
  console.log("=".repeat(96));
  console.log(
    "ref              enum/own/decl    sec  sched  rules | notInForce (rep/prosp/omit) unapp | non-E&W | unknown | flags"
  );
  console.log("-".repeat(96));
  for (const r of reports) {
    console.log(
      `${r.legGovRef.padEnd(15)} ${String(r.enumerated).padStart(4)}/${String(r.ownProvisions).padStart(4)}/${String(r.declared).padEnd(5)} ` +
        `${String(r.sections).padStart(4)} ${String(r.scheduleParas).padStart(6)} ${String(r.rules).padStart(6)} | ` +
        `${String(r.notInForce).padStart(10)} (${r.repealed}/${r.prospective}/${r.contentOmitted})`.padEnd(28) +
        `${String(r.outsideEnglandWales).padStart(7)} |` +
        `${String(r.unapplied).padStart(5)} | ${String(r.unknownTags.size).padStart(7)} | ${r.flags.join("; ") || "ok"}`
    );
  }

  const totals = reports.reduce(
    (acc, r) => ({
      enumerated: acc.enumerated + r.enumerated,
      declared: acc.declared + r.declared,
      notInForce: acc.notInForce + r.notInForce,
      repealed: acc.repealed + r.repealed,
      prospective: acc.prospective + r.prospective,
      contentOmitted: acc.contentOmitted + r.contentOmitted,
      unapplied: acc.unapplied + r.unapplied,
      jammed: acc.jammed + r.jammed,
    }),
    { enumerated: 0, declared: 0, notInForce: 0, repealed: 0, prospective: 0, contentOmitted: 0, unapplied: 0, jammed: 0 }
  );
  console.log("-".repeat(96));
  console.log(
    `TOTAL           ${totals.enumerated}/${totals.declared}   notInForce=${totals.notInForce} ` +
      `(repealed ${totals.repealed} / prospective ${totals.prospective} / omitted ${totals.contentOmitted})  ` +
      `unapplied=${totals.unapplied}  jammed=${totals.jammed}`
  );

  const allUnknown = new Map<string, number>();
  for (const r of reports) {
    for (const [tag, count] of r.unknownTags) {
      allUnknown.set(tag, (allUnknown.get(tag) ?? 0) + count);
    }
  }
  // Extent distribution — lets a human sanity-check the capture on real data.
  const extentTotals = new Map<string, number>();
  for (const r of reports) {
    for (const [extent, count] of r.extentCounts) {
      extentTotals.set(extent, (extentTotals.get(extent) ?? 0) + count);
    }
  }
  const outsideTotal = reports.reduce((sum, r) => sum + r.outsideEnglandWales, 0);
  console.log("\nTerritorial extent distribution (captured verbatim from RestrictExtent):");
  for (const [extent, count] of [...extentTotals].sort((a, b) => b[1] - a[1])) {
    const applies = extentCoversEnglandWales(extent === "(none)" ? null : extent);
    console.log(
      `  ${extent.padEnd(14)} ${String(count).padStart(5)}  ${applies ? "applies in E&W" : "EXCLUDED (outside E&W)"}`
    );
  }
  console.log(
    `  -> ${outsideTotal} of ${totals.enumerated} provisions ` +
      `(${((outsideTotal / Math.max(1, totals.enumerated)) * 100).toFixed(1)}%) do not extend to England & Wales`
  );

  console.log("\nUnknown CLML tags across all instruments:");
  if (!allUnknown.size) console.log("  none — every construct encountered was recognised");
  else {
    for (const [tag, count] of [...allUnknown].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${tag} x${count}`);
    }
  }

  console.log("\nProspective provisions (closes the untested in_force=false branch):");
  if (!prospectiveFound.length) {
    console.log(`  NONE found across ${totals.enumerated} provisions — path still unexercised.`);
  } else {
    for (const p of prospectiveFound.slice(0, 10)) {
      console.log(`  ${p.legGovRef} ${p.ref}  in_force=${p.inForce}`);
    }
    console.log(`  total: ${prospectiveFound.length}`);
  }

  // --- Step 5: proof assertions --------------------------------------------
  console.log("\n" + "=".repeat(96));
  console.log("PROOF ASSERTIONS");
  console.log("=".repeat(96));

  const failures: string[] = [];
  for (const expected of PROOF_EXPECTATIONS) {
    const actual = provisionRows.find(
      (p) => p.legGovRef === expected.legGovRef && p.ref === expected.ref
    );
    const label = `${expected.legGovRef} ${expected.ref}`;
    if (!actual) {
      if (onlyList) continue; // not selected this run
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
  }

  if (totals.jammed) failures.push(`${totals.jammed} provisions contain line-start marker jamming`);
  else console.log(`  PASS  no line-start marker jamming across ${totals.enumerated} provisions`);

  const emptyInForce = provisionRows.filter((p) => p.contentOmitted && p.inForce);
  if (emptyInForce.length) {
    failures.push(`${emptyInForce.length} provisions have no text but are marked in force`);
  } else {
    console.log(`  PASS  all ${totals.contentOmitted} text-omitted provisions marked not in force`);
  }

  const zeroProvision = reports.filter((r) => r.enumerated === 0);
  if (zeroProvision.length) {
    failures.push(`${zeroProvision.length} instrument(s) produced zero provisions`);
  } else {
    console.log(`  PASS  every instrument produced provisions`);
  }

  console.log(`\nRequests made: ${budget.requests} (${usable.length} instruments, cache-first)`);

  if (badIdentifiers.length) {
    console.log(
      `\nNOTE: ${badIdentifiers.length} instrument(s) skipped — identifier needs correcting.`
    );
  }

  if (failures.length) {
    console.error("\nPROOF FAILED:");
    for (const f of failures) console.error(`  - ${f}`);
    process.exitCode = 1;
    return;
  }
  console.log("\nAll proof assertions passed.");
}

main().catch((error) => {
  console.error("\nIngestion failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
