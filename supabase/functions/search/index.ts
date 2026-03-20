import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { generateEmbedding } from '../_shared/embeddings.ts';
import { createGeminiClient, promptGemini } from '../_shared/gemini-client.ts';

/** Tags that boost similarity scores in error mode. */
const ERROR_BOOST_TAGS = new Set([
  'bug', 'incident', 'diagnosis', 'fix', 'config',
  'error', 'crash', 'regression', 'hotfix', 'outage',
]);

/** Similarity bonus applied to lessons with error-relevant tags. */
const TAG_BOOST = 0.15;

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { project_id, query, mode = 'question' } = await req.json();

    if (!project_id || !query) {
      return errorResponse('Missing required fields: project_id, query');
    }

    const supabase = createAdminClient();
    const isErrorMode = mode === 'error';

    // 1. Embed the query
    const queryEmbedding = await generateEmbedding(query);

    // 2. Search document chunks
    const { data: chunkMatches, error: chunkError } = await supabase.rpc(
      'match_document_chunks',
      {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: isErrorMode ? 0.2 : 0.3,
        match_count: isErrorMode ? 10 : 5,
        filter_project_id: project_id,
      }
    );
    if (chunkError) console.error('Chunk search error:', chunkError);

    // 3. Search lesson embeddings (wider net in error mode)
    const { data: lessonMatches, error: lessonError } = await supabase.rpc(
      'match_lesson_embeddings',
      {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: isErrorMode ? 0.2 : 0.3,
        match_count: isErrorMode ? 20 : 5,
        filter_project_id: project_id,
      }
    );
    if (lessonError) console.error('Lesson search error:', lessonError);

    // 4. Fetch full lesson records for matched lesson embeddings
    const lessonIds = (lessonMatches || []).map((m: { lesson_id: string }) => m.lesson_id);
    let lessons: Array<Record<string, unknown>> = [];
    if (lessonIds.length > 0) {
      const { data } = await supabase
        .from('lessons')
        .select('*')
        .in('id', lessonIds);
      lessons = data || [];
    }

    // 5. In error mode, re-rank with tag boosting and take top 5
    if (isErrorMode && lessons.length > 0) {
      const similarityMap = new Map(
        (lessonMatches || []).map((m: { lesson_id: string; similarity: number }) => [
          m.lesson_id,
          m.similarity,
        ])
      );

      lessons.sort((a, b) => {
        const simA = similarityMap.get(a.id as string) || 0;
        const simB = similarityMap.get(b.id as string) || 0;

        const tagsA = Array.isArray(a.tags) ? a.tags as string[] : [];
        const tagsB = Array.isArray(b.tags) ? b.tags as string[] : [];

        const boostA = tagsA.some((t) => ERROR_BOOST_TAGS.has(t.toLowerCase())) ? TAG_BOOST : 0;
        const boostB = tagsB.some((t) => ERROR_BOOST_TAGS.has(t.toLowerCase())) ? TAG_BOOST : 0;

        return (simB + boostB) - (simA + boostA);
      });

      lessons = lessons.slice(0, 5);
    }

    // 6. Build context for RAG prompt
    const contextParts: string[] = [];

    for (const lesson of lessons) {
      contextParts.push(
        `[Lesson: ${lesson.title}]\nProblem: ${lesson.problem}\nSolution: ${lesson.solution}\nRecommendation: ${lesson.recommendation}`
      );
    }

    for (const chunk of chunkMatches || []) {
      contextParts.push(`[Document Excerpt]\n${chunk.content}`);
    }

    const context = contextParts.join('\n\n---\n\n');

    // 7. Call Gemini — different prompts for question vs error mode
    const client = createGeminiClient();
    let answer: string;
    let similar_lessons: Array<{ lesson_id: string; title: string; reason: string }> | undefined;
    let suggested_steps: string[] | undefined;

    if (isErrorMode) {
      const lessonContext = lessons.map((l) =>
        `- ID: ${l.id}, Title: "${l.title}", Problem: ${l.problem || 'N/A'}, Solution: ${l.solution || 'N/A'}`
      ).join('\n');

      const errorPrompt = `You are a software debugging assistant. A developer has pasted an error or stack trace. Analyze it using ONLY the project knowledge below.

## Project Knowledge
${context || 'No relevant context found.'}

## Available Lessons
${lessonContext || 'None'}

## Error / Stack Trace
${query}

Return a JSON object with:
- summary: string (2-3 sentence analysis of the error and whether it matches known issues)
- similar_lessons: array of objects { lesson_id: string, title: string, reason: string } (only include lessons from the Available Lessons list above whose IDs match exactly. If none are relevant, use an empty array)
- suggested_steps: array of strings (3-5 concrete resolution steps based on the context)

Return ONLY the JSON object, no markdown fencing.`;

      const responseText = await promptGemini(client, errorPrompt);
      const jsonMatch = responseText.match(/{[\s\S]*}/);

      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          answer = parsed.summary || responseText;

          // Validate lesson IDs against actual fetched set
          const validIds = new Set(lessons.map((l) => l.id as string));
          similar_lessons = Array.isArray(parsed.similar_lessons)
            ? parsed.similar_lessons.filter(
                (sl: { lesson_id: string }) => validIds.has(sl.lesson_id)
              )
            : [];

          // Map titles from actual data to prevent hallucination
          similar_lessons = similar_lessons!.map((sl) => {
            const actual = lessons.find((l) => l.id === sl.lesson_id);
            return {
              lesson_id: sl.lesson_id,
              title: (actual?.title as string) || sl.title,
              reason: sl.reason,
            };
          });

          suggested_steps = Array.isArray(parsed.suggested_steps)
            ? parsed.suggested_steps
            : [];
        } catch {
          // JSON parse failed — use raw text as answer
          answer = responseText;
          similar_lessons = [];
          suggested_steps = [];
        }
      } else {
        answer = responseText || 'No analysis generated.';
        similar_lessons = [];
        suggested_steps = [];
      }
    } else {
      // Standard question mode
      const ragPrompt = `You are a knowledgeable software engineering assistant. Answer the following question based ONLY on the project knowledge provided below. If the context doesn't contain enough information to answer fully, say so.

## Project Knowledge
${context || 'No relevant context found.'}

## Question
${query}

Provide a clear, concise answer. Reference specific lessons or documents when relevant.`;

      answer = await promptGemini(client, ragPrompt) || 'No answer generated.';
    }

    // 8. Build sources list
    const sources = [
      ...lessons.map((l) => ({
        type: 'lesson' as const,
        id: l.id as string,
        title: l.title as string,
      })),
      ...(chunkMatches || []).map((c: { id: string; document_id: string; chunk_index?: number; content: string }) => ({
        type: 'chunk' as const,
        id: c.id,
        document_id: c.document_id,
        content: (c.content as string).slice(0, 200),
      })),
    ];

    // 9. Store in questions table
    const { data: questionData, error: questionError } = await supabase
      .from('questions')
      .insert({
        project_id,
        question: query,
        answer,
        sources: JSON.stringify(sources),
      })
      .select('id')
      .single();

    if (questionError) console.error('Failed to save question:', questionError);

    const response: Record<string, unknown> = {
      answer,
      sources,
      question_id: questionData?.id || null,
    };

    if (isErrorMode) {
      response.similar_lessons = similar_lessons;
      response.suggested_steps = suggested_steps;
    }

    return jsonResponse(response);
  } catch (error) {
    console.error('search error:', error);
    return errorResponse(`Search failed: ${(error as Error).message}`, 500);
  }
});
