/**
 * Pure row-building for the embedding pipeline, kept separate from the network
 * and database work so the decisions that matter are unit-testable.
 */

import { createHash } from "node:crypto";
import { buildEmbeddingText, chunkProvisionText } from "../../lib/legal/chunking";

export type ProvisionSource = {
  id: string;
  ref: string;
  heading: string | null;
  content: string;
  contentOmitted: boolean;
  instrumentTitle: string;
  /** Enclosing Part or Chapter, e.g. "PART 27 (THE SMALL CLAIMS TRACK)". */
  partLabel: string | null;
};

export type GuidanceSource = {
  id: string;
  heading: string | null;
  content: string;
  citationLabel: string | null;
  sourceTitle: string;
};

export type PendingEmbedding = {
  corpus: "provision" | "guidance";
  provisionId: string | null;
  chunkId: string | null;
  subChunkIndex: number;
  /** Text actually sent to the provider. */
  content: string;
  contentHash: string;
};

export function hashContent(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Expands a provision into the chunks that should exist in the index.
 *
 * Content-omitted provisions produce nothing: they carry no operative text, so
 * there is nothing meaningful to embed and a vector for an empty provision
 * would only pollute results.
 */
/**
 * Whether the Part label belongs in this provision's embedding text.
 *
 * Procedure rules only, and deliberately so. In an Act the instrument title
 * states the subject — "Children Act 1989" tells you what section 8 is about,
 * so a section can be found on title and heading alone. In the CPR and FPR the
 * instrument title is identical across every one of the ~1,800 rules and says
 * nothing about subject matter, and rule headings are short and reused across
 * Parts ("Starting the claim" appears in Parts 55, 56, 62 and 63). For those
 * the Part is the ONLY statement of subject anywhere in the provision: without
 * it, r.27.4 never mentions small claims, because that lives in the title of
 * Part 27 and nowhere else.
 *
 * Note this is not about heading collisions as such — those are commoner in the
 * statutes (56.7% of Consumer Rights Act provisions share a heading against
 * 23.6% of CPR rules). It is that the Act title resolves them and "The Civil
 * Procedure Rules 1998" cannot.
 *
 * Schedule paragraphs are excluded because composeHeading already folds the
 * Part into their heading — adding it here would duplicate it.
 */
function shouldIncludePartLabel(ref: string): boolean {
  return ref.startsWith("rule/");
}

export function provisionToPending(provision: ProvisionSource): PendingEmbedding[] {
  if (provision.contentOmitted) return [];
  if (!provision.content.trim()) return [];

  const citation = `${provision.instrumentTitle} ${provision.ref}`;
  const partLabel = shouldIncludePartLabel(provision.ref) ? provision.partLabel : null;

  return chunkProvisionText(provision.content).map((chunk) => {
    const content = buildEmbeddingText({
      citation,
      partLabel,
      heading: provision.heading,
      content: chunk.content,
    });
    return {
      corpus: "provision" as const,
      provisionId: provision.id,
      chunkId: null,
      subChunkIndex: chunk.subChunkIndex,
      content,
      contentHash: hashContent(content),
    };
  });
}

export function guidanceToPending(chunk: GuidanceSource): PendingEmbedding[] {
  if (!chunk.content.trim()) return [];

  const content = buildEmbeddingText({
    citation: chunk.citationLabel ?? chunk.sourceTitle,
    heading: chunk.heading,
    content: chunk.content,
  });

  return [
    {
      corpus: "guidance" as const,
      provisionId: null,
      chunkId: chunk.id,
      subChunkIndex: 0,
      content,
      contentHash: hashContent(content),
    },
  ];
}

export type ExistingEmbedding = {
  provision_id: string | null;
  chunk_id: string | null;
  sub_chunk_index: number;
  content_hash: string;
  embedding_model: string;
};

function keyOf(row: {
  provisionId?: string | null;
  chunkId?: string | null;
  provision_id?: string | null;
  chunk_id?: string | null;
  subChunkIndex?: number;
  sub_chunk_index?: number;
}): string {
  const provision = row.provisionId ?? row.provision_id ?? "";
  const chunk = row.chunkId ?? row.chunk_id ?? "";
  const index = row.subChunkIndex ?? row.sub_chunk_index ?? 0;
  return `${provision}|${chunk}|${index}`;
}

/**
 * Idempotency: re-embed only what is missing or has changed.
 *
 * A row is skipped when an embedding already exists for the same parent,
 * sub-chunk, model AND content hash. Changing the text or the model produces
 * work; re-running unchanged does not, so an interrupted run resumes cheaply.
 */
export function selectWorkToDo(
  pending: PendingEmbedding[],
  existing: ExistingEmbedding[],
  model: string
): { toEmbed: PendingEmbedding[]; skipped: number; stale: number } {
  const byKey = new Map<string, ExistingEmbedding>();
  for (const row of existing) {
    if (row.embedding_model !== model) continue;
    byKey.set(keyOf(row), row);
  }

  const toEmbed: PendingEmbedding[] = [];
  let skipped = 0;
  let stale = 0;

  for (const item of pending) {
    const match = byKey.get(keyOf(item));
    if (!match) {
      toEmbed.push(item);
      continue;
    }
    if (match.content_hash === item.contentHash) {
      skipped++;
      continue;
    }
    stale++;
    toEmbed.push(item);
  }

  return { toEmbed, skipped, stale };
}

/** Maps a pending item plus its vector to a database row. */
export function toEmbeddingRecord(
  item: PendingEmbedding,
  vector: number[],
  model: string,
  dimensions: number
): Record<string, unknown> {
  return {
    corpus: item.corpus,
    provision_id: item.provisionId,
    chunk_id: item.chunkId,
    sub_chunk_index: item.subChunkIndex,
    content: item.content,
    content_hash: item.contentHash,
    embedding: vector,
    embedding_model: model,
    embedding_dims: dimensions,
    updated_at: new Date().toISOString(),
  };
}
