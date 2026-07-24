import { createClient } from "@/lib/supabase/server";
import { buildSearchTerms } from "@/lib/legal/searchTerms";

export { buildSearchTerms };

export type LegalContextChunk = {
  title: string;
  jurisdiction: string;
  sourceType: string;
  heading: string | null;
  content: string;
  citationLabel: string | null;
};

type ChunkRow = {
  heading: string | null;
  content: string | null;
  citation_label: string | null;
  legal_sources?: {
    title: string | null;
    jurisdiction: string | null;
    source_type: string | null;
  } | null;
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

export async function getLegalContextForMessage(message: string): Promise<LegalContextChunk[]> {
  const searchTerms = buildSearchTerms(message);
  if (!searchTerms) return [];

  try {
    const supabase = await createClient();

    // Preferred path: ranked retrieval via the search_legal_chunks RPC
    // (ts_rank with a relevance floor — see supabase/legal_search.sql).
    const rpc = await supabase.rpc("search_legal_chunks", {
      query_text: searchTerms,
      match_limit: 8,
    });

    if (!rpc.error && Array.isArray(rpc.data)) {
      if (!rpc.data.length) {
        console.warn(`[retrieval] no ranked legal chunks matched: "${searchTerms}"`);
        return [];
      }
      return (rpc.data as RankedChunkRow[]).map((row) => ({
        title: row.title ?? "Legal source",
        jurisdiction: row.jurisdiction ?? "England and Wales",
        sourceType: row.source_type ?? "Guidance",
        heading: row.heading ?? null,
        content: row.content ?? "",
        citationLabel: row.citation_label ?? null,
      }));
    }

    // Fallback only if the RPC is not installed yet. This still filters by the
    // search terms (unranked); it does NOT inject arbitrary unrelated sources.
    const { data: chunks, error: chunkError } = await supabase
      .from("legal_chunks")
      .select(
        `
        heading,
        content,
        citation_label,
        legal_sources (
          title,
          jurisdiction,
          source_type
        )
      `,
      )
      .textSearch("content", searchTerms, {
        type: "websearch",
        config: "english",
      })
      .limit(8);

    if (chunkError || !chunks?.length) {
      console.warn(`[retrieval] no legal chunks matched: "${searchTerms}"`);
      return [];
    }

    return (chunks as unknown as ChunkRow[]).map((row) => ({
      title: row.legal_sources?.title ?? "Legal source",
      jurisdiction: row.legal_sources?.jurisdiction ?? "England and Wales",
      sourceType: row.legal_sources?.source_type ?? "Guidance",
      heading: row.heading ?? null,
      content: row.content ?? "",
      citationLabel: row.citation_label ?? null,
    }));
  } catch (error) {
    console.error("[retrieval] legal context lookup failed:", error);
    return [];
  }
}

export function formatLegalContextForPrompt(chunks: LegalContextChunk[]) {
  if (!chunks.length) {
    return "No specific legal source chunks were retrieved for this message.";
  }

  return chunks
    .map((chunk, index) => {
      return [
        `Source ${index + 1}: ${chunk.title}`,
        `Jurisdiction: ${chunk.jurisdiction}`,
        `Type: ${chunk.sourceType}`,
        chunk.heading ? `Heading: ${chunk.heading}` : null,
        chunk.citationLabel ? `Citation: ${chunk.citationLabel}` : null,
        `Content: ${chunk.content}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");
}
