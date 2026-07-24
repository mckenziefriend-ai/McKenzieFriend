import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "case-documents";
const PAGE_SIZE = 100;

async function listAllPaths(
  supabase: SupabaseClient,
  prefix: string
): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: PAGE_SIZE, offset });

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const entry of data) {
      // Entries without an id are folders; recurse into them.
      if (entry.id === null) {
        paths.push(...(await listAllPaths(supabase, `${prefix}/${entry.name}`)));
      } else {
        paths.push(`${prefix}/${entry.name}`);
      }
    }

    if (data.length < PAGE_SIZE) break;
    offset += data.length;
  }

  return paths;
}

async function cleanupOnce(supabase: SupabaseClient, prefix: string) {
  const paths = await listAllPaths(supabase, prefix);
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) throw Object.assign(error, { orphanedPaths: paths });
}

// Removes every storage object under `prefix/`. Retries once on failure,
// then logs and returns rather than throwing: a transient storage error
// must never permanently block a user from deleting their data. Orphaned
// paths are logged server-side for manual reconciliation.
export async function removeStorageUnderPrefix(
  supabase: SupabaseClient,
  prefix: string
): Promise<{ ok: boolean }> {
  try {
    await cleanupOnce(supabase, prefix);
    return { ok: true };
  } catch (firstError) {
    try {
      await cleanupOnce(supabase, prefix);
      return { ok: true };
    } catch (secondError) {
      console.error(
        `Storage cleanup failed twice for prefix "${prefix}"; objects may be orphaned.`,
        firstError,
        secondError
      );
      return { ok: false };
    }
  }
}
