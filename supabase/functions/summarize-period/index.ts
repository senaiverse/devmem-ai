/**
 * summarize-period Edge Function
 *
 * Summarizes improvements and patterns observed across lessons recorded
 * within a given time window for a project. Uses Gemini to produce a
 * thematic summary with follow-up recommendations.
 *
 * Request body: `{ project_id: string, from: string, to: string }`
 * Response: `{ summary: string, themes: Record<string, string[]>, follow_up: string }`
 */
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { createGeminiClient, promptGemini } from '../_shared/gemini-client.ts';

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { project_id, from, to } = await req.json();

    if (!project_id || !from || !to) {
      return errorResponse('Missing required fields: project_id, from, to');
    }

    const supabase = createAdminClient();

    // 1. Fetch lessons within the time window
    const { data: lessons, error: fetchError } = await supabase
      .from('lessons')
      .select('title, problem, solution, recommendation, tags, risk_level, antipattern_name, created_at')
      .eq('project_id', project_id)
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at', { ascending: true })
      .limit(50);

    if (fetchError) throw fetchError;

    // 2. Return static response when no lessons exist for the period
    if (!lessons || lessons.length === 0) {
      return jsonResponse({
        summary: 'No lessons were recorded during this period.',
        themes: {},
        follow_up: 'Consider importing documents or recording lessons for this time window.',
      });
    }

    // 3. Build compact lesson list for the prompt
    const lessonList = lessons
      .map((l, i) => {
        const date = l.created_at ? l.created_at.slice(0, 10) : 'unknown';
        const tags = Array.isArray(l.tags) ? l.tags.join(', ') : 'none';
        return `${i + 1}. [${date}] ${l.title}\n   Problem: ${l.problem || 'N/A'}\n   Solution: ${l.solution || 'N/A'}\n   Tags: ${tags}`;
      })
      .join('\n');

    // 4. Ask Gemini for a thematic summary
    const client = createGeminiClient();
    const prompt = `You are a software engineering improvement analyst. Analyze these ${lessons.length} lessons recorded between ${from} and ${to} and summarize what improved.

## Lessons
${lessonList}

Return a JSON object with:
- summary: string (3-5 sentence overview of improvements and patterns during this period)
- themes: object where keys are theme names (e.g., "Testing", "Security", "Performance", "Architecture", "Developer Experience") and values are arrays of bullet-point strings describing improvements in that theme. Only include themes that have relevant lessons.
- follow_up: string (1-2 sentences suggesting areas still needing attention)

Return ONLY the JSON object, no markdown fencing.`;

    const responseText = await promptGemini(client, prompt);
    const jsonMatch = responseText.match(/{[\s\S]*}/);

    if (!jsonMatch) {
      return errorResponse('Failed to parse summary from LLM response', 500);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return jsonResponse({
      summary: parsed.summary,
      themes: parsed.themes,
      follow_up: parsed.follow_up,
    });
  } catch (error) {
    console.error('summarize-period error:', error);
    return errorResponse(`Summary generation failed: ${(error as Error).message}`, 500);
  }
});
