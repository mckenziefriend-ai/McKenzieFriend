import { describe, it, expect } from "vitest";
import { describeExtent, extentCoversEnglandWales } from "@/lib/legal/extent";
import { appliesInUserJurisdiction } from "@/lib/legal/retrieval";

/**
 * Every extent value below was observed in the real corpus (3,487 RestrictExtent
 * occurrences across the 21 Acts), so this is coverage of actual data rather
 * than imagined inputs.
 */
describe("extentCoversEnglandWales — every value present in the corpus", () => {
  it.each([
    ["E+W", 1875],
    ["E+W+S", 952],
    ["E+W+S+N.I.", 437],
    ["E+W+N.I.", 20],
    ["E", 4],
    ["W", 2],
  ])("includes %s (%i occurrences)", (extent) => {
    expect(extentCoversEnglandWales(extent)).toBe(true);
  });

  it.each([
    ["S", 101],
    ["N.I.", 96],
  ])("excludes %s (%i occurrences)", (extent) => {
    expect(extentCoversEnglandWales(extent)).toBe(false);
  });
});

describe("extentCoversEnglandWales — conservative on the unknown", () => {
  it("includes when the extent is missing entirely", () => {
    // Better to surface an ambiguous provision than hide real E&W law.
    expect(extentCoversEnglandWales(null)).toBe(true);
    expect(extentCoversEnglandWales(undefined)).toBe(true);
    expect(extentCoversEnglandWales("")).toBe(true);
    expect(extentCoversEnglandWales("   ")).toBe(true);
  });

  it("includes an unrecognised extent rather than dropping it", () => {
    expect(extentCoversEnglandWales("E+W+Something")).toBe(true);
    expect(extentCoversEnglandWales("UK")).toBe(true);
  });

  it("tolerates whitespace and case", () => {
    expect(extentCoversEnglandWales(" e + w ")).toBe(true);
    expect(extentCoversEnglandWales(" s ")).toBe(false);
  });
});

describe("extentCoversEnglandWales — matches components, not substrings", () => {
  it("does not treat N.I. as covering E&W", () => {
    // A substring check for "E" or "W" must not be what decides this.
    expect(extentCoversEnglandWales("N.I.")).toBe(false);
  });

  it("does not let a Scottish-only extent through", () => {
    expect(extentCoversEnglandWales("S")).toBe(false);
  });

  it("still includes multi-part extents containing E&W", () => {
    expect(extentCoversEnglandWales("S+N.I.+E")).toBe(true);
  });

  it("excludes a Scotland-and-NI-only combination", () => {
    expect(extentCoversEnglandWales("S+N.I.")).toBe(false);
  });
});

describe("describeExtent", () => {
  it("says nothing for the ordinary E&W case", () => {
    expect(describeExtent("E+W")).toBeNull();
    expect(describeExtent(null)).toBeNull();
  });

  it("flags a wider extent so the model can mention it", () => {
    expect(describeExtent("E+W+S+N.I.")).toBe("Extends to E+W+S+N.I.");
  });
});

describe("appliesInUserJurisdiction — the app-side re-check", () => {
  it("keeps an E&W provision", () => {
    expect(appliesInUserJurisdiction({ corpus: "provision", extent: "E+W" })).toBe(true);
  });

  it("drops the Civil Partnership Act N.I. schedules that caused the bug", () => {
    // schedule/15 and schedule/16 are N.I.; they outranked MCA s.25 on a
    // question about finances on divorce.
    expect(appliesInUserJurisdiction({ corpus: "provision", extent: "N.I." })).toBe(false);
  });

  it("drops Scotland-only provisions", () => {
    expect(appliesInUserJurisdiction({ corpus: "provision", extent: "S" })).toBe(false);
  });

  it("keeps a provision whose extent is unknown", () => {
    expect(appliesInUserJurisdiction({ corpus: "provision", extent: null })).toBe(true);
    expect(appliesInUserJurisdiction({ corpus: "provision" })).toBe(true);
  });

  it("always keeps guidance, which has no territorial extent", () => {
    expect(appliesInUserJurisdiction({ corpus: "guidance", extent: null })).toBe(true);
  });
});
