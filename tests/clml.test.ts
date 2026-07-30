import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildAmendmentNote,
  effectAffectsProvision,
  effectAffectsSection,
  enumerateProvisions,
  extractProvisionText,
  parseInstrumentMeta,
  parseProvision,
  parseUnappliedEffects,
  provisionLabel,
  type UnappliedEffect,
} from "@/scripts/lib/clml";

const FIXTURES = join(process.cwd(), "scripts", "__fixtures__");
const load = (name: string) => readFileSync(join(FIXTURES, name), "utf8");

const CA89_S1 = load("ukpga-1989-41-section-1.data.xml");
const CA89_S8 = load("ukpga-1989-41-section-8.data.xml");
const MCA73_S25 = load("ukpga-1973-18-section-25.data.xml");
const CA89_TRIMMED = load("ukpga-1989-41-trimmed.data.xml");

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

// ---------------------------------------------------------------------------
// Instrument metadata
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Currency — subsection roll-up
// ---------------------------------------------------------------------------

describe("effectAffectsSection — subsection roll-up", () => {
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

describe("effectAffectsProvision — generalised to any provision id", () => {
  it("matches schedule paragraphs by structured ref, with roll-up", () => {
    const e = effect({ affectedFoundRefs: ["schedule-14-paragraph-33"] });
    expect(effectAffectsProvision(e, "schedule-14-paragraph-33")).toBe(true);
    const sub = effect({ affectedFoundRefs: ["schedule-14-paragraph-33-2"] });
    expect(effectAffectsProvision(sub, "schedule-14-paragraph-33")).toBe(true);
  });

  it("does not let one schedule paragraph match a differently-numbered sibling", () => {
    const e = effect({ affectedFoundRefs: ["schedule-14-paragraph-3"] });
    expect(effectAffectsProvision(e, "schedule-14-paragraph-33")).toBe(false);
  });

  it("matches a schedule paragraph via its display label", () => {
    const e = effect({ affectedProvisionsLabel: "Sch. 14 para. 33" });
    expect(effectAffectsProvision(e, "schedule-14-paragraph-33")).toBe(true);
    expect(effectAffectsProvision(e, "schedule-14-paragraph-3")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Currency — real fixtures
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Text formatting — the markers must never be jammed onto words
// ---------------------------------------------------------------------------

describe("text formatting — structure preserved", () => {
  it("separates paragraph letters from their text (regression: 'athe upbringing')", () => {
    const p = parseProvision(CA89_S1, "1");
    expect(p.content).toContain("(a) the upbringing of a child");
    expect(p.content).not.toContain("athe upbringing");
    expect(p.content).not.toMatch(/\bathe\b/);
  });

  it("separates subsection numbers from their text (regression: '2AA court')", () => {
    const p = parseProvision(CA89_S1, "1");
    expect(p.content).toContain("(2A) A court");
    expect(p.content).not.toContain("2AA court");
  });

  it("renders each subsection on its own line with a bracketed marker", () => {
    const p = parseProvision(CA89_S1, "1");
    const lines = p.content.split("\n");
    expect(lines.some((l) => l.startsWith("(1) When a court determines"))).toBe(true);
    expect(lines.some((l) => l.startsWith("(2) In any proceedings"))).toBe(true);
    expect(lines.some((l) => l.startsWith("(2A) A court"))).toBe(true);
  });

  it("indents paragraph levels beneath their subsection", () => {
    const p = parseProvision(CA89_S1, "1");
    const paraLine = p.content.split("\n").find((l) => l.includes("(a) the upbringing"));
    expect(paraLine).toBeDefined();
    expect(paraLine!.startsWith("    (a)")).toBe(true);
  });

  it("never starts a line with a marker glued to its text", () => {
    // "(a)the" at line start would mean the separator was lost again.
    // Scoped to line starts deliberately: mid-sentence sequences like "(e)or"
    // occur in the source itself (".. (1)<Emphasis>(d), (e)</Emphasis>or ..")
    // and are reproduced verbatim rather than "corrected".
    for (const [xml, sec] of [[CA89_S1, "1"], [CA89_S8, "8"], [MCA73_S25, "25"]] as const) {
      const p = parseProvision(xml, sec);
      expect(p.content).not.toMatch(/^[ \t]*\([0-9A-Za-z]{1,4}\)[A-Za-z]/m);
    }
  });

  it("drops annotation markup but keeps statutory text", () => {
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

// ---------------------------------------------------------------------------
// Ellipsis — legislation.gov.uk's own omission markers must survive
// ---------------------------------------------------------------------------

describe("omitted-text markers", () => {
  it("preserves legislation.gov.uk's '...' repealed/omitted markers", () => {
    // Verified against the rendered page: /ukpga/1989/41/section/11 shows
    // "who is a parent of the child F8 ...;" — the "..." is theirs, not ours.
    // If a future "cleanup" strips these we would silently misstate the law.
    const p = parseProvision(MCA73_S25, "25");
    expect(p.content).toContain("...");
    expect(p.content).toMatch(/any benefit \.\.\. which/);
  });

  it("keeps the source's own ellipses in s.8 definitions", () => {
    const p = parseProvision(CA89_S8, "8");
    expect(p.content).toContain("...");
  });
});

// ---------------------------------------------------------------------------
// Whole-instrument enumeration
// ---------------------------------------------------------------------------

describe("enumerateProvisions — whole-instrument", () => {
  const provisions = enumerateProvisions(CA89_TRIMMED, "ukpga/1989/41");

  it("enumerates sections and schedule paragraphs from one document", () => {
    expect(provisions.length).toBeGreaterThan(20);
    expect(provisions.filter((p) => p.ref.startsWith("section")).length).toBeGreaterThan(0);
    expect(provisions.filter((p) => p.ref.startsWith("schedule")).length).toBeGreaterThan(0);
  });

  it("derives refs and ids in legislation.gov.uk's own form", () => {
    const s8 = provisions.find((p) => p.ref === "section/8");
    expect(s8).toBeDefined();
    expect(s8!.id).toBe("section-8");
    expect(s8!.number).toBe("8");

    const para = provisions.find((p) => p.ref === "schedule/A1/paragraph/1");
    expect(para).toBeDefined();
    expect(para!.id).toBe("schedule-A1-paragraph-1");
  });

  it("folds schedule and part context into schedule paragraph headings", () => {
    const para = provisions.find((p) => p.ref === "schedule/A1/paragraph/1");
    expect(para!.heading).toContain("SCHEDULE A1");
    expect(para!.heading).toContain("Enforcement orders");
    expect(para!.heading).toMatch(/PART 1|Part 1/);
  });

  it("captures the raw CLML status verbatim and derives in_force from it", () => {
    const repealed = provisions.filter((p) => p.status === "Repealed");
    expect(repealed.length).toBeGreaterThan(0);
    expect(repealed.every((p) => p.inForce === false)).toBe(true);

    const live = provisions.find((p) => p.ref === "section/1");
    expect(live!.status).toBeNull();
    expect(live!.inForce).toBe(true);
  });

  it("keeps provisions in document order", () => {
    const positions = provisions.map((p) => p.position);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(provisions[0].ref).toBe("section/1");
  });

  it("preserves the provision-scoped currency logic across the whole document", () => {
    const pending = parseUnappliedEffects(CA89_TRIMMED).filter((e) => e.requiresApplied);
    expect(pending.filter((e) => effectAffectsProvision(e, "section-8"))).toHaveLength(3);
    expect(pending.filter((e) => effectAffectsProvision(e, "section-1"))).toHaveLength(0);
  });

  it("formats text correctly for provisions reached via enumeration", () => {
    const s1 = provisions.find((p) => p.ref === "section/1");
    expect(s1!.content).toContain("(a) the upbringing of a child");
    expect(s1!.content).not.toMatch(/^[ \t]*\([0-9A-Za-z]{1,4}\)[A-Za-z]/m);
  });

  it("has no line-start marker jamming anywhere in the document", () => {
    for (const p of provisions) {
      expect(p.content, `${p.ref} has a jammed marker`).not.toMatch(
        /^[ \t]*\([0-9A-Za-z]{1,4}\)[A-Za-z]/m
      );
    }
  });

  it("records a genuinely empty provision as empty rather than inventing text", () => {
    // s.54 is repealed: the source has <Text/> and a dotted heading.
    const s54 = provisions.find((p) => p.ref === "section/54");
    expect(s54).toBeDefined();
    expect(s54!.content).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Labels and notes
// ---------------------------------------------------------------------------

describe("provisionLabel", () => {
  it("renders section and schedule-paragraph refs readably", () => {
    expect(provisionLabel("section/8")).toBe("s. 8");
    expect(provisionLabel("schedule/14/paragraph/33")).toBe("Sch. 14 para. 33");
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
      "s. 8"
    );
    expect(note).toBe(
      "1 change not yet applied to s. 8: words inserted in s. 8(3) by Children and Families Act 2014."
    );
  });

  it("pluralises correctly", () => {
    const note = buildAmendmentNote(
      [effect({ affectedProvisionsLabel: "s. 8(3)" }), effect({ affectedProvisionsLabel: "s. 8(4)" })],
      "s. 8"
    );
    expect(note).toMatch(/^2 changes not yet applied/);
  });

  it("states the no-outstanding-effects case explicitly", () => {
    expect(buildAmendmentNote([], "s. 25")).toBe("No outstanding effects.");
  });
});
