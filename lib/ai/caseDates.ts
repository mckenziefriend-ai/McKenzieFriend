/**
 * Date awareness for the case chat.
 *
 * The model has no clock and is poor at date arithmetic, so it was describing
 * hearings that had already happened as if they were still to come. We compute
 * "today" in the court's own timezone — England and Wales, so Europe/London,
 * which handles BST — and label every stored date as past or upcoming here,
 * rather than trusting the model to work it out.
 */

const LONDON_TZ = "Europe/London";

// YYYY-MM-DD in London, used as a day key for arithmetic (en-CA gives ISO order).
const YMD = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: LONDON_TZ,
});

// A human-readable long date in London, e.g. "Monday 10 August 2026".
const LONG = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: LONDON_TZ,
});

/** Today in Europe/London: a YYYY-MM-DD key for arithmetic and a human label. */
export function londonToday(now: Date = new Date()): { key: string; label: string } {
  return { key: YMD.format(now), label: LONG.format(now) };
}

/** Whole days from today's date key to the given instant's London date. */
function daysFromToday(value: Date, todayKey: string): number {
  const whenKey = YMD.format(value);
  const dayMs = 86_400_000;
  return Math.round(
    (Date.parse(`${whenKey}T00:00:00Z`) - Date.parse(`${todayKey}T00:00:00Z`)) / dayMs
  );
}

/**
 * A short past/upcoming tag for a stored date, or "" when there is no usable
 * date. PAST is shouted because a past "next hearing" is usually stale data the
 * user should be prompted to update, not narrated as though it is still to come.
 */
export function relativeDayTag(
  value: string | null | undefined,
  todayKey: string
): string {
  if (!value) return "";
  const when = new Date(value);
  if (Number.isNaN(when.getTime())) return "";
  const diff = daysFromToday(when, todayKey);
  if (diff === 0) return "TODAY";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "PAST — yesterday";
  if (diff > 1) return `upcoming — in ${diff} days`;
  return `PAST — ${Math.abs(diff)} days ago`;
}
