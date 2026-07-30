import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildAmendmentNote,
  effectAffectsSection,
  extractProvisionText,
  parseInstrumentMeta,
  parseProvision,
  parseUnappliedEffects,
  type UnappliedEffect,
} from "@/scripts/lib/clml";

const FIXTURES = join(process.cwd(), "scripts", "__fixtures__");
const load = (name: string) => readFileSync(join(FIXTURES, name), "utf8");

const CA89_S1 = load("ukpga-1989-41-section-1.data.xml");
const CA89_S8 = load("ukpga-1989-41-section-8.data.xml");
const MCA73_S25 = load("ukpga-1973-18-section-25.data.xml");

function effect(partial: Partial<UnappliedEffect>): UnappliedEffect {
  return {
    requiresApplied: true,
    type: "words inserted",
    affectedProvisionsLabel: null,
    affectedFoundRefs: [],
    affectingTitle: null,
    affectingUri: null,
    ...partial,
  };
}

describe("parseInstrumentMeta", () => {
  it("reads title, type and the up-to-date-to date for an Act", () => {
    const meta = parseInstrumentMeta(CA89_S8);
    expect(meta.title).toBe("Children Act 1989");
    expect(meta.type).toBe("act");
    expect(meta.upToDateTo).toBe("2026-07-15");
  });

  it("reads a different instrument's currency date independently", () => {
    const meta = parseInstrumentMeta(MCA73_S25);
    expect(meta.title).toBe("Matrimonial Causes Act 1973");
    expect(meta.upToDateTo).toBe("2024-08-02");
  });
});

describe("effectAffectsSection — subsection roll-up", () => {
  // The core requirement: a pending change to s. 8(3) must flag s. 8.
  it("rolls a FoundRef subsection effect up to its parent section", () => {
    const e = effect({ affectedFoundRefs: ["section-8"], affectedProvisionsLabel: "s. 8(3)" });
    expect(effectAffectsSection(e, "8")).toBe(true);
  });

  it("rolls a precise Ref (section-8-3) up to the parent section", () => {
    const e = effect({ affectedFoundRefs: ["section-8-3"], affectedProvisionsLabel: "s. 8(3)" });
    expect(effectAffectsSection(e, "8")).toBe(true);
  });

  it("rolls up via the display label when no structured ref is present", () => {
    const e = effect({ affectedFoundRefs: [], affectedProvisionsLabel: "s. 8(3)" });
    expect(effectAffectsSection(e, "8")).toBe(true);
  });

  it("does not match a different section with the same leading digits", () => {
    expect(effectAffectsSection(effect({ affectedProvisionsLabel: "s. 104(3AZA)" }), "1")).toBe(false);
    expect(effectAffectsSection(effect({ affectedProvisionsLabel: "s. 10B(2)" }), "1")).toBe(false);
    expect(effectAffectsSection(effect({ affectedProvisionsLabel: "s. 91(14A)" }), "9")).toBe(false);
  });

  it("does not treat a lettered sibling section as the plain section", () => {
    expect(effectAffectsSection(effect({ affectedProvisionsLabel: "s. 25B(2)(c)" }), "25")).toBe(false);
    expect(effectAffectsSection(effect({ affectedFoundRefs: ["section-25B"] }), "25")).toBe(false);
  });

  it("ignores schedule effects", () => {
    expect(effectAffectsSection(effect({ affectedProvisionsLabel: "Sch. ZA1 para. 3(ha)-(hc)" }), "1")).toBe(false);
  });
});

describe("parseProvision — currency states on real fixtures", () => {
  it("CA1989 s.8 has unapplied amendments with a populated note", () => {
    const p = parseProvision(CA89_S8, "8");
    expect(p.number).toBe("8");
    expect(p.heading).toContain("Child arrangements orders");
    expect(p.versionDate).toBe("2026-03-25");
    expect(p.inForce).toBe(true);
    expect(p.hasUnappliedAmendments).toBe(true);
    expect(p.amendmentNote).not.toBe("No outstanding effects.");
    expect(p.amendmentNote).toMatch(/not yet applied to s\. 8/);
    expect(p.matchedEffects.length).toBeGreaterThan(0);
  });

  it("every effect matched for s.8 targets s.8 (roll-up, not act-wide leakage)", () => {
    const p = parseProvision(CA89_S8, "8");
    for (const e of p.matchedEffects) {
      expect(e.requiresApplied).toBe(true);
      expect(e.affectedProvisionsLabel).toMatch(/^s\.\s*8\b/);
    }
  });

  it("MCA1973 s.25 reports no outstanding effects", () => {
    const p = parseProvision(MCA73_S25, "25");
    expect(p.number).toBe("25");
    expect(p.versionDate).toBe("2011-04-06");
    expect(p.inForce).toBe(true);
    expect(p.hasUnappliedAmendments).toBe(false);
    expect(p.amendmentNote).toBe("No outstanding effects.");
    expect(p.matchedEffects).toHaveLength(0);
  });

  it("MCA1973 s.25 does have effects, but all are already applied", () => {
    // Guards the distinction between "no effects" and "no OUTSTANDING effects".
    const all = parseUnappliedEffects(MCA73_S25);
    const affectingS25 = all.filter((e) => effectAffectsSection(e, "25"));
    expect(affectingS25.length).toBeGreaterThan(0);
    expect(affectingS25.every((e) => !e.requiresApplied)).toBe(true);
  });

  it("CA1989 s.1 is NOT flagged, despite act-wide effects in the same document", () => {
    // Regression guard: a naive "document contains RequiresApplied=true" rule
    // would wrongly flag s.1 — the file carries ~29 such effects for other
    // sections. The flag must be scoped to the provision.
    const all = parseUnappliedEffects(CA89_S1);
    expect(all.filter((e) => e.requiresApplied).length).toBeGreaterThan(0);

    const p = parseProvision(CA89_S1, "1");
    expect(p.hasUnappliedAmendments).toBe(false);
    expect(p.amendmentNote).toBe("No outstanding effects.");
  });
});

describe("extractProvisionText", () => {
  it("extracts readable text and drops annotation markers", () => {
    const p = parseProvision(CA89_S1, "1");
    expect(p.content.length).toBeGreaterThan(500);
    expect(p.content).toContain("welfare of the child");
    expect(p.content).not.toContain("<");
    expect(p.content).not.toContain("CommentaryRef");
  });

  it("decodes XML entities rather than leaving them raw", () => {
    const p = parseProvision(CA89_S8, "8");
    expect(p.content).not.toMatch(/&(amp|lt|gt|quot|#x?\d)/);
  });

  it("returns empty string for a block with no text", () => {
    expect(extractProvisionText("<P1group></P1group>")).toBe("");
  });
});

describe("buildAmendmentNote", () => {
  it("summarises pending effects with the affecting instrument", () => {
    const note = buildAmendmentNote(
      [
        effect({
          type: "words inserted",
          affectedProvisionsLabel: "s. 8(3)",
          affectingTitle: "Children and Families Act 2014",
        }),
      ],
      "8"
    );
    expect(note).toBe(
      "1 change not yet applied to s. 8: words inserted in s. 8(3) by Children and Families Act 2014."
    );
  });

  it("pluralises correctly", () => {
    const note = buildAmendmentNote(
      [effect({ affectedProvisionsLabel: "s. 8(3)" }), effect({ affectedProvisionsLabel: "s. 8(4)" })],
      "8"
    );
    expect(note).toMatch(/^2 changes not yet applied/);
  });

  it("states the no-outstanding-effects case explicitly", () => {
    expect(buildAmendmentNote([], "25")).toBe("No outstanding effects.");
  });
});
