// Coerce an untrusted value to a trimmed non-empty string, or null.
// Used at the LLM-output -> database boundary in /api/case-actions.
export function clean(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}
