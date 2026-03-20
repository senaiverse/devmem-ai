import { GoogleGenAI } from 'https://esm.sh/@google/genai@1.33.0';

/**
 * Creates a configured GoogleGenAI client.
 * Throws if GEMINI_API_KEY is not set in the environment.
 */
export function createGeminiClient(): GoogleGenAI {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Sends a prompt to Gemini and returns the raw text response.
 * Centralizes the interaction pattern used across all Edge Functions.
 */
export async function promptGemini(
  client: GoogleGenAI,
  prompt: string,
  model = 'gemini-2.5-flash'
): Promise<string> {
  const interaction = await client.interactions.create({ model, input: prompt });
  return interaction.outputs[interaction.outputs.length - 1].text || '';
}
