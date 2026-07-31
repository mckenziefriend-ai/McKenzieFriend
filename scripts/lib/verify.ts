/**
 * Identifier verification.
 *
 * The whitelist refs in drafts/legal-whitelist.md are best-recalled, not
 * machine-verified (see caveat 1 there). Before downloading anything large we
 * confirm each ref resolves AND returns the title we expect.
 *
 * Cost control: legislation.gov.uk ignores HTTP Range on these documents (it
 * returns 200 with the whole body), so instead we stream the response and
 * cancel as soon as <dc:title> has been seen. That transfers ~16 KB per
 * instrument rather than the full document, which for the CPR is 14 MB.
 */

import { BASE_URL, MAX_RETRIES, REQUEST_DELAY_MS, REQUEST_TIMEOUT_MS, USER_AGENT } from "./targets";

/**
 * MISMATCH / NO_TITLE mean the identifier is wrong — the instrument is skipped
 * and listed for correction. UNREACHABLE means the network or the service
 * failed after retries; that is NOT an identifier problem, so the caller must
 * treat it as a run failure rather than quietly ingesting a partial corpus.
 */
export type VerifyVerdict = "EXACT" | "MATCH" | "MISMATCH" | "NO_TITLE" | "UNREACHABLE";

export type VerifyResult = {
  legGovRef: string;
  expectedTitle: string;
  actualTitle: string | null;
  httpStatus: number;
  bytesRead: number;
  verdict: VerifyVerdict;
  error?: string;
};

/** Loose comparison: ignores case, a leading "The", parentheticals, punctuation. */
export function normaliseTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function classify(expected: string, actual: string | null, httpStatus: number): VerifyVerdict {
  // 404/410 mean the ref itself is wrong; anything else non-200 is infrastructure.
  if (httpStatus === 404 || httpStatus === 410) return "NO_TITLE";
  if (httpStatus !== 200) return "UNREACHABLE";
  if (!actual) return "NO_TITLE";
  if (actual === expected) return "EXACT";
  return normaliseTitle(actual) === normaliseTitle(expected) ? "MATCH" : "MISMATCH";
}

/** A verdict good enough to ingest against. */
export function isUsable(verdict: VerifyVerdict): boolean {
  return verdict === "EXACT" || verdict === "MATCH";
}

/** The identifier is genuinely wrong (as opposed to the network failing). */
export function isIdentifierProblem(verdict: VerifyVerdict): boolean {
  return verdict === "MISMATCH" || verdict === "NO_TITLE";
}

const MAX_SCAN_BYTES = 200_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Verifies one identifier, retrying transient failures. A network blip must not
 * be mistaken for a bad identifier — that would silently shrink the corpus.
 */
export async function verifyIdentifier(
  legGovRef: string,
  expectedTitle: string
): Promise<VerifyResult> {
  let last: VerifyResult | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const result = await attemptVerify(legGovRef, expectedTitle);
    if (result.verdict !== "UNREACHABLE") return result;
    last = result;
    if (attempt < MAX_RETRIES) await sleep(REQUEST_DELAY_MS * attempt * 2);
  }

  return last!;
}

async function attemptVerify(
  legGovRef: string,
  expectedTitle: string
): Promise<VerifyResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}/${legGovRef}/data.xml`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/xml" },
      signal: controller.signal,
      redirect: "follow",
    });

    if (!res.ok || !res.body) {
      return {
        legGovRef,
        expectedTitle,
        actualTitle: null,
        httpStatus: res.status,
        bytesRead: 0,
        verdict: classify(expectedTitle, null, res.status),
      };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let bytesRead = 0;
    let actualTitle: string | null = null;

    while (buffer.length < MAX_SCAN_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.length;
      buffer += decoder.decode(value, { stream: true });
      const match = buffer.match(/<dc:title>([^<]*)<\/dc:title>/);
      if (match) {
        actualTitle = match[1].trim();
        break;
      }
    }
    await reader.cancel().catch(() => undefined);

    return {
      legGovRef,
      expectedTitle,
      actualTitle,
      httpStatus: res.status,
      bytesRead,
      verdict: classify(expectedTitle, actualTitle, res.status),
    };
  } catch (error) {
    return {
      legGovRef,
      expectedTitle,
      actualTitle: null,
      httpStatus: 0,
      bytesRead: 0,
      verdict: "UNREACHABLE",
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}
