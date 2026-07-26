import { describe, it, expect } from "vitest";
import { safeJson, cleanVisibleAnswer, normaliseAction, makeActionLabel } from "@/lib/ai/parsing";

describe("safeJson", () => {
  it("parses clean JSON", () => {
    expect(safeJson('{"answer":"hi","action":null}')).toEqual({ answer: "hi", action: null });
  });

  it("strips a ```json code fence and parses the object", () => {
    const raw = '```json\n{"answer":"hi","action":null}\n```';
    expect(safeJson(raw)).toEqual({ answer: "hi", action: null });
  });

  it("extracts the object when there is leading/trailing prose", () => {
    const raw = 'Sure! {"answer":"ok","action":null} hope that helps';
    expect(safeJson(raw)).toEqual({ answer: "ok", action: null });
  });

  it("recovers the answer when the JSON is broken but the answer field is present", () => {
    const raw = '{"answer":"partial text","action": {oops not valid';
    expect(safeJson(raw)).toEqual({ answer: "partial text", action: null });
  });

  it("falls back to treating the whole string as the answer", () => {
    const raw = "just some plain text";
    expect(safeJson(raw)).toEqual({ answer: "just some plain text", action: null });
  });

  it("does not throw on empty input", () => {
    expect(safeJson("")).toEqual({ answer: "", action: null });
  });
});

describe("cleanVisibleAnswer", () => {
  it("removes a leaked action object appended to the answer", () => {
    const raw = 'Here is your event. , "action": {"type":"create_chronology_event"}';
    expect(cleanVisibleAnswer(raw)).toBe("Here is your event.");
  });

  it("removes a leaked bare create_ object", () => {
    const raw = 'Saved. {"type":"create_statement","payload":{}}';
    expect(cleanVisibleAnswer(raw)).toBe("Saved.");
  });

  it("strips surrounding code fences and quotes", () => {
    expect(cleanVisibleAnswer('```json\n"hello"\n```')).toBe("hello");
  });

  it("returns empty string for nullish input", () => {
    expect(cleanVisibleAnswer(null)).toBe("");
    expect(cleanVisibleAnswer(undefined)).toBe("");
  });
});

describe("normaliseAction", () => {
  it("accepts a whitelisted action type and fills a default label", () => {
    const result = normaliseAction({ type: "create_statement", payload: { title: "x" } });
    expect(result).toEqual({
      type: "create_statement",
      label: "Save to Statements",
      payload: { title: "x" },
    });
  });

  it("keeps a provided label", () => {
    const result = normaliseAction({ type: "create_calendar_item", label: "Custom", payload: {} });
    expect(result?.label).toBe("Custom");
  });

  it("rejects a non-whitelisted action type", () => {
    expect(normaliseAction({ type: "delete_everything", payload: {} })).toBeNull();
  });

  it("rejects non-object / missing input", () => {
    expect(normaliseAction(null)).toBeNull();
    expect(normaliseAction("create_statement")).toBeNull();
    expect(normaliseAction({})).toBeNull();
  });

  it("defaults a missing/invalid payload to an empty object", () => {
    expect(normaliseAction({ type: "create_bundle_item" })?.payload).toEqual({});
    expect(normaliseAction({ type: "create_bundle_item", payload: "nope" })?.payload).toEqual({});
  });
});

describe("makeActionLabel", () => {
  it("maps known types", () => {
    expect(makeActionLabel("create_chronology_event")).toBe("Add to chronology");
    expect(makeActionLabel("create_calendar_item")).toBe("Add to calendar");
    expect(makeActionLabel("create_bundle_item")).toBe("Add to bundle");
    expect(makeActionLabel("create_statement")).toBe("Save to Statements");
  });

  it("falls back to Save for unknown types", () => {
    expect(makeActionLabel("whatever")).toBe("Save");
  });
});
