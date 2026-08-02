import { createClient } from "@/lib/supabase/server";
import { buildSearchTerms } from "@/lib/legal/searchTerms";
import { hasCitation, parseCitation } from "@/lib/legal/citations";
import { describeExtent, extentCoversEnglandWales } from "@/lib/legal/extent";
import {
  DEFAULT_EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
  createOpenAIEmbeddingProvider,
} from "@/lib/ai/embeddings";

export { buildSearchTerms };

export type LegalContextChunk = {
  title: string;
  jurisdiction: string;
  sourceType: string;
  heading: string | null;
  content: string;
  citationLabel: string | null;
  /** Present for legislation; null for hand-curated guidance. */
  provisionRef?: string | null;
  legGovRef?: string | null;
  inForce?: boolean | null;
  status?: string | null;
  /** CLML RestrictExtent, e.g. "E+W". Null for guidance. */
  extent?: string | null;
  hasUnappliedAmendments?: boolean | null;
  upToDateTo?: string | null;
  similarity?: number | null;
  matchType?: "citation" | "semantic" | "keyword";
};

type SemanticRow = {
  corpus: string;
  similarity: number | null;
  title: string | null;
  jurisdiction: string | null;
  source_type: string | null;
  heading: string | null;
  content: string | null;
  citation_label: string | null;
  leg_gov_ref: string | null;
  provision_ref: string | null;
  in_force: boolean | null;
  status: string | null;
  content_omitted: boolean | null;
  extent: string | null;
  has_unapplied_amendments: boolean | null;
  amendment_note: string | null;
  up_to_date_to: string | null;
  source_url: string | null;
};

type RankedChunkRow = {
  heading: string | null;
  content: string | null;
  citation_label: string | null;
  title: string | null;
  jurisdiction: string | null;
  source_type: string | null;
  rank: number;
};

const MATCH_LIMIT = 8;
const SIMILARITY_FLOOR = 0.35;

/**
 * Defence in depth for the in-force guarantee.
 *
 * The SQL already excludes non-in-force provisions, but this is the material
 * safety property of the whole feature: Family Law Act 1996 Part 2 alone is 102
 * prospective provisions — real law that never commenced. Presenting any of it
 * as current would be actively harmful, so we re-check here rather than trust a
 * single layer. Guidance rows carry in_force = true from the RPC.
 */
export function isCitableAsCurrentLaw(row: {
  corpus?: string;
  in_force?: boolean | null;
  content_omitted?: boolean | null;
}): boolean {
  if (row.corpus === "guidance") return true;
  if (row.content_omitted === true) return false;
  return row.in_force === true;
}

/**
 * Second guarantee, same defence-in-depth shape: the product is pinned to
 * England & Wales, so Scotland-only and Northern-Ireland-only provisions must
 * not be presented as the user's law. The SQL already filters; this re-checks.
 *
 * Conservative: unknown extent passes. Hiding a real E&W provision is worse
 * than surfacing an ambiguous one.
 */
export function appliesInUserJurisdiction(row: {
  corpus?: string;
  extent?: string | null;
}): boolean {
  if (row.corpus === "guidance") return true;
  return extentCoversEnglandWales(row.extent);
}

function toChunk(row: SemanticRow, matchType: "citation" | "semantic"): LegalContextChunk {
  return {
    title: row.title ?? "Legal source",
    jurisdiction: row.jurisdiction ?? "England and Wales",
    sourceType: row.source_type ?? "Guidance",
    heading: row.heading ?? null,
    content: row.content ?? "",
    citationLabel: row.citation_label ?? null,
    provisionRef: row.provision_ref ?? null,
    legGovRef: row.leg_gov_ref ?? null,
    inForce: row.in_force ?? null,
    status: row.status ?? null,
    extent: row.extent ?? null,
    hasUnappliedAmendments: row.has_unapplied_amendments ?? null,
    upToDateTo: row.up_to_date_to ?? null,
    similarity: row.similarity ?? null,
    matchType,
  };
}

/** Dedupe key: one row per provision (or guidance chunk) regardless of sub-chunk. */
function identityOf(chunk: LegalContextChunk): string {
  if (chunk.legGovRef && chunk.provisionRef) return `${chunk.legGovRef}#${chunk.provisionRef}`;
  return `guidance#${chunk.citationLabel ?? chunk.heading ?? chunk.content.slice(0, 60)}`;
}

