import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { generateEmbedding } from '../_shared/embeddings.ts';
import { createGeminiClient, promptGemini } from '../_shared/gemini-client.ts';
import { classifyLesson, persistClassification } from '../_shared/antipattern-classifier.ts';

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { project_id, diff_summary, error_log, notes } = await req.json();

    if (!project_id) {
      return errorResponse('Missing required field: project_id');
    }

    if (!diff_summary && !error_log && !notes) {
      return errorResponse('At least one of diff_summary, error_log, or notes is required');
    }

    // Build the prompt
    const contextParts: string[] = [];
    if (diff_summary) contextParts.push(`## Code Change\n${diff_summary}`);
    if (error_log) contextParts.push(`## Error / Stack Trace\n${error_log}`);
    if (notes) contextParts.push(`## Developer Notes\n${notes}`);

    const prompt = `You are a software engineering knowledge extractor. Based on this code change / error fix, create a structured lesson for the team's knowledge base.

${contextParts.join('\n\n')}

Return a JSON object with these fields:
- title: string (concise lesson title)
- problem: string (what went wrong or what needed to change)
- root_cause: string (why this happened)
- solution: string (what was done to fix/improve it)
- recommendation: string (what to do in the future to prevent this)
- tags: string[] (2-5 relevant tags)

Return ONLY the JSON object, no markdown fencing.`;

    const client = createGeminiClient();
    const responseText = await promptGemini(client, prompt);
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return errorResponse('Failed to parse structured lesson from LLM response', 500);
    }

    const lesson = JSON.parse(jsonMatch[0]);

    const supabase = createAdminClient();

    // Insert lesson
    const { data: lessonData, error: lessonError } = await supabase
      .from('lessons')
      .insert({
        project_id,
        title: lesson.title,
        problem: lesson.problem,
        root_cause: lesson.root_cause,
        solution: lesson.solution,
        recommendation: lesson.recommendation,
        tags: lesson.tags || [],
        source_type: 'change',
        source_ref: null,
      })
      .select()
      .single();

    if (lessonError) throw lessonError;

    // Embed the lesson
    const lessonText = [lesson.title, lesson.problem, lesson.solution, lesson.recommendation]
      .filter(Boolean)
      .join(' ');
    const embedding = await generateEmbedding(lessonText);

    await supabase.from('lesson_embeddings').insert({
      lesson_id: lessonData.id,
      embedding: JSON.stringify(embedding),
    });

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

    return jsonResponse({ lesson: lessonData });
  } catch (error) {
    console.error('create-lesson-from-change error:', error);
    return errorResponse(`Failed to create lesson: ${error.message}`, 500);
  }
});
