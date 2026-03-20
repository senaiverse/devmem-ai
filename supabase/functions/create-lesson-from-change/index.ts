import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { generateEmbedding } from '../_shared/embeddings.ts';
import { createGeminiClient, promptGemini } from '../_shared/gemini-client.ts';
import { classifyLesson, persistClassification } from '../_shared/antipattern-classifier.ts';
import { resolveProject } from '../_shared/resolve-project.ts';

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const body = await req.json();
    const { diff_summary, error_log, notes, commit_message } = body;

    const supabase = createAdminClient();
    const project = await resolveProject(supabase, body);
    const project_id = project.id;

    if (!diff_summary && !error_log && !notes) {
      return errorResponse('At least one of diff_summary, error_log, or notes is required');
    }

    // Build the prompt
    const contextParts: string[] = [];
    if (commit_message) contextParts.push(`## Commit Message\n${commit_message}`);
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

    // Upsert lesson (dedup on project_id + title)
    const { data: lessonData, error: lessonError } = await supabase
      .from('lessons')
      .upsert(
        {
          project_id,
          title: lesson.title,
          problem: lesson.problem,
          root_cause: lesson.root_cause,
          solution: lesson.solution,
          recommendation: lesson.recommendation,
          tags: lesson.tags || [],
          source_type: 'change',
          source_ref: null,
        },
        { onConflict: 'project_id,title' },
      )
      .select()
      .single();

    if (lessonError) throw lessonError;

    // Embed the lesson
    const lessonText = [lesson.title, lesson.problem, lesson.solution, lesson.recommendation]
      .filter(Boolean)
      .join(' ');
    const embedding = await generateEmbedding(lessonText);

    await supabase.from('lesson_embeddings').upsert(
      { lesson_id: lessonData.id, embedding: JSON.stringify(embedding) },
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

    return jsonResponse({
      lesson: lessonData,
      project: { id: project.id, slug: project.slug, name: project.name },
    });
  } catch (error) {
    console.error('create-lesson-from-change error:', error);
    return errorResponse(`Failed to create lesson: ${(error as Error).message}`, 500);
  }
});