export async function getLegalContextForMessage(message: string): Promise<LegalContextChunk[]> {
  const question = String(message ?? "").trim();
  if (!question) return [];

  try {
    const supabase = await createClient();
    const results: LegalContextChunk[] = [];
    const seen = new Set<string>();

    const push = (chunk: LegalContextChunk) => {
      const key = identityOf(chunk);
      if (seen.has(key)) return;
      seen.add(key);
      results.push(chunk);
    };

    // --- 1. Exact citation lookup, merged above semantic hits ---------------
    const citation = parseCitation(question);
    if (hasCitation(citation)) {
      const lookup = await supabase.rpc("lookup_legal_provisions", {
        provision_refs: citation.provisionRefs,
        instrument_hint: citation.instrumentHint,
        match_limit: MATCH_LIMIT,
      });
      if (!lookup.error && Array.isArray(lookup.data)) {
        for (const row of lookup.data as SemanticRow[]) {
          if (!isCitableAsCurrentLaw(row) || !appliesInUserJurisdiction(row)) continue;
          push(toChunk(row, "citation"));
        }
      } else if (lookup.error) {
        console.warn("[retrieval] citation lookup failed:", lookup.error.message);
      }
    }

    // --- 2. Semantic search --------------------------------------------------
    const embedding = await embedQuestion(question);
    if (embedding) {
      const semantic = await supabase.rpc("search_legal_semantic", {
        query_embedding: embedding,
        match_limit: MATCH_LIMIT,
        similarity_floor: SIMILARITY_FLOOR,
        model_filter: DEFAULT_EMBEDDING_MODEL,
      });

      if (!semantic.error && Array.isArray(semantic.data)) {
        for (const row of semantic.data as SemanticRow[]) {
          if (!isCitableAsCurrentLaw(row) || !appliesInUserJurisdiction(row)) continue;
          push(toChunk(row, "semantic"));
        }
        if (results.length) return results.slice(0, MATCH_LIMIT);
        console.warn(`[retrieval] no semantic matches above floor for: "${question.slice(0, 80)}"`);
      } else if (semantic.error) {
        console.warn("[retrieval] semantic search failed:", semantic.error.message);
      }
    }

    if (results.length) return results.slice(0, MATCH_LIMIT);

    // --- 3. Keyword fallback -------------------------------------------------
    // Used when embedding is unavailable or the semantic RPC is not installed.
    // Retrieval must degrade rather than hard-fail.
    const keyword = await keywordFallback(supabase, question);
    for (const chunk of keyword) push(chunk);
    return results.slice(0, MATCH_LIMIT);
  } catch (error) {
    console.error("[retrieval] legal context lookup failed:", error);
    return [];
  }
}

/** Embeds the question with the same model used to build the index. */
async function embedQuestion(question: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[retrieval] OPENAI_API_KEY missing — falling back to keyword search");
    return null;
  }
  try {
    const provider = createOpenAIEmbeddingProvider({
      apiKey,
      model: DEFAULT_EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
    });
    const { vectors } = await provider.embed([question]);
    return vectors[0] ?? null;
  } catch (error) {
    console.warn("[retrieval] question embedding failed:", error);
    return null;
  }
}

type SupabaseLike = Awaited<ReturnType<typeof createClient>>;

async function keywordFallback(
  supabase: SupabaseLike,
  question: string
): Promise<LegalContextChunk[]> {
  const searchTerms = buildSearchTerms(question);
  if (!searchTerms) return [];

  const rpc = await supabase.rpc("search_legal_chunks", {
    query_text: searchTerms,
    match_limit: MATCH_LIMIT,
  });

  if (rpc.error || !Array.isArray(rpc.data) || !rpc.data.length) {
    console.warn(`[retrieval] no keyword matches: "${searchTerms}"`);
    return [];
  }

  return (rpc.data as RankedChunkRow[]).map((row) => ({
    title: row.title ?? "Legal source",
    jurisdiction: row.jurisdiction ?? "England and Wales",
    sourceType: row.source_type ?? "Guidance",
    heading: row.heading ?? null,
    content: row.content ?? "",
    citationLabel: row.citation_label ?? null,
    matchType: "keyword" as const,
  }));
}

export function formatLegalContextForPrompt(chunks: LegalContextChunk[]) {
  if (!chunks.length) {
    return "No specific legal source chunks were retrieved for this message.";
  }

  return chunks
    .map((chunk, index) => {
      // Surface currency to the model: a provision can be in force but still
      // have amendments that have not yet been applied to the text.
      const currency: string[] = [];
      if (chunk.upToDateTo) currency.push(`up to date to ${chunk.upToDateTo}`);
      // Only worth saying when it is not the plain E&W case.
      const extentNote = describeExtent(chunk.extent);
      if (extentNote) currency.push(extentNote);
      if (chunk.hasUnappliedAmendments) {
        currency.push("HAS AMENDMENTS NOT YET APPLIED — tell the user to check the latest text");
      }

      return [
        `Source ${index + 1}: ${chunk.title}`,
        `Jurisdiction: ${chunk.jurisdiction}`,
        `Type: ${chunk.sourceType}`,
        chunk.heading ? `Heading: ${chunk.heading}` : null,
        chunk.citationLabel ? `Citation: ${chunk.citationLabel}` : null,
        currency.length ? `Currency: ${currency.join("; ")}` : null,
        `Content: ${chunk.content}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");
}
