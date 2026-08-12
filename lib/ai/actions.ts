// Shared types for AI-proposed actions — the boundary where untrusted LLM
// output crosses into the database. Payloads are modelled as
// Record<string, unknown> (not `any`) so every field must be explicitly
// coerced/validated before use. A Zod schema per action type would be the
// next step up if this boundary grows.

export type ActionType =
  | "create_chronology_event"
  | "create_calendar_item"
  | "create_bundle_item"
  | "create_statement"
  | "create_note";

export const ACTION_TYPES: ActionType[] = [
  "create_chronology_event",
  "create_calendar_item",
  "create_bundle_item",
  "create_statement",
  "create_note",
];

export type ActionPayload = Record<string, unknown>;

export type ProposedAction = {
  type: ActionType;
  label: string;
  payload: ActionPayload;
};
