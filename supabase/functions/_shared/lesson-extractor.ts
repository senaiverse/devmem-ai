import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { generateEmbedding } from './embeddings.ts';
import { createGeminiClient, promptGemini } from './gemini-client.ts';
import { classifyLesson, persistClassification } from './antipattern-classifier.ts';

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
  if (rawText.length <= 100) return 0;

  // Guard: skip if no Gemini key configured
  try { createGeminiClient(); } catch { return 0; }

  let lessonsCreated = 0;

  try {
    const client = createGeminiClient();
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

    const responseText = await promptGemini(client, prompt);
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      const lessons = JSON.parse(jsonMatch[0]);

      for (const lesson of lessons) {
        const { data: lessonData, error: lessonError } = await supabase
          .from('lessons')
          .upsert(
            {
              project_id: projectId,
              title: lesson.title,
              problem: lesson.problem,
              root_cause: lesson.root_cause,
              solution: lesson.solution,
              recommendation: lesson.recommendation,
              tags: lesson.tags || [],
              source_type: 'document',
              source_ref: documentId,
            },
            { onConflict: 'project_id,title', ignoreDuplicates: false },
          )
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

        await supabase.from('lesson_embeddings').upsert(
          { lesson_id: lessonData.id, embedding: JSON.stringify(lessonEmbedding) },
          { onConflict: 'lesson_id' },
        );

        // Classify for antipatterns (non-fatal)
        const classification = await classifyLesson({
          title: lesson.title,
          problem: lesson.problem,
          root_cause: lesson.root_cause,
          solution: lesson.solution,
          recommendation: lesson.recommendation,
          tags: lesson.tags || [],
        });
        await persistClassification(supabase, lessonData.id, classification);

        lessonsCreated++;
      }
    }
  } catch (aiError) {
    console.error('Gemini lesson extraction failed (non-fatal):', aiError);
  }

  return lessonsCreated;
}
