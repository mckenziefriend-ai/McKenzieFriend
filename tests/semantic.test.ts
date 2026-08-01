import { describe, it, expect } from "vitest";
import {
  CHUNK_THRESHOLD_CHARS,
  buildEmbeddingText,
  chunkProvisionText,
} from "@/lib/legal/chunking";
import { hasCitation, parseCitation } from "@/lib/legal/citations";
import { isCitableAsCurrentLaw } from "@/lib/legal/retrieval";
import {
  guidanceToPending,
  hashContent,
  provisionToPending,
  selectWorkToDo,
  toEmbeddingRecord,
} from "@/scripts/lib/embedRows";

// ---------------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------------

describe("chunkProvisionText", () => {
  it("keeps a short provision whole so the citation stays clean", () => {
    const chunks = chunkProvisionText("(1) A short provision.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].subChunkIndex).toBe(0);
    expect(chunks[0].content).toBe("(1) A short provision.");
  });

  it("returns nothing for empty or whitespace-only text", () => {
    expect(chunkProvisionText("")).toEqual([]);
    expect(chunkProvisionText("   \n  ")).toEqual([]);
  });

  it("splits a long provision on subsection boundaries, never mid-line", () => {
    const subsections = Array.from(
      { length: 40 },
      (_, i) => `(${i + 1}) ${"word ".repeat(40).trim()}`
    );
    const text = subsections.join("\n");
    expect(text.length).toBeGreaterThan(CHUNK_THRESHOLD_CHARS);

    const chunks = chunkProvisionText(text);
    expect(chunks.length).toBeGreaterThan(1);

    // Every original line survives intact in exactly one chunk.
    const rejoined = chunks.map((c) => c.content).join("\n");
    for (const line of subsections) expect(rejoined).toContain(line);

    // No chunk starts mid-subsection.
    for (const chunk of chunks) expect(chunk.content.startsWith("(")).toBe(true);
  });

  it("numbers sub-chunks contiguously from zero", () => {
    const text = Array.from({ length: 60 }, (_, i) => `(${i + 1}) ${"x".repeat(120)}`).join("\n");
    const chunks = chunkProvisionText(text);
    expect(chunks.map((c) => c.subChunkIndex)).toEqual(chunks.map((_, i) => i));
  });

  it("keeps chunks near the target rather than unbounded", () => {
    const text = Array.from({ length: 200 }, (_, i) => `(${i + 1}) ${"y".repeat(100)}`).join("\n");
    for (const chunk of chunkProvisionText(text)) {
      // Target 3000 plus at most one overshooting line (~110 chars here).
      expect(chunk.content.length).toBeLessThan(3500);
    }
  });

  it("does not lose a single over-long line", () => {
    const long = "(1) " + "z".repeat(9000);
    const chunks = chunkProvisionText(long);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe(long);
  });
});

describe("buildEmbeddingText", () => {
  it("prefixes citation and heading so short provisions carry context", () => {
    const text = buildEmbeddingText({
      citation: "Children Act 1989 section/8",
      heading: "Child arrangements orders",
      content: "(1) In this Act—",
    });
    expect(text).toBe("Children Act 1989 section/8\nChild arrangements orders\n(1) In this Act—");
  });

  it("omits missing parts without leaving blank lines", () => {
    expect(buildEmbeddingText({ citation: null, heading: null, content: "text" })).toBe("text");
  });
});

// ---------------------------------------------------------------------------
// Citation short-circuit
// ---------------------------------------------------------------------------

describe("parseCitation", () => {
  it.each([
    ["s.8", "section/8"],
    ["s. 8", "section/8"],
    ["s 8", "section/8"],
    ["section 8", "section/8"],
    ["Section 8", "section/8"],
    ["ss. 8", "section/8"],
    ["sections 8", "section/8"],
    ["s.8(3)", "section/8"],
    ["s.4ZA", "section/4ZA"],
  ])("parses %j as %s", (query, expected) => {
    expect(parseCitation(query).provisionRefs).toContain(expected);
  });

  it("parses an abbreviated instrument reference", () => {
    const parsed = parseCitation("what does CA 1989 s.8 say about contact?");
    expect(parsed.provisionRefs).toEqual(["section/8"]);
    expect(parsed.instrumentHint).toBe("Children Act 1989");
  });

  it("parses a named Act", () => {
    const parsed = parseCitation("Matrimonial Causes Act 1973 section 25 factors");
    expect(parsed.provisionRefs).toEqual(["section/25"]);
    expect(parsed.instrumentHint).toContain("Matrimonial Causes Act 1973");
  });

  it("recognises LASPO without a year", () => {
    expect(parseCitation("LASPO s.10").instrumentHint).toContain("Legal Aid");
  });

  it("parses schedule paragraphs", () => {
    const parsed = parseCitation("schedule 1 paragraph 2 of the Children Act 1989");
    expect(parsed.provisionRefs).toContain("schedule/1/paragraph/2");
  });

  it("finds multiple sections", () => {
    const parsed = parseCitation("compare s.8 and s.10");
    expect(parsed.provisionRefs).toEqual(["section/8", "section/10"]);
  });

  it("does not fire on ordinary prose", () => {
    for (const query of [
      "how do I get contact with my child",
      "my son was 8 years old",
      "this is 8 weeks away",
      "what happens next",
    ]) {
      expect(hasCitation(parseCitation(query)), query).toBe(false);
    }
  });

  it("caps the number of refs so a pathological query cannot explode the lookup", () => {
    const many = Array.from({ length: 30 }, (_, i) => `s.${i + 1}`).join(" ");
    expect(parseCitation(many).provisionRefs.length).toBeLessThanOrEqual(6);
  });
});

// ---------------------------------------------------------------------------
// The in-force guarantee
// ---------------------------------------------------------------------------

describe("isCitableAsCurrentLaw", () => {
  it("allows an in-force provision", () => {
    expect(isCitableAsCurrentLaw({ corpus: "provision", in_force: true, content_omitted: false })).toBe(true);
  });

  it("rejects repealed and prospective provisions", () => {
    // Family Law Act 1996 Part 2 is 102 prospective provisions — real law that
    // never commenced. It must never reach the model as current law.
    expect(isCitableAsCurrentLaw({ corpus: "provision", in_force: false, content_omitted: false })).toBe(false);
  });

  it("rejects a provision with no operative text even if in_force says true", () => {
    expect(isCitableAsCurrentLaw({ corpus: "provision", in_force: true, content_omitted: true })).toBe(false);
  });

  it("rejects when in_force is null or missing rather than assuming current", () => {
    expect(isCitableAsCurrentLaw({ corpus: "provision", in_force: null })).toBe(false);
    expect(isCitableAsCurrentLaw({ corpus: "provision" })).toBe(false);
  });

  it("always allows guidance, which has no in-force concept", () => {
    expect(isCitableAsCurrentLaw({ corpus: "guidance" })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Row building and idempotency
// ---------------------------------------------------------------------------

const provision = {
  id: "prov-1",
  ref: "section/8",
  heading: "Child arrangements orders",
  content: "(1) In this Act—\n(2) More text.",
  contentOmitted: false,
  instrumentTitle: "Children Act 1989",
};

describe("provisionToPending", () => {
  it("produces one chunk for a normal provision", () => {
    const pending = provisionToPending(provision);
    expect(pending).toHaveLength(1);
    expect(pending[0].corpus).toBe("provision");
    expect(pending[0].provisionId).toBe("prov-1");
    expect(pending[0].chunkId).toBeNull();
    expect(pending[0].content).toContain("Children Act 1989 section/8");
    expect(pending[0].contentHash).toHaveLength(64);
  });

  it("embeds nothing for a text-omitted provision", () => {
    expect(provisionToPending({ ...provision, contentOmitted: true })).toEqual([]);
  });

  it("embeds nothing for empty content", () => {
    expect(provisionToPending({ ...provision, content: "   " })).toEqual([]);
  });

  it("produces sub-chunks that all resolve back to the provision", () => {
    const long = Array.from({ length: 60 }, (_, i) => `(${i + 1}) ${"w".repeat(120)}`).join("\n");
    const pending = provisionToPending({ ...provision, content: long });
    expect(pending.length).toBeGreaterThan(1);
    for (const item of pending) expect(item.provisionId).toBe("prov-1");
    expect(pending.map((p) => p.subChunkIndex)).toEqual(pending.map((_, i) => i));
  });
});

describe("guidanceToPending", () => {
  it("maps a guidance chunk to the guidance corpus", () => {
    const pending = guidanceToPending({
      id: "chunk-1",
      heading: "McKenzie friends",
      content: "Guidance text.",
      citationLabel: "Practice Guidance",
      sourceTitle: "McKenzie Friends Guidance",
    });
    expect(pending).toHaveLength(1);
    expect(pending[0].corpus).toBe("guidance");
    expect(pending[0].chunkId).toBe("chunk-1");
    expect(pending[0].provisionId).toBeNull();
  });
});

describe("selectWorkToDo", () => {
  const pending = provisionToPending(provision);
  const model = "text-embedding-3-large";

  it("embeds everything when nothing exists yet", () => {
    const result = selectWorkToDo(pending, [], model);
    expect(result.toEmbed).toHaveLength(1);
    expect(result.skipped).toBe(0);
  });

  it("skips unchanged content — a re-run costs nothing", () => {
    const existing = [
      {
        provision_id: "prov-1",
        chunk_id: null,
        sub_chunk_index: 0,
        content_hash: pending[0].contentHash,
        embedding_model: model,
      },
    ];
    const result = selectWorkToDo(pending, existing, model);
    expect(result.toEmbed).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });

  it("re-embeds when the text changed", () => {
    const existing = [
      {
        provision_id: "prov-1",
        chunk_id: null,
        sub_chunk_index: 0,
        content_hash: hashContent("something else"),
        embedding_model: model,
      },
    ];
    const result = selectWorkToDo(pending, existing, model);
    expect(result.toEmbed).toHaveLength(1);
    expect(result.stale).toBe(1);
  });

  it("re-embeds when the model changed, ignoring the other model's rows", () => {
    const existing = [
      {
        provision_id: "prov-1",
        chunk_id: null,
        sub_chunk_index: 0,
        content_hash: pending[0].contentHash,
        embedding_model: "text-embedding-3-small",
      },
    ];
    const result = selectWorkToDo(pending, existing, model);
    expect(result.toEmbed).toHaveLength(1);
    expect(result.skipped).toBe(0);
  });
});

describe("toEmbeddingRecord", () => {
  it("records the model and dimensions the provider reported", () => {
    const [item] = provisionToPending(provision);
    const record = toEmbeddingRecord(item, [0.1, 0.2, 0.3], "text-embedding-3-large", 1536);
    expect(record.embedding_model).toBe("text-embedding-3-large");
    expect(record.embedding_dims).toBe(1536);
    expect(record.corpus).toBe("provision");
    expect(record.provision_id).toBe("prov-1");
    expect(record.chunk_id).toBeNull();
    expect(record.content_hash).toBe(item.contentHash);
  });
});
