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
import { createGeminiClient, promptGemini } from '../_shared/gemini-client.ts';

/** Valid risk levels returned by the classification prompt. */
const VALID_RISK_LEVELS = ['none', 'low', 'medium', 'high'] as const;
type RiskLevel = (typeof VALID_RISK_LEVELS)[number];

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

    const client = createGeminiClient();
    let classifiedCount = 0;
    let errorCount = 0;

    // 2. Classify each lesson sequentially
    for (const lesson of lessons) {
      try {
        const tagsDisplay = Array.isArray(lesson.tags)
          ? lesson.tags.join(', ')
          : 'none';

        const prompt = `You are a software architecture reviewer. Analyze this lesson and determine if it describes a software antipattern, technical debt, or risky practice.

Lesson title: ${lesson.title}
Problem: ${lesson.problem || 'N/A'}
Root cause: ${lesson.root_cause || 'N/A'}
Solution: ${lesson.solution || 'N/A'}
Recommendation: ${lesson.recommendation || 'N/A'}
Tags: ${tagsDisplay}

Return a JSON object with:
- risk_level: "none" | "low" | "medium" | "high" (none = not an antipattern, low = minor code smell, medium = notable risk, high = critical antipattern. Most lessons should be "none".)
- antipattern_name: string or null (canonical name like "God Object", "Shotgun Surgery", "Premature Optimization". null if risk_level is "none")
- antipattern_reason: string or null (1-2 sentence explanation. null if risk_level is "none")

Return ONLY the JSON object, no markdown fencing.`;

        const responseText = await promptGemini(client, prompt);
        const jsonMatch = responseText.match(/{[\s\S]*}/);

        if (!jsonMatch) {
          console.error(`No JSON found in response for lesson ${lesson.id}`);
          errorCount++;
          continue;
        }

        const parsed = JSON.parse(jsonMatch[0]);
        const riskLevel: RiskLevel = VALID_RISK_LEVELS.includes(parsed.risk_level)
          ? parsed.risk_level
          : 'none';

        const { error: updateError } = await supabase
          .from('lessons')
          .update({
            risk_level: riskLevel,
            antipattern_name: riskLevel === 'none' ? null : (parsed.antipattern_name || null),
            antipattern_reason: riskLevel === 'none' ? null : (parsed.antipattern_reason || null),
          })
          .eq('id', lesson.id);

        if (updateError) {
          console.error(`Failed to update lesson ${lesson.id}:`, updateError);
          errorCount++;
          continue;
        }

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
