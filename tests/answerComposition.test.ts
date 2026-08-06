import { describe, it, expect } from "vitest";
import {
  MAX_CHARS_PER_SOURCE,
  MAX_SOURCES,
  NO_SOURCES_BLOCK,
  buildLegalContext,
  statusLineFor,
  stripEmbeddingPrefix,
  type ContextSource,
} from "@/lib/legal/context";
import { flagsFor } from "@/lib/legal/retrieval";
import { LEGAL_ANSWER_RULES } from "@/lib/ai/mckenzieFriendPrompt";

function source(overrides: Partial<ContextSource> = {}): ContextSource {
  return {
    title: "Children Act 1989",
    jurisdiction: "England and Wales",
    sourceType: "act",
    heading: "Child arrangements orders",
    content: "(1) In this Act—\n(2) More text.",
    citationLabel: "Children Act 1989 section/8",
    provisionRef: "section/8",
    inForce: true,
    status: null,
    extent: "E+W",
    hasUnappliedAmendments: false,
    upToDateTo: "2026-07-15",
    sourceUrl: "https://www.legislation.gov.uk/ukpga/1989/41/section/8",
    matchType: "semantic",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// No results — the model must be told, not left to improvise
// ---------------------------------------------------------------------------

describe("no sources retrieved", () => {
  it("emits an explicit instruction rather than an empty block", () => {
    const built = buildLegalContext([]);
    expect(built.text).toBe(NO_SOURCES_BLOCK);
    expect(built.used).toBe(0);
  });

  it("tells the model not to answer from memory", () => {
    expect(NO_SOURCES_BLOCK).toMatch(/no legal source for this question/i);
    expect(NO_SOURCES_BLOCK).toMatch(/Do not answer it\s*\n?from memory/i);
  });
});

// ---------------------------------------------------------------------------
// Token cap
// ---------------------------------------------------------------------------

describe("token cap", () => {
  it("keeps at most MAX_SOURCES sources", () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      source({ provisionRef: `section/${i}`, citationLabel: `Act section/${i}` })
    );
    const built = buildLegalContext(many);
    expect(built.used).toBe(MAX_SOURCES);
    expect(built.dropped).toBe(12 - MAX_SOURCES);
  });

  it("truncates an over-long provision and says so", () => {
    const built = buildLegalContext([source({ content: "x".repeat(9000) })]);
    expect(built.truncated).toBe(1);
    expect(built.text).toContain("[text truncated");
    expect(built.text).toContain("legislation.gov.uk");
  });

  it("never lets one source exceed the per-source cap by much", () => {
    const built = buildLegalContext([source({ content: "y".repeat(9000) })]);
    // Cap plus the marker and the metadata lines, not 9000.
    expect(built.totalChars).toBeLessThan(MAX_CHARS_PER_SOURCE + 800);
  });

  it("respects the total budget across sources", () => {
    const many = Array.from({ length: 6 }, (_, i) =>
      source({ provisionRef: `section/${i}`, content: "z".repeat(2400) })
    );
    const built = buildLegalContext(many, { maxTotalChars: 6000 });
    expect(built.totalChars).toBeLessThanOrEqual(6000 + MAX_CHARS_PER_SOURCE);
    expect(built.used).toBeLessThan(6);
  });

  it("always includes at least one source even if it alone exceeds the budget", () => {
    // Returning nothing would be worse than returning one long provision.
    const built = buildLegalContext([source({ content: "q".repeat(9000) })], {
      maxTotalChars: 100,
    });
    expect(built.used).toBe(1);
  });

  it("admits citation matches before semantic ones", () => {
    const built = buildLegalContext([
      source({ provisionRef: "section/1", citationLabel: "A s1", matchType: "semantic" }),
      source({ provisionRef: "section/8", citationLabel: "B s8", matchType: "citation" }),
    ]);
    const firstBlock = built.text.split("---")[0];
    expect(firstBlock).toContain("B s8");
  });
});

// ---------------------------------------------------------------------------
// Currency surfacing
// ---------------------------------------------------------------------------

describe("currency in the rendered context", () => {
  it("shows the up-to-date-to date", () => {
    expect(buildLegalContext([source()]).text).toContain("up to date to 2026-07-15");
  });

  it("warns when amendments are not yet applied", () => {
    const built = buildLegalContext([source({ hasUnappliedAmendments: true })]);
    expect(built.text).toContain("AMENDMENTS NOT YET APPLIED");
    expect(built.text).toMatch(/check the current version/i);
  });

  it("says nothing extra for an ordinary E&W provision", () => {
    expect(buildLegalContext([source()]).text).not.toContain("Status:");
  });
});

// ---------------------------------------------------------------------------
// Flagged citations — repealed / prospective / out of jurisdiction
// ---------------------------------------------------------------------------

describe("flagsFor", () => {
  it("does not flag an ordinary in-force E&W provision", () => {
    expect(flagsFor({ in_force: true, content_omitted: false, extent: "E+W" })).toEqual([]);
  });

  it("flags a repealed provision", () => {
    expect(flagsFor({ in_force: false, extent: "E+W" })).toContain("not-in-force");
  });

  it("flags an out-of-jurisdiction provision", () => {
    expect(flagsFor({ in_force: true, extent: "N.I." })).toContain("outside-jurisdiction");
  });

  it("never flags guidance", () => {
    expect(flagsFor({ corpus: "guidance", in_force: null, extent: null })).toEqual([]);
  });
});

