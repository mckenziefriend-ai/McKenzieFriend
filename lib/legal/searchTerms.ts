// Keep tokens of 2+ chars: dropping <=3 discarded legally-significant terms
// like "CPR" and "FPR" — the exact tokens most likely to find the right rule.
export function buildSearchTerms(message: string): string {
  return message
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 2)
    .slice(0, 14)
    .join(" ");
}
