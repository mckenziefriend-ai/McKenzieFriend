import { createClient } from "@/lib/supabase/server";

export type LegalContextChunk = {
  title: string;
  jurisdiction: string;
  sourceType: string;
  heading: string | null;
  content: string;
  citationLabel: string | null;
};

function buildSearchTerms(message: string) {
  const cleaned = message
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 14)
    .join(" | ");

  return cleaned || "mckenzie friend court assistance";
}

export async function getLegalContextForMessage(message: string): Promise<LegalContextChunk[]> {
  try {
    const supabase = await createClient();
    const searchTerms = buildSearchTerms(message);

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

    if (!chunkError && chunks?.length) {
      return chunks.map((row: any) => ({
        title: row.legal_sources?.title ?? "Legal source",
        jurisdiction: row.legal_sources?.jurisdiction ?? "England and Wales",
        sourceType: row.legal_sources?.source_type ?? "Guidance",
        heading: row.heading ?? null,
        content: row.content ?? "",
        citationLabel: row.citation_label ?? null,
      }));
    }

    const { data: sources, error: sourceError } = await supabase
      .from("legal_sources")
      .select("title,jurisdiction,source_type,content")
      .eq("is_active", true)
      .limit(4);

    if (sourceError || !sources?.length) return [];

    return sources.map((source: any) => ({
      title: source.title ?? "Legal source",
      jurisdiction: source.jurisdiction ?? "England and Wales",
      sourceType: source.source_type ?? "Guidance",
      heading: null,
      content: String(source.content ?? "").slice(0, 4000),
      citationLabel: source.title ?? null,
    }));
  } catch {
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
