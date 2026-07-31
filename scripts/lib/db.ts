/**
 * Service-role database access for the ingestion script.
 *
 * ============================ SECURITY ============================
 * SUPABASE_SERVICE_ROLE_KEY bypasses Row Level Security completely. Treat it
 * as maximally sensitive:
 *
 *   - It lives ONLY in scripts/.env, which git refuses to add (.gitignore
 *     ".env*"). Verified with `git add --dry-run scripts/.env`.
 *   - It must NEVER appear in the app, in Vercel, in any committed file, or
 *     in a pull request.
 *   - Nothing here logs, prints or echoes the key. Errors report only whether
 *     a variable was present, never its value.
 *
 * scripts/.env.example documents the variable names with empty values and IS
 * committed. The real file is populated by the operator.
 * ==================================================================
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const scriptsDir = dirname(dirname(fileURLToPath(import.meta.url)));
export const ENV_PATH = join(scriptsDir, ".env");

export type ScriptEnv = {
  supabaseUrl: string;
  serviceRoleKey: string;
};

let loaded = false;

/** Loads scripts/.env into process.env once, using Node's built-in loader. */
export function loadScriptEnv(): void {
  if (loaded) return;
  if (existsSync(ENV_PATH)) {
    // Node >= 20.12 / 21.7. Avoids a dotenv dependency.
    process.loadEnvFile(ENV_PATH);
  }
  loaded = true;
}

/**
 * Reads the required variables. Throws a message that names the missing
 * variables but never reveals any value.
 */
export function readScriptEnv(): ScriptEnv {
  loadScriptEnv();

  const supabaseUrl = process.env.SUPABASE_URL?.trim() ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

  const missing: string[] = [];
  if (!supabaseUrl) missing.push("SUPABASE_URL");
  if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length) {
    throw new Error(
      `Missing ${missing.join(" and ")} for --writer=db.\n` +
        `  Populate ${ENV_PATH} (gitignored; see scripts/.env.example).\n` +
        `  Or re-run with --writer=sql to emit SQL files instead and avoid the key entirely.`
    );
  }

  return { supabaseUrl, serviceRoleKey };
}

/**
 * Safe-to-print description. Deliberately reveals no part of the key — not
 * even a suffix — since logs travel further than people expect.
 */
export function describeKey(key: string): string {
  return `configured (${key.length} chars, not shown)`;
}

let client: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (client) return client;
  const { supabaseUrl, serviceRoleKey } = readScriptEnv();
  client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
