/**
 * embed-lesson Edge Function
 *
 * (Re-)generates a 384-dimension embedding for a lesson after a manual
 * create or edit. The embedding is stored in the `lesson_embeddings` table,
 * replacing any previous embedding for the same lesson.
 *
 * Request body: `{ lesson_id: string }`
 */
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { generateEmbedding } from '../_shared/embeddings.ts';
import { classifyLesson, persistClassification } from '../_shared/antipattern-classifier.ts';

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { lesson_id } = await req.json();

    if (!lesson_id) {
      return errorResponse('Missing required field: lesson_id');
    }

    const supabase = createAdminClient();

    // 1. Fetch the lesson (include all fields for re-classification)
    const { data: lesson, error: fetchError } = await supabase
      .from('lessons')
      .select('id, title, problem, root_cause, solution, recommendation, tags')
      .eq('id', lesson_id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!lesson) {
      return errorResponse(`Lesson ${lesson_id} not found`, 404);
    }

    // 2. Compose embedding text from relevant lesson fields
    const text = [lesson.title, lesson.problem, lesson.solution, lesson.recommendation]
      .filter(Boolean)
      .join(' ');

    // 3. Generate the embedding vector
    const embedding = await generateEmbedding(text);

    // 4. Atomic upsert into lesson_embeddings (uses UNIQUE constraint on lesson_id)
    const { error: upsertError } = await supabase
      .from('lesson_embeddings')
      .upsert(
        { lesson_id, embedding: JSON.stringify(embedding) },
        { onConflict: 'lesson_id' },
      );

    if (upsertError) throw upsertError;

    // 5. Re-classify for antipatterns (content may have changed)
    const tags = Array.isArray(lesson.tags) ? lesson.tags : [];
    const classification = await classifyLesson({
      title: lesson.title,
      problem: lesson.problem,
      root_cause: lesson.root_cause,
      solution: lesson.solution,
      recommendation: lesson.recommendation,
      tags,
    });
    await persistClassification(supabase, lesson_id, classification);

    return jsonResponse({ lesson_id, success: true });
  } catch (error) {
    console.error('embed-lesson error:', error);
    return errorResponse(`Embedding failed: ${(error as Error).message}`, 500);
  }
});
