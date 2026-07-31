/**
 * Pre-flight safety checks, run before any database write.
 *
 * The service-role key bypasses RLS, so the expensive mistake is it reaching
 * version control. These checks are cheap and run every time.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export type GuardFinding = { check: string; detail: string };

const MAX_FILE_BYTES = 2_000_000;

/** Text-ish files worth scanning; skips images, XML fixtures, lockfiles. */
function isScannable(path: string): boolean {
  if (/\.(png|jpe?g|gif|webp|ico|pdf|woff2?|ttf|eot|mp4|zip)$/i.test(path)) return false;
  if (/(^|\/)package-lock\.json$/.test(path)) return false;
  if (/(^|\/)scripts\/__fixtures__\//.test(path)) return false;
  return true;
}

function trackedFiles(repoRoot: string): string[] {
  const out = execFileSync("git", ["ls-files", "-z"], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return out.split("\0").filter(Boolean);
}

/**
 * Fails if the configured service-role key appears in any tracked file, or if
 * scripts/.env has somehow become tracked.
 *
 * The key is compared in-process and never passed as a command argument, so it
 * cannot leak via the process table.
 */
export function checkKeyNotCommitted(repoRoot: string, serviceRoleKey: string): GuardFinding[] {
  const findings: GuardFinding[] = [];
  const files = trackedFiles(repoRoot);

  if (files.includes("scripts/.env")) {
    findings.push({
      check: "scripts/.env tracked",
      detail: "scripts/.env is tracked by git. Remove it from the index immediately.",
    });
  }

  if (serviceRoleKey.length >= 12) {
    for (const relative of files) {
      if (!isScannable(relative)) continue;
      const absolute = join(repoRoot, relative);
      try {
        if (statSync(absolute).size > MAX_FILE_BYTES) continue;
        if (readFileSync(absolute, "utf8").includes(serviceRoleKey)) {
          findings.push({
            check: "key in tracked file",
            detail: `The service-role key appears in ${relative}. Rotate it and purge the value.`,
          });
        }
      } catch {
        // Unreadable or binary — nothing to check.
      }
    }
  }

  return findings;
}

/** Confirms git will refuse to add scripts/.env (i.e. .gitignore covers it). */
export function checkEnvIgnored(repoRoot: string): GuardFinding[] {
  try {
    execFileSync("git", ["check-ignore", "-q", "scripts/.env"], { cwd: repoRoot });
    return [];
  } catch {
    return [
      {
        check: "scripts/.env not ignored",
        detail: "scripts/.env is NOT covered by .gitignore. Do not put the key there yet.",
      },
    ];
  }
}
