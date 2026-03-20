/**
 * Edge Function: save-note
 *
 * Saves a personal note, guideline, standard, or decision as a lesson with
 * source_type='note'. Uses light AI structuring — Gemini organizes the content
 * but stays faithful to the original input (no fabrication).
 *
 * Unlike create-lesson-from-change (which extracts lessons from code diffs),
 * this function is designed for human-written knowledge that should be preserved
 * as-is, with optional AI-assisted tagging and categorization.
 */

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
    const { title, content, category } = body;

    if (!content) {
      return errorResponse('Missing required field: content');
    }

    const supabase = createAdminClient();
    const project = await resolveProject(supabase, body);

    // Light AI structuring — stays faithful to the input, no fabrication
    const prompt = `You are organizing a developer's note for a knowledge base.

IMPORTANT: Do NOT invent scenarios, examples, or details that are not in the original text.
Stay faithful to the developer's actual words. Your job is to structure and summarize,
not to fabricate.

${title ? `## Title\n${title}\n` : ''}
${category ? `## Category\n${category}\n` : ''}
## Content
${content}

Return a JSON object with these fields:
- title: string (use the provided title if given, otherwise create a concise title from the content)
- problem: string (the context or situation described — use "N/A" if the note is a guideline, not a problem)
- root_cause: string (underlying reason if applicable — use "N/A" if not a problem-solution note)
- solution: string (the guideline, standard, or decision described — summarize the content faithfully)
- recommendation: string (actionable takeaway from the note)
- tags: string[] (2-5 relevant tags extracted from the content)

Return ONLY the JSON object, no markdown fencing.`;

    const client = createGeminiClient();
    const responseText = await promptGemini(client, prompt);
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return errorResponse('Failed to parse structured note from LLM response', 500);
    }

    const lesson = JSON.parse(jsonMatch[0]);

    // Upsert as lesson with source_type='note' (dedup on project_id + title)
    const { data: lessonData, error: lessonError } = await supabase
      .from('lessons')
      .upsert(
        {
          project_id: project.id,
          title: lesson.title,
          problem: lesson.problem,
          root_cause: lesson.root_cause,
          solution: lesson.solution,
          recommendation: lesson.recommendation,
          tags: lesson.tags || [],
          source_type: 'note',
          source_ref: null,
        },
        { onConflict: 'project_id,title' },
      )
      .select()
      .single();

    if (lessonError) throw lessonError;

    // Embed for search
    const lessonText = [lesson.title, lesson.solution, lesson.recommendation]
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
    console.error('save-note error:', error);
    return errorResponse(`Failed to save note: ${(error as Error).message}`, 500);
  }
});
