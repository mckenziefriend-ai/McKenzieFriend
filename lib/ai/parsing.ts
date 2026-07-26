import { ACTION_TYPES, type ProposedAction } from "@/lib/ai/actions";

// Defensive parsing of LLM JSON output. The model is asked for
// {answer, action} JSON but empirically returns code fences, brace-wrapped
// text, or leaks the action object into the answer string — safeJson and
// cleanVisibleAnswer handle that ladder of real observed failures.

export function safeJson(text: string): { answer: unknown; action: unknown } {
  const raw = String(text || "").trim();

  try {
    return JSON.parse(raw);
  } catch {}

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      return JSON.parse(raw.slice(firstBrace, lastBrace + 1));
    } catch {}
  }

  const answerMatch = raw.match(/"answer"\s*:\s*"([\s\S]*?)"\s*,\s*"action"/);
  if (answerMatch?.[1]) {
    try {
      return { answer: JSON.parse(`"${answerMatch[1]}"`), action: null };
    } catch {
      return { answer: answerMatch[1], action: null };
    }
  }

  return { answer: raw, action: null };
}

export function cleanVisibleAnswer(value: unknown): string {
  let text = String(value || "").trim();
  text = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();

  const leakPatterns = [
    /,?\s*"action"\s*:\s*\{[\s\S]*$/i,
    /,?\s*action\s*:\s*\{[\s\S]*$/i,
    /,?\s*\{\s*"type"\s*:\s*"create_[\s\S]*$/i,
  ];

  for (const pattern of leakPatterns) {
    text = text.replace(pattern, "").trim();
  }

  text = text.replace(/^["']|["']$/g, "").trim();
  return text;
}

export function makeActionLabel(type: string): string {
  if (type === "create_chronology_event") return "Add to chronology";
  if (type === "create_calendar_item") return "Add to calendar";
  if (type === "create_bundle_item") return "Add to bundle";
  if (type === "create_statement") return "Save to Statements";
  return "Save";
}

// Whitelists the action type server-side rather than trusting model output.
export function normaliseAction(action: unknown): ProposedAction | null {
  if (!action || typeof action !== "object") return null;
  const candidate = action as { type?: unknown; label?: unknown; payload?: unknown };
  const type = candidate.type;
  if (typeof type !== "string" || !ACTION_TYPES.includes(type as ProposedAction["type"])) {
    return null;
  }
  return {
    type: type as ProposedAction["type"],
    label:
      typeof candidate.label === "string" && candidate.label
        ? candidate.label
        : makeActionLabel(type),
    payload:
      candidate.payload && typeof candidate.payload === "object"
        ? (candidate.payload as Record<string, unknown>)
        : {},
  };
}
