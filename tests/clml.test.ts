import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildAmendmentNote,
  deriveInForce,
  effectAffectsProvision,
  effectAffectsSection,
  enumerateProvisions,
  createDiagnostics,
  extractProvisionText,
  isContentOmitted,
  localName,
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

  it("treats a provision with no operative text as not in force", () => {
    // Verified against the live page: /ukpga/1989/41/section/54 renders
    // "F1 54 . . . ." with "Textual Amendments: F1 S. 54 repealed (1.4.2002)".
    // Reading these as in force is the dangerous direction for a legal tool.
    const s54 = provisions.find((p) => p.ref === "section/54")!;
    expect(s54.contentOmitted).toBe(true);
    expect(s54.inForce).toBe(false);
  });

  it("does not fabricate a captured status for unmarked repealed provisions", () => {
    // CLML sets no Status on s.54, so status must stay null — the signal lives
    // in content_omitted, which is distinguishable from a captured status.
    const s54 = provisions.find((p) => p.ref === "section/54")!;
    expect(s54.status).toBeNull();
  });

  it("never reports a provision as in force while carrying no text", () => {
    for (const p of provisions) {
      if (p.contentOmitted) expect(p.inForce, `${p.ref}`).toBe(false);
    }
  });

  it("keeps content_omitted false for provisions that do have text", () => {
    const s1 = provisions.find((p) => p.ref === "section/1")!;
    expect(s1.contentOmitted).toBe(false);
    expect(s1.inForce).toBe(true);
  });
});

describe("deriveInForce", () => {
  it("is false for captured Repealed or Prospective status", () => {
    expect(deriveInForce("Repealed", false)).toBe(false);
    expect(deriveInForce("Prospective", false)).toBe(false);
  });

  it("is false when the source carried no operative text", () => {
    expect(deriveInForce(null, true)).toBe(false);
  });

  it("is true for a normal provision with text and no status", () => {
    expect(deriveInForce(null, false)).toBe(true);
  });

  it("ignores statuses that do not indicate not-in-force", () => {
    expect(deriveInForce("Inherited", false)).toBe(true);
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

// ---------------------------------------------------------------------------
// Namespace handling, diagnostics and formulae (added when scaling to 21 Acts)
// ---------------------------------------------------------------------------

describe("localName", () => {
  it("strips a namespace prefix", () => {
    expect(localName("xhtml:td")).toBe("td");
    expect(localName("leg:Text")).toBe("Text");
    expect(localName("math:mfrac")).toBe("mfrac");
  });

  it("leaves unprefixed names alone", () => {
    expect(localName("Text")).toBe("Text");
  });
});

describe("namespace-prefixed markup", () => {
  // Real Acts use leg:Text / xhtml:td where the Children Act uses Text / td.
  // Classifying on the raw name silently lost line breaks and cell handling.
  it("treats leg:Text as a block, like Text", () => {
    const plain = extractProvisionText(
      "<P1group><P1><P1para><Text>One</Text><Text>Two</Text></P1para></P1></P1group>"
    );
    const prefixed = extractProvisionText(
      "<P1group><P1><P1para><leg:Text>One</leg:Text><leg:Text>Two</leg:Text></P1para></P1></P1group>"
    );
    expect(plain).toBe("One\nTwo");
    expect(prefixed).toBe(plain);
  });

  it("treats a prefixed numbered level like its unprefixed form", () => {
    const text = extractProvisionText(
      "<P1group><P1><P1para><leg:P2><leg:Pnumber>1</leg:Pnumber>" +
        "<leg:P2para><leg:Text>Body text</leg:Text></leg:P2para></leg:P2></P1para></P1></P1group>"
    );
    expect(text).toBe("(1) Body text");
  });
});

describe("parse diagnostics", () => {
  it("records genuinely unrecognised tags", () => {
    const diagnostics = createDiagnostics();
    enumerateProvisions(
      '<Legislation><Body><P1group><P1 DocumentURI="http://www.legislation.gov.uk/ukpga/1/2/section/1" id="section-1">' +
        "<Pnumber>1</Pnumber><P1para><Text>Hi</Text><WidgetThing>x</WidgetThing></P1para></P1></P1group></Body></Legislation>",
      "ukpga/1/2",
      diagnostics
    );
    expect(diagnostics.unknownTags.get("WidgetThing")).toBe(1);
  });

  it("does not flag known constructs, prefixed or not", () => {
    const diagnostics = createDiagnostics();
    enumerateProvisions(CA89_TRIMMED, "ukpga/1989/41", diagnostics);
    expect([...diagnostics.unknownTags.keys()]).toEqual([]);
  });
});

describe("MathML formulae", () => {
  it("renders a fraction as numerator/denominator, not run together", () => {
    // "R over D" must not collapse to "RD" — that misstates the calculation.
    const text = extractProvisionText(
      "<P1group><P1><P1para><Text>" +
        "<Formula><math:math><math:mfrac><math:mi>R</math:mi><math:mi>D</math:mi></math:mfrac>" +
        "<math:mo>×</math:mo><math:mn>30.42</math:mn></math:math></Formula>" +
        "</Text></P1para></P1></P1group>"
    );
    expect(text).toContain("R/D");
    expect(text).not.toContain("RD");
  });

  it("puts the where-clause on its own line", () => {
    const text = extractProvisionText(
      "<P1group><P1><P1para><Text>" +
        "<Formula><math:math><math:mi>R</math:mi></math:math>" +
        "<Where><Para><Text>where—</Text></Para></Where></Formula>" +
        "</Text></P1para></P1></P1group>"
    );
    expect(text.split("\n")).toContain("where—");
  });
});

// ---------------------------------------------------------------------------
// Repeal dot-notation
// ---------------------------------------------------------------------------

describe("isContentOmitted", () => {
  it("treats genuinely empty content as omitted", () => {
    expect(isContentOmitted("")).toBe(true);
    expect(isContentOmitted("   \n  ")).toBe(true);
  });

  it("treats legislation.gov.uk's repeal dot-notation as omitted", () => {
    // 753 provisions in the corpus render this way, with no Status attribute
    // and no empty element — they were reading as in force.
    expect(isContentOmitted(". . . . . . . . . . . . . . . .")).toBe(true);
    expect(isContentOmitted("...")).toBe(true);
    expect(isContentOmitted("…")).toBe(true);
    expect(isContentOmitted("  . . .  \n . . .  ")).toBe(true);
  });

  it("never treats a provision containing words as omitted", () => {
    expect(isContentOmitted("(1) A short provision.")).toBe(false);
    expect(isContentOmitted("Yes.")).toBe(false);
    expect(isContentOmitted("a")).toBe(false);
  });

  it("never treats a provision containing digits as omitted", () => {
    // A bare cross-reference or figure is still content.
    expect(isContentOmitted("30.42")).toBe(false);
    expect(isContentOmitted("... 1985 ...")).toBe(false);
  });

  it("fails safe: anything it does not positively recognise is kept", () => {
    // Other punctuation is not repeal notation, so the provision is kept.
    expect(isContentOmitted("—")).toBe(false);
    expect(isContentOmitted("(a)")).toBe(false);
    expect(isContentOmitted("[ ]")).toBe(false);
  });
});

describe("deriveInForce with dot-notation", () => {
  it("marks a dots-only provision as not in force", () => {
    expect(deriveInForce(null, isContentOmitted(". . . ."))).toBe(false);
  });

  it("leaves a real provision in force", () => {
    expect(deriveInForce(null, isContentOmitted("(1) Real text."))).toBe(true);
  });
});
