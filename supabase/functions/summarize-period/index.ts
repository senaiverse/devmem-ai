/**
 * summarize-period Edge Function
 *
 * Summarizes improvements and patterns observed across lessons recorded
 * within a given time window for a project. Uses Gemini to produce a
 * thematic summary with follow-up recommendations and focus area analysis.
 *
 * Caches results in the period_summaries table (24h TTL) to avoid
 * redundant Gemini calls. Pass force_refresh=true to bypass cache.
 *
 * Request body: `{ project_id|project_slug, from, to, force_refresh? }`
 * Response: `{ summary, themes, follow_up, focusAreas, project }`
 */
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { createGeminiClient, promptGemini } from '../_shared/gemini-client.ts';
import { resolveProject } from '../_shared/resolve-project.ts';
import { computeFocusAreas } from '../_shared/theme-mapper.ts';

/** Cache TTL in hours. Summaries older than this are regenerated. */
const CACHE_TTL_HOURS = 24;

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const body = await req.json();
    const { from, to, force_refresh } = body;

    if (!from || !to) {
      return errorResponse('Missing required fields: from, to');
    }

    const supabase = createAdminClient();
    const project = await resolveProject(supabase, body);
    const project_id = project.id;

    // --- Cache check (unless force_refresh) ---
    if (!force_refresh) {
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - CACHE_TTL_HOURS);

      const { data: cached } = await supabase
        .from('period_summaries')
        .select('summary, themes, follow_up, focus_areas, generated_at')
        .eq('project_id', project_id)
        .eq('from_date', from)
        .eq('to_date', to)
        .gte('generated_at', cutoff.toISOString())
        .maybeSingle();

      if (cached) {
        return jsonResponse({
          summary: cached.summary,
          themes: cached.themes,
          follow_up: cached.follow_up,
          focusAreas: cached.focus_areas,
          cached: true,
          project: { id: project.id, slug: project.slug, name: project.name },
        });
      }
    }

    // --- Fetch lessons within the time window ---
    const { data: lessons, error: fetchError } = await supabase
      .from('lessons')
      .select('title, problem, solution, recommendation, tags, risk_level, antipattern_name, created_at')
      .eq('project_id', project_id)
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at', { ascending: true })
      .limit(50);

    if (fetchError) throw fetchError;

    // --- No lessons: return static response ---
    if (!lessons || lessons.length === 0) {
      return jsonResponse({
        summary: 'No lessons were recorded during this period.',
        themes: {},
        follow_up: 'Consider importing documents or recording lessons for this time window.',
        focusAreas: { strong: [], weak: [], counts: {} },
        project: { id: project.id, slug: project.slug, name: project.name },
      });
    }

    // --- Compute focus areas from tags ---
    const focusAreas = computeFocusAreas(lessons);

    // --- Build compact lesson list for the prompt ---
    const lessonList = lessons
      .map((l, i) => {
        const date = l.created_at ? l.created_at.slice(0, 10) : 'unknown';
        const tags = Array.isArray(l.tags) ? l.tags.join(', ') : 'none';
        return `${i + 1}. [${date}] ${l.title}\n   Problem: ${l.problem || 'N/A'}\n   Solution: ${l.solution || 'N/A'}\n   Tags: ${tags}`;
      })
      .join('\n');

    // --- Build focus areas context for the prompt ---
    const focusContext = focusAreas.weak.length > 0
      ? `\n\nFocus Area Analysis:\n- Strong themes: ${focusAreas.strong.join(', ') || 'none'}\n- Weak themes needing attention: ${focusAreas.weak.join(', ')}\nIncorporate these weak areas into your follow_up recommendation.`
      : '';

    // --- Ask Gemini for a thematic summary ---
    const client = createGeminiClient();
    const prompt = `You are a software engineering improvement analyst. Analyze these ${lessons.length} lessons recorded between ${from} and ${to} and summarize what improved.

## Lessons
${lessonList}${focusContext}

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

    const result = {
      summary: parsed.summary,
      themes: parsed.themes,
      follow_up: parsed.follow_up,
      focusAreas,
    };

    // --- Upsert into cache ---
    await supabase
      .from('period_summaries')
      .upsert(
        {
          project_id,
          from_date: from,
          to_date: to,
          summary: result.summary,
          themes: result.themes,
          follow_up: result.follow_up,
          focus_areas: result.focusAreas,
          generated_at: new Date().toISOString(),
        },
        { onConflict: 'project_id,from_date,to_date' },
      )
      .then(({ error }) => {
        if (error) console.error('Cache upsert failed (non-fatal):', error);
      });

    return jsonResponse({
      ...result,
      cached: false,
      project: { id: project.id, slug: project.slug, name: project.name },
    });
  } catch (error) {
    console.error('summarize-period error:', error);
    return errorResponse(`Summary generation failed: ${(error as Error).message}`, 500);
  }
});
