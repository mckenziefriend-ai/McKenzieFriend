import { describe, it, expect } from "vitest";
import { buildSearchTerms } from "@/lib/legal/searchTerms";

describe("buildSearchTerms", () => {
  it("keeps 3-char legal tokens like CPR and FPR (regression for the >3 filter)", () => {
    const terms = buildSearchTerms("What does CPR and FPR say?").split(" ");
    expect(terms).toContain("cpr");
    expect(terms).toContain("fpr");
  });

  it("lowercases and strips punctuation", () => {
    expect(buildSearchTerms("Hearing, on 25/05!")).toBe("hearing on 25 05");
  });

  it("drops single-character tokens", () => {
    const terms = buildSearchTerms("a b hearing").split(" ");
    expect(terms).not.toContain("a");
    expect(terms).not.toContain("b");
    expect(terms).toContain("hearing");
  });

  it("caps at 14 tokens", () => {
    const many = Array.from({ length: 30 }, (_, i) => `word${i}`).join(" ");
    expect(buildSearchTerms(many).split(" ")).toHaveLength(14);
  });

  it("returns an empty string when nothing survives filtering", () => {
    expect(buildSearchTerms("a ! ?")).toBe("");
  });
});
