import { describe, it, expect } from "vitest";
import {
  buildSqlChunks,
  chunk,
  instrumentToRecord,
  provisionToRecord,
  writeToDatabase,
  type InstrumentRow,
  type ProvisionRow,
  type UpsertClient,
} from "@/scripts/lib/writer";
import { classify, isIdentifierProblem, isUsable, normaliseTitle } from "@/scripts/lib/verify";

const instrument: InstrumentRow = {
  title: "Children Act 1989",
  type: "act",
  jurisdiction: "England and Wales",
  legGovRef: "ukpga/1989/41",
  sourceUrl: "https://www.legislation.gov.uk/ukpga/1989/41",
  upToDateTo: "2026-07-15",
};

function provision(overrides: Partial<ProvisionRow> = {}): ProvisionRow {
  return {
    legGovRef: "ukpga/1989/41",
    ref: "section/8",
    number: "8",
    heading: "Child arrangements orders",
    content: "(1) In this Act—",
    versionDate: "2026-03-25",
    inForce: true,
    status: null,
    contentOmitted: false,
    hasUnappliedAmendments: true,
    amendmentNote: "3 changes not yet applied to s. 8: …",
    sourceUrl: "https://www.legislation.gov.uk/ukpga/1989/41/section/8",
    position: 2,
    ...overrides,
  };
}

describe("row mapping", () => {
  it("maps an instrument to its columns", () => {
    const record = instrumentToRecord(instrument, "2026-07-31T00:00:00.000Z");
    expect(record.leg_gov_ref).toBe("ukpga/1989/41");
    expect(record.up_to_date_to).toBe("2026-07-15");
    expect(record.last_synced).toBe("2026-07-31T00:00:00.000Z");
  });

  it("maps a provision, carrying both not-in-force signals separately", () => {
    const record = provisionToRecord(
      provision({ status: "Repealed", inForce: false }),
      "abc-123",
      "2026-07-31T00:00:00.000Z"
    );
    expect(record.instrument_id).toBe("abc-123");
    expect(record.status).toBe("Repealed");
    expect(record.content_omitted).toBe(false);
    expect(record.in_force).toBe(false);
    expect(record.has_unapplied_amendments).toBe(true);
  });

  it("keeps status null for text-omitted provisions", () => {
    const record = provisionToRecord(
      provision({ status: null, contentOmitted: true, inForce: false, content: "" }),
      "abc-123",
      "2026-07-31T00:00:00.000Z"
    );
    expect(record.status).toBeNull();
    expect(record.content_omitted).toBe(true);
  });
});

