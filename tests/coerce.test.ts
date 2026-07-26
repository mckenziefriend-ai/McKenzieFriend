import { describe, it, expect } from "vitest";
import { clean } from "@/lib/coerce";

describe("clean", () => {
  it("trims surrounding whitespace", () => {
    expect(clean("  hello  ")).toBe("hello");
  });

  it("returns null for empty / whitespace-only input", () => {
    expect(clean("")).toBeNull();
    expect(clean("   ")).toBeNull();
  });

  it("returns null for null / undefined", () => {
    expect(clean(null)).toBeNull();
    expect(clean(undefined)).toBeNull();
  });

  it("coerces non-string values to strings", () => {
    expect(clean(42)).toBe("42");
    expect(clean(false)).toBe("false");
  });
});
