/**
 * Chunking for the semantic index.
 *
 * Provisions are embedded WHOLE wherever possible, so a hit cites cleanly as
 * "s. 8 Children Act 1989" rather than an anonymous fragment. Measured against
 * the real corpus, that covers 97.4% of provisions: only 2.6% exceed the
 * threshold.
 *
 * Long provisions split on SUBSECTION boundaries, never mid-sentence. Our
 * rendered text is already line-structured by markers — "(1)", "(2A)", "(a)" —
 * and no provision in the corpus has a single line longer than ~460 chars, so
 * line-boundary splitting always succeeds. Every sub-chunk keeps its parent's
 * id and a sub_chunk_index, so citations still resolve to the provision.
 */

/**
 * Split above this many characters (~1000 tokens). The model's 8k token limit
 * is not the binding constraint — retrieval quality is. A whole provision is
 * usually the right citation unit, so the threshold is set well above the 90th
 * percentile (2,384 chars) and only bites on genuinely long provisions.
 */
export const CHUNK_THRESHOLD_CHARS = 4000;

/** Target size for each sub-chunk once splitting is necessary. */
export const CHUNK_TARGET_CHARS = 3000;

/**
 * Leading context repeated on every sub-chunk after the first, so a fragment
 * is still self-describing when it reaches the model.
 */
export const CHUNK_CONTEXT_CHARS = 300;

export type TextChunk = {
  subChunkIndex: number;
  content: string;
};

/**
 * Splits provision text into embeddable chunks.
 *
 * Returns a single chunk (index 0) when the text is under the threshold, which
 * is the common case and keeps citations clean.
 */
export function chunkProvisionText(
  text: string,
  options: {
    thresholdChars?: number;
    targetChars?: number;
  } = {}
): TextChunk[] {
  const threshold = options.thresholdChars ?? CHUNK_THRESHOLD_CHARS;
  const target = options.targetChars ?? CHUNK_TARGET_CHARS;

  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= threshold) return [{ subChunkIndex: 0, content: trimmed }];

  const lines = trimmed.split("\n");
  const chunks: string[] = [];
  let current: string[] = [];
  let currentLength = 0;

  for (const line of lines) {
    // Start a new chunk when adding this line would overshoot the target,
    // unless the current chunk is still empty (a single over-long line must
    // not produce an empty chunk).
    if (currentLength > 0 && currentLength + line.length + 1 > target) {
      chunks.push(current.join("\n"));
      current = [];
      currentLength = 0;
    }
    current.push(line);
    currentLength += line.length + 1;
  }
  if (current.length) chunks.push(current.join("\n"));

  return chunks
    .map((content, index) => ({ subChunkIndex: index, content: content.trim() }))
    .filter((chunk) => chunk.content.length > 0)
    .map((chunk, index) => ({ ...chunk, subChunkIndex: index }));
}

/**
 * Text actually sent to the embedding model. Prefixing the citation and heading
 * gives the vector some of the context a bare fragment lacks, which materially
 * helps short provisions ("(1) In this Act ...") match a plain-English question.
 */
export function buildEmbeddingText(input: {
  citation?: string | null;
  heading?: string | null;
  content: string;
}): string {
  return [input.citation?.trim(), input.heading?.trim(), input.content.trim()]
    .filter((part): part is string => Boolean(part))
    .join("\n");
}
