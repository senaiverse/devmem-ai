/**
 * Edge Function: generate-lessons-from-doc
 *
 * On-demand lesson extraction from an existing document. More thorough
 * than auto-extraction during ingestion: extracts 1-5 lessons with a
 * larger text window (8000 chars) and returns created lesson IDs.
 *
 * Request body: `{ document_id, project_id|project_slug }`
 * Response: `{ created_lessons_count, lesson_ids, project }`
 */

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { generateEmbedding } from '../_shared/embeddings.ts';
import { createGeminiClient, promptGemini } from '../_shared/gemini-client.ts';
import { classifyLesson, persistClassification } from '../_shared/antipattern-classifier.ts';
import { resolveProject } from '../_shared/resolve-project.ts';

/** Maximum characters of document text sent to Gemini. */
const MAX_TEXT_LENGTH = 8000;

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const body = await req.json();
    const { document_id } = body;

    if (!document_id) {
      return errorResponse('Missing required field: document_id');
    }

    const supabase = createAdminClient();
    const project = await resolveProject(supabase, body);

    // 1. Fetch the document and validate ownership
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, project_id, title, category, raw_text')
      .eq('id', document_id)
      .single();

    if (docError || !doc) {
      return errorResponse(`Document not found: ${document_id}`, 404);
    }

    if (doc.project_id !== project.id) {
      return errorResponse('Document does not belong to this project', 403);
    }

    // 2. Get text content — use raw_text or stitch chunks if too large
    let textContent: string;

    if (doc.raw_text && doc.raw_text.length <= MAX_TEXT_LENGTH) {
      textContent = doc.raw_text;
    } else if (doc.raw_text && doc.raw_text.length > MAX_TEXT_LENGTH) {
      textContent = doc.raw_text.slice(0, MAX_TEXT_LENGTH);
    } else {
      // Fallback: stitch top chunks if raw_text is missing
      const { data: chunks } = await supabase
        .from('document_chunks')
        .select('content')
        .eq('document_id', document_id)
        .order('chunk_index', { ascending: true })
        .limit(10);

      textContent = chunks
        ? chunks.map((c: { content: string }) => c.content).join('\n\n')
        : '';
    }

    if (textContent.length < 50) {
      return errorResponse('Document content is too short for lesson extraction', 400);
    }

    // 2b. Clean up existing lessons for this document before re-generating
    const { data: oldLessons } = await supabase
      .from('lessons')
      .select('id')
      .eq('source_ref', document_id)
      .eq('source_type', 'document');
    if (oldLessons && oldLessons.length > 0) {
      const oldIds = oldLessons.map((l: { id: string }) => l.id);
      await supabase.from('lesson_embeddings').delete().in('lesson_id', oldIds);
      await supabase.from('lessons').delete().in('id', oldIds);
    }

    // 3. Prompt Gemini for 1-5 structured lessons
    const client = createGeminiClient();
    const prompt = `You are a software engineering knowledge extractor. Analyze this document thoroughly and extract 1-5 structured lessons that capture key decisions, patterns, solutions, or best practices.

Document title: ${doc.title}
Category: ${doc.category || 'general'}
Content:
${textContent}

Extract as many meaningful lessons as you can find (up to 5). Each lesson should capture a distinct piece of knowledge.

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

    if (!jsonMatch) {
      return errorResponse('Failed to parse lessons from LLM response', 500);
    }

    const extractedLessons = JSON.parse(jsonMatch[0]);
    const lessonIds: string[] = [];

    // 4. Insert each lesson with embedding and classification
    for (const lesson of extractedLessons) {
      try {
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
              source_type: 'document',
              source_ref: document_id,
            },
            { onConflict: 'project_id,title', ignoreDuplicates: false },
          )
          .select('id')
          .single();

        if (lessonError) {
          console.error('Failed to insert lesson:', lessonError);
          continue;
        }

        lessonIds.push(lessonData.id);

        // Generate embedding
        const embeddingText = [lesson.title, lesson.problem, lesson.solution, lesson.recommendation]
          .filter(Boolean)
          .join(' ');
        const embedding = await generateEmbedding(embeddingText);

        await supabase.from('lesson_embeddings').upsert(
          { lesson_id: lessonData.id, embedding: JSON.stringify(embedding) },
          { onConflict: 'lesson_id' },
        );

        // Classify antipatterns (non-fatal)
        const classification = await classifyLesson({
          title: lesson.title,
          problem: lesson.problem,
          root_cause: lesson.root_cause,
          solution: lesson.solution,
          recommendation: lesson.recommendation,
          tags: lesson.tags || [],
        });
        await persistClassification(supabase, lessonData.id, classification);
      } catch (lessonErr) {
        console.error('Lesson processing failed (non-fatal):', lessonErr);
      }
    }

    return jsonResponse({
      created_lessons_count: lessonIds.length,
      lesson_ids: lessonIds,
      project: { id: project.id, slug: project.slug, name: project.name },
    });
  } catch (error) {
    console.error('generate-lessons-from-doc error:', error);
    return errorResponse(`Lesson generation failed: ${(error as Error).message}`, 500);
  }
});
