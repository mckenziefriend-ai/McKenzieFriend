/**
 * Embedding provider seam.
 *
 * The one place that knows which vendor produces vectors. Both the offline
 * indexing script and the app's query-time path go through this interface, so
 * switching provider means adding an implementation here and re-running the
 * indexer — nothing else changes.
 *
 * MODEL CHOICE: text-embedding-3-large requested at 1536 dimensions.
 *   - pgvector caps HNSW indexes at 2000 dimensions, so the model's native
 *     3072 cannot be indexed; 1536 can.
 *   - The text-embedding-3 family is trained with Matryoshka representation
 *     learning, so shortening via the `dimensions` parameter degrades
 *     gracefully instead of arbitrarily truncating meaning.
 *   - At equal dimensions 3-large retrieves better than 3-small, and the whole
 *     corpus costs pennies either way. For a tool where a missed provision
 *     means a litigant never finds the law that governs their case, recall is
 *     worth more than the difference.
 *
 * Every vector is stored with the model id and dimensions the provider
 * ACTUALLY reported (see EmbedResult), never a hardcoded constant — so a
 * silent provider-side change is detectable rather than corrupting the index.
 */

import OpenAI from "openai";

export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-large";

/** Must stay <= 2000 to remain indexable by pgvector HNSW. */
export const EMBEDDING_DIMENSIONS = 1536;

export type EmbedResult = {
  vectors: number[][];
  /** Model id as reported by the provider. */
  model: string;
  dimensions: number;
};

export interface EmbeddingProvider {
  readonly model: string;
  readonly dimensions: number;
  /** Embeds a batch of texts, preserving input order. */
  embed(texts: string[]): Promise<EmbedResult>;
}

export class EmbeddingError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "EmbeddingError";
  }
}

export function createOpenAIEmbeddingProvider(options: {
  apiKey: string;
  model?: string;
  dimensions?: number;
}): EmbeddingProvider {
  const model = options.model ?? DEFAULT_EMBEDDING_MODEL;
  const dimensions = options.dimensions ?? EMBEDDING_DIMENSIONS;
  const client = new OpenAI({ apiKey: options.apiKey });

  return {
    model,
    dimensions,

    async embed(texts: string[]): Promise<EmbedResult> {
      if (!texts.length) return { vectors: [], model, dimensions };
      if (texts.some((text) => !text.trim())) {
        throw new EmbeddingError("Refusing to embed empty text");
      }

      let response;
      try {
        response = await client.embeddings.create({ model, input: texts, dimensions });
      } catch (error) {
        throw new EmbeddingError(
          `Embedding request failed for ${texts.length} texts`,
          error
        );
      }

      // The API returns items with an index; do not assume ordering.
      const vectors: number[][] = new Array(texts.length);
      for (const item of response.data) {
        vectors[item.index] = item.embedding;
      }

      const missing = vectors.findIndex((v) => !v);
      if (missing !== -1) {
        throw new EmbeddingError(`Provider returned no vector for input ${missing}`);
      }

      const reportedModel = response.model ?? model;
      const reportedDims = vectors[0]?.length ?? dimensions;
      if (reportedDims !== dimensions) {
        throw new EmbeddingError(
          `Provider returned ${reportedDims} dimensions, expected ${dimensions}. ` +
            `Storing these would corrupt the index.`
        );
      }

      return { vectors, model: reportedModel, dimensions: reportedDims };
    },
  };
}