describe("status line for flagged sources", () => {
  it("makes a repealed provision unmistakably not current", () => {
    const line = statusLineFor(source({ flags: ["not-in-force"], status: "Repealed", inForce: false }));
    expect(line).toContain("NOT IN FORCE");
    expect(line).toContain("REPEALED");
    expect(line).toMatch(/do NOT present it as the law that applies now/i);
  });

  it("distinguishes never-commenced from repealed", () => {
    const line = statusLineFor(source({ flags: ["not-in-force"], status: "Prospective", inForce: false }));
    expect(line).toContain("NOT YET IN FORCE");
  });

  it("makes non-applicability to E&W unmistakable", () => {
    const line = statusLineFor(source({ flags: ["outside-jurisdiction"], extent: "N.I." }));
    expect(line).toContain("DOES NOT APPLY IN ENGLAND AND WALES");
    expect(line).toMatch(/NOT the law in the user's jurisdiction/i);
    expect(line).toMatch(/do NOT explain it as if it governed their case/i);
  });

  it("returns nothing for an unflagged source", () => {
    expect(statusLineFor(source())).toBeNull();
  });

  it("marks the source header so the flag cannot be missed", () => {
    const built = buildLegalContext([source({ flags: ["not-in-force"], status: "Repealed" })]);
    expect(built.text).toContain("[FLAGGED — SEE STATUS]");
  });
});

// ---------------------------------------------------------------------------
// The safety wording itself
// ---------------------------------------------------------------------------

describe("LEGAL_ANSWER_RULES", () => {
  // The prompt is hard-wrapped, so assert against whitespace-normalised text
  // rather than multiline regexes that break on a reflow.
  const rules = LEGAL_ANSWER_RULES.replace(/\s+/g, " ");

  it("prohibits citing anything absent from the retrieved sources", () => {
    // The central guard: a confident invented section number is the failure
    // mode a litigant cannot detect.
    expect(rules).toContain(
      "Never state a section number, rule number, form number or case name that does not appear in the retrieved sources"
    );
  });

  it("requires saying so when nothing was retrieved", () => {
    expect(rules).toContain("Do NOT fill the gap from general knowledge");
  });

  it("makes the retrieved sources the only permissible law", () => {
    expect(rules).toContain('The "Retrieved legal sources" section is the ONLY law you may state as law');
  });

  it("separates what the law says from what to do", () => {
    expect(rules).toContain("You must not tell the user what they should do in their case");
    expect(rules).toContain("This is not legal advice");
  });

  it("carries the currency instructions", () => {
    expect(rules).toContain("AMENDMENTS NOT YET APPLIED");
    expect(rules).toContain("NOT IN FORCE");
    expect(rules).toContain("DOES NOT APPLY IN ENGLAND AND WALES");
  });

  it("does not still say merely to 'prefer' retrieved context", () => {
    // The old wording left room to fall back on memory; grounding has to be a
    // prohibition, not a preference.
    expect(rules).not.toMatch(/prefer retrieved/i);
  });
});

// ---------------------------------------------------------------------------
// Embedding-prefix stripping
// ---------------------------------------------------------------------------

describe("stripEmbeddingPrefix", () => {
  it("removes the citation and heading the indexer prepended", () => {
    // The semantic RPC returns the EMBEDDED text, which is prefixed with
    // citation + heading for match quality. We render those as their own
    // lines, so repeating them in the body wastes budget.
    const s = source();
    const embedded = `${s.citationLabel}\n${s.heading}\n(1) In this Act—`;
    expect(stripEmbeddingPrefix(embedded, s)).toBe("(1) In this Act—");
  });

  it("leaves an unprefixed body untouched", () => {
    const s = source();
    expect(stripEmbeddingPrefix("(1) In this Act—", s)).toBe("(1) In this Act—");
  });

  it("does not empty a provision that is only its heading", () => {
    const s = source({ content: "Children Act 1989 section/8" });
    expect(stripEmbeddingPrefix(s.content, s).length).toBeGreaterThan(0);
  });

  it("removes the duplication from the rendered block", () => {
    const s = source();
    const withPrefix = source({ content: `${s.citationLabel}\n${s.heading}\n(1) Body text.` });
    const built = buildLegalContext([withPrefix]);
    // Citation appears once as metadata, not again inside Content.
    const occurrences = built.text.split(s.citationLabel!).length - 1;
    expect(occurrences).toBe(1);
  });

  it("still strips the indexer's prefix once the label is a real citation", () => {
    // The indexer writes "<title> <ref>"; citation_label now reads
    // "Children Act 1989, s. 8". They no longer match, and matching only the
    // label would leave the raw path at the top of every provision body.
    const s = source({ citationLabel: "Children Act 1989, s. 8" });
    const embedded = `Children Act 1989 section/8\n${s.heading}\n(1) In this Act—`;
    expect(stripEmbeddingPrefix(embedded, s)).toBe("(1) In this Act—");
  });

  it("strips the indexer's prefix for a procedure rule too", () => {
    const s = source({
      title: "The Family Procedure Rules 2010",
      citationLabel: "Family Procedure Rules 2010, r. 12.3",
      provisionRef: "rule/12.3",
      heading: "Who the parties are",
    });
    const embedded = `The Family Procedure Rules 2010 rule/12.3\n${s.heading}\n(1) In relation to—`;
    expect(stripEmbeddingPrefix(embedded, s)).toBe("(1) In relation to—");
  });
});
