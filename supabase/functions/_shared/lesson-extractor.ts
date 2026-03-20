import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI } from 'https://esm.sh/@google/genai@1.33.0';
import { generateEmbedding } from './embeddings.ts';

/**
 * Extracts structured lessons from document text via Gemini,
 * inserts them into lessons + lesson_embeddings tables.
 * Returns the number of lessons successfully created.
 * Failures are non-fatal — logs errors and returns 0.
 */
export async function extractAndInsertLessons(
  supabase: SupabaseClient,
  projectId: string,
  documentId: string,
  title: string,
  category: string,
  rawText: string
): Promise<number> {
  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiKey || rawText.length <= 100) return 0;

  let lessonsCreated = 0;

  try {
    const client = new GoogleGenAI({ apiKey: geminiKey });
    const prompt = `You are a software engineering knowledge extractor. Analyze this document and extract 1-3 structured lessons that capture key decisions, patterns, or solutions.

Document title: ${title}
Category: ${category || 'general'}
Content:
${rawText.slice(0, 4000)}

Return a JSON array of lessons. Each lesson must have these fields:
- title: string (concise lesson title)
- problem: string (what problem or question this addresses)
- root_cause: string (underlying reason or context)
- solution: string (what was decided or implemented)
- recommendation: string (guidance for future reference)
- tags: string[] (2-5 relevant tags)

Return ONLY the JSON array, no markdown fencing.`;

    const interaction = await client.interactions.create({
      model: 'gemini-2.5-flash',
      input: prompt,
    });

    const responseText = interaction.outputs[interaction.outputs.length - 1].text || '';
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      const lessons = JSON.parse(jsonMatch[0]);

      for (const lesson of lessons) {
        const { data: lessonData, error: lessonError } = await supabase
          .from('lessons')
          .insert({
            project_id: projectId,
            title: lesson.title,
            problem: lesson.problem,
            root_cause: lesson.root_cause,
            solution: lesson.solution,
            recommendation: lesson.recommendation,
            tags: lesson.tags || [],
            source_type: 'document',
            source_ref: documentId,
          })
          .select('id')
          .single();

        if (lessonError) {
          console.error('Failed to insert lesson:', lessonError);
          continue;
        }

        const lessonText = [lesson.title, lesson.problem, lesson.solution, lesson.recommendation]
          .filter(Boolean)
          .join(' ');
        const lessonEmbedding = await generateEmbedding(lessonText);

        await supabase.from('lesson_embeddings').insert({
          lesson_id: lessonData.id,
          embedding: JSON.stringify(lessonEmbedding),
        });

        lessonsCreated++;
      }
    }
  } catch (aiError) {
    console.error('Gemini lesson extraction failed (non-fatal):', aiError);
  }

  return lessonsCreated;
}
