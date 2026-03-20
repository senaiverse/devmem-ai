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
