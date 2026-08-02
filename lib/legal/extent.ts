/**
 * Territorial extent, captured from CLML's RestrictExtent.
 *
 * WHY THIS EXISTS: jurisdiction was captured only per instrument, which is too
 * coarse. The Civil Partnership Act 2004 is 21% of the corpus and 40% of it is
 * Scotland-only or Northern-Ireland-only, so a question about finances on
 * divorce returned N.I. schedules ahead of Matrimonial Causes Act 1973 s.25.
 *
 * This mirrors public.extent_covers_england_wales() in
 * supabase/trackb4_provision_extent.sql. The SQL is the enforcement point; this
 * is the app-side re-check, the same defence-in-depth used for the in-force
 * guarantee.
 */

/**
 * The only components that positively mean "not England & Wales".
 *
 * The test is deliberately framed this way round. Asking "does it contain E or
 * W?" would exclude any extent we do not recognise — including a hypothetical
 * "UK" — which inverts the conservative intent. Asking "is every component
 * known to be outside E&W?" excludes only what we can positively identify as
 * Scotland-only or Northern-Ireland-only.
 *
 * On the real corpus both formulations agree exactly (the eight observed values
 * are E+W, E+W+S, E+W+S+N.I., E+W+N.I., E, W, S, N.I.); they differ only on
 * values we have never seen, where this one fails safe.
 */
const OUTSIDE_ENGLAND_WALES_PARTS = new Set(["S", "N.I.", "NI"]);

/**
 * Does this extent apply in England & Wales?
 *
 * CONSERVATIVE BY DESIGN. Unknown extent returns true: wrongly hiding a real
 * E&W provision is far worse than surfacing an ambiguous one. Only extents
 * wholly outside E&W (S-only, N.I.-only) are excluded.
 *
 * Matches on '+'-separated components rather than substrings, so "N.I." is
 * never judged by whether it happens to contain a particular letter.
 */
export function extentCoversEnglandWales(extent: string | null | undefined): boolean {
  if (extent === null || extent === undefined) return true;
  const trimmed = extent.trim();
  if (!trimmed) return true;

  const parts = trimmed
    .split("+")
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean);
  if (!parts.length) return true;

  // Exclude only when EVERY component is positively outside England & Wales.
  return !parts.every((part) => OUTSIDE_ENGLAND_WALES_PARTS.has(part));
}

/** Human-readable note for extents that are not simply E&W. */
export function describeExtent(extent: string | null | undefined): string | null {
  if (!extent) return null;
  const trimmed = extent.trim();
  if (!trimmed || trimmed === "E+W") return null;
  return `Extends to ${trimmed}`;
}
