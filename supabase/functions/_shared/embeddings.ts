/**
 * Generates a 384-dimension embedding using Supabase's built-in gte-small model.
 * Only works inside deployed Edge Functions (not in local supabase functions serve).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // @ts-ignore — Supabase.ai is available in the Edge Function runtime
  const session = new Supabase.ai.Session('gte-small');
  const embedding: Float32Array = await session.run(text, {
    mean_pool: true,
    normalize: true,
  });
  return Array.from(embedding);
}

/** Maximum retries per chunk when rate-limited. */
const MAX_BACKOFF_RETRIES = 3;
/** Base delay in milliseconds for exponential backoff. */
const BASE_DELAY_MS = 1000;

/**
 * Generates an embedding with exponential backoff on 429 (rate limit) errors.
 * Retries up to MAX_BACKOFF_RETRIES times with delays of 1s, 2s, 4s.
 *
 * @param text - The text to embed.
 * @param onRateLimited - Optional callback invoked before each retry,
 *   with the attempt number (1-based) and delay in ms.
 * @throws After all retries are exhausted.
 */
export async function generateEmbeddingWithBackoff(
  text: string,
  onRateLimited?: (attempt: number, delayMs: number) => void
): Promise<number[]> {
  for (let attempt = 0; attempt <= MAX_BACKOFF_RETRIES; attempt++) {
    try {
      return await generateEmbedding(text);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const isRateLimit =
        message.includes('429') || message.toLowerCase().includes('rate limit');

      if (!isRateLimit || attempt === MAX_BACKOFF_RETRIES) {
        throw error;
      }

      const delayMs = BASE_DELAY_MS * Math.pow(2, attempt);
      onRateLimited?.(attempt + 1, delayMs);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Unreachable — loop always returns or throws
  throw new Error('Exhausted backoff retries for embedding generation');
}

/**
 * Splits text into overlapping chunks for embedding.
 * Splits on paragraph boundaries, merges small paragraphs, caps at maxChars.
 */
export function chunkText(text: string, maxChars = 500, overlap = 50): string[] {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    if (current.length + para.length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      // Keep overlap from end of previous chunk
      const overlapText = current.slice(-overlap);
      current = overlapText + ' ' + para;
    } else {
      current = current ? current + '\n\n' + para : para;
    }
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  // If no paragraph breaks, fall back to character splitting
  if (chunks.length === 0 && text.trim().length > 0) {
    let start = 0;
    while (start < text.length) {
      chunks.push(text.slice(start, start + maxChars).trim());
      start += maxChars - overlap;
    }
  }

  return chunks;
}