describe("chunk", () => {
  it("splits evenly and keeps the remainder", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it("handles an empty list", () => {
    expect(chunk([], 10)).toEqual([]);
  });
});

describe("buildSqlChunks", () => {
  const chunks = buildSqlChunks(instrument ? [instrument] : [], [provision(), provision({ ref: "section/1", position: 1 })], "STAMP", 1);

  it("puts instruments in file 00 and provisions in numbered files", () => {
    expect(chunks[0].filename).toBe("ingest-STAMP-00-instruments.sql");
    expect(chunks[0].sql).toContain("legal_instruments");
    expect(chunks).toHaveLength(3); // 00 + two single-provision chunks
  });

  it("lists the run order in the manifest", () => {
    expect(chunks[0].sql).toContain("RUN THESE FILES IN ORDER");
    expect(chunks[0].sql).toContain("ingest-STAMP-01-provisions.sql");
  });

  it("emits the status and content_omitted columns", () => {
    expect(chunks[1].sql).toContain("content_omitted, has_unapplied_amendments");
  });

  it("escapes single quotes so text cannot break out of the literal", () => {
    const withQuote = buildSqlChunks([], [provision({ content: "it's a test" })], "S", 10);
    expect(withQuote[1].sql).toContain("'it''s a test'");
  });
});

describe("writeToDatabase", () => {
  function fakeClient(): { client: UpsertClient; calls: { table: string; rows: number; onConflict: string }[] } {
    const calls: { table: string; rows: number; onConflict: string }[] = [];
    const client: UpsertClient = {
      from(table: string) {
        return {
          upsert(values: Record<string, unknown>[], options: { onConflict: string }) {
            calls.push({ table, rows: values.length, onConflict: options.onConflict });
            return {
              async select() {
                if (table === "legal_instruments") {
                  return {
                    data: values.map((v, i) => ({ id: `id-${i}`, leg_gov_ref: v.leg_gov_ref })),
                    error: null,
                  };
                }
                return { data: [], error: null };
              },
            };
          },
        };
      },
    };
    return { client, calls };
  }

  it("upserts instruments then provisions, batching by size", async () => {
    const { client, calls } = fakeClient();
    const provisions = Array.from({ length: 5 }, (_, i) => provision({ ref: `section/${i}`, position: i }));
    const result = await writeToDatabase(client, [instrument], provisions, 2);

    expect(result).toEqual({ instrumentsWritten: 1, provisionsWritten: 5 });
    expect(calls[0]).toEqual({ table: "legal_instruments", rows: 1, onConflict: "leg_gov_ref" });
    expect(calls.slice(1).map((c) => c.rows)).toEqual([2, 2, 1]);
    expect(calls[1].onConflict).toBe("instrument_id,ref");
  });

  it("fails loudly if an instrument id is missing rather than writing orphans", async () => {
    const client: UpsertClient = {
      from() {
        return {
          upsert() {
            return { async select() { return { data: [], error: null }; } };
          },
        };
      },
    };
    await expect(writeToDatabase(client, [instrument], [provision()], 10)).rejects.toThrow(
      /No instrument id returned/
    );
  });

  it("surfaces an upsert error with the rows written so far", async () => {
    const client: UpsertClient = {
      from(table: string) {
        return {
          upsert(values: Record<string, unknown>[]) {
            return {
              async select() {
                if (table === "legal_instruments") {
                  return { data: values.map((v) => ({ id: "x", leg_gov_ref: v.leg_gov_ref })), error: null };
                }
                return { data: null, error: { message: "boom" } };
              },
            };
          },
        };
      },
    };
    await expect(writeToDatabase(client, [instrument], [provision()], 10)).rejects.toThrow(/boom/);
  });
});

describe("identifier verification classification", () => {
  it("treats an exact title as exact and a cosmetic difference as a match", () => {
    expect(classify("Family Law Act 1996", "Family Law Act 1996", 200)).toBe("EXACT");
    expect(classify("Family Procedure Rules 2010", "The Family Procedure Rules 2010", 200)).toBe("MATCH");
  });

  it("flags a genuinely different instrument as a mismatch", () => {
    expect(classify("Children Act 1989", "Housing Act 1988", 200)).toBe("MISMATCH");
  });

  it("distinguishes a wrong identifier from an unreachable service", () => {
    // 404 means the ref is wrong; a 503 or network error does not.
    expect(classify("X", null, 404)).toBe("NO_TITLE");
    expect(classify("X", null, 503)).toBe("UNREACHABLE");
    expect(classify("X", null, 0)).toBe("UNREACHABLE");

    expect(isIdentifierProblem("NO_TITLE")).toBe(true);
    expect(isIdentifierProblem("MISMATCH")).toBe(true);
    // Crucially NOT an identifier problem — must not silently shrink the corpus.
    expect(isIdentifierProblem("UNREACHABLE")).toBe(false);
  });

  it("only ingests against exact or matching titles", () => {
    expect(isUsable("EXACT")).toBe(true);
    expect(isUsable("MATCH")).toBe(true);
    expect(isUsable("MISMATCH")).toBe(false);
    expect(isUsable("UNREACHABLE")).toBe(false);
  });

  it("normalises titles for comparison", () => {
    expect(normaliseTitle("The Civil Procedure Rules 1998")).toBe("civil procedure rules 1998");
    expect(normaliseTitle("Family Law Act 1996 (Pt 4)")).toBe("family law act 1996");
  });
});
