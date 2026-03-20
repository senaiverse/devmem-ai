/**
 * classify-lessons Edge Function
 *
 * Bulk-classifies all unclassified lessons for a given project.
 * Iterates through lessons where `risk_level` is still 'none' and
 * `antipattern_name` is NULL, sending each to Gemini for analysis.
 *
 * Request body: `{ project_id: string }`
 * Response: `{ classified_count: number, errors: number }`
 */
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { classifyLesson, persistClassification } from '../_shared/antipattern-classifier.ts';

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { project_id } = await req.json();

    if (!project_id) {
      return errorResponse('Missing required field: project_id');
    }

    const supabase = createAdminClient();

    // 1. Fetch all unclassified lessons for this project
    const { data: lessons, error: fetchError } = await supabase
      .from('lessons')
      .select('id, title, problem, root_cause, solution, recommendation, tags')
      .eq('project_id', project_id)
      .eq('risk_level', 'none')
      .is('antipattern_name', null);

    if (fetchError) throw fetchError;

    if (!lessons || lessons.length === 0) {
      return jsonResponse({ classified_count: 0, errors: 0 });
    }

    let classifiedCount = 0;
    let errorCount = 0;

    // 2. Classify each lesson sequentially using shared classifier
    for (const lesson of lessons) {
      try {
        const tags = Array.isArray(lesson.tags) ? lesson.tags : [];
        const result = await classifyLesson({
          title: lesson.title,
          problem: lesson.problem,
          root_cause: lesson.root_cause,
          solution: lesson.solution,
          recommendation: lesson.recommendation,
          tags,
        });

        await persistClassification(supabase, lesson.id, result);
        classifiedCount++;
      } catch (lessonError) {
        console.error(`Classification failed for lesson ${lesson.id}:`, lessonError);
        errorCount++;
        continue;
      }
    }

    return jsonResponse({ classified_count: classifiedCount, errors: errorCount });
  } catch (error) {
    console.error('classify-lessons error:', error);
    return errorResponse(`Classification failed: ${(error as Error).message}`, 500);
  }
});
