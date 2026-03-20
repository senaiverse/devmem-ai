import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { generateEmbedding } from '../_shared/embeddings.ts';
import { createGeminiClient, promptGemini } from '../_shared/gemini-client.ts';
import { resolveProject } from '../_shared/resolve-project.ts';

/** Tags that boost similarity scores in error mode. */
const ERROR_BOOST_TAGS = new Set([
  'bug', 'incident', 'diagnosis', 'fix', 'config',
  'error', 'crash', 'regression', 'hotfix', 'outage',
]);

/** Similarity bonus applied to lessons with error-relevant tags. */
const TAG_BOOST = 0.15;

/** Risk-level weights for antipattern mode re-ranking. */
const RISK_WEIGHTS: Record<string, number> = {
  high: 0.3,
  medium: 0.2,
  low: 0.1,
  none: 0,
};

/**
 * Parses a structured JSON response from Gemini for error/antipattern modes.
 * Validates lesson IDs against the actual fetched set to prevent hallucination.
 */
function parseStructuredResponse(
  responseText: string,
  validLessonIds: Set<string>,
  lessons: Array<Record<string, unknown>>
): {
  answer: string;
  similar_lessons: Array<{ lesson_id: string; title: string; reason: string }>;
  suggested_steps: string[];
} {
  const jsonMatch = responseText.match(/{[\s\S]*}/);

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);

      let similarLessons = Array.isArray(parsed.similar_lessons)
        ? parsed.similar_lessons.filter(
            (sl: { lesson_id: string }) => validLessonIds.has(sl.lesson_id)
          )
        : [];

      similarLessons = similarLessons.map(
        (sl: { lesson_id: string; title: string; reason: string }) => {
          const actual = lessons.find((l) => l.id === sl.lesson_id);
          return {
            lesson_id: sl.lesson_id,
            title: (actual?.title as string) || sl.title,
            reason: sl.reason,
          };
        }
      );

      return {
        answer: parsed.summary || responseText,
        similar_lessons: similarLessons,
        suggested_steps: Array.isArray(parsed.suggested_steps)
          ? parsed.suggested_steps
          : [],
      };
    } catch {
      return { answer: responseText, similar_lessons: [], suggested_steps: [] };
    }
  }

  return {
    answer: responseText || 'No analysis generated.',
    similar_lessons: [],
    suggested_steps: [],
  };
}

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const body = await req.json();
    const { query, mode = 'question' } = body;

    if (!query) {
      return errorResponse('Missing required field: query');
    }

    const supabase = createAdminClient();
    const project = await resolveProject(supabase, body);
    const project_id = project.id;

    const isErrorMode = mode === 'error';
    const isAntipatternMode = mode === 'antipattern';
    const isStructuredMode = isErrorMode || isAntipatternMode;

    // 1. Embed the query
    const queryEmbedding = await generateEmbedding(query);

    // 2. Search document chunks
    const { data: chunkMatches, error: chunkError } = await supabase.rpc(
      'match_document_chunks',
      {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: isStructuredMode ? 0.2 : 0.3,
        match_count: isStructuredMode ? 10 : 5,
        filter_project_id: project_id,
      }
    );
    if (chunkError) console.error('Chunk search error:', chunkError);

    // 3. Search lesson embeddings (wider net in structured modes)
    const { data: lessonMatches, error: lessonError } = await supabase.rpc(
      'match_lesson_embeddings',
      {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: isStructuredMode ? 0.2 : 0.3,
        match_count: isStructuredMode ? 20 : 5,
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

    // 4b. In antipattern mode, also fetch lessons with known risk (merge by dedup)
    if (isAntipatternMode) {
      const { data: riskyLessons } = await supabase
        .from('lessons')
        .select('*')
        .eq('project_id', project_id)
        .neq('risk_level', 'none')
        .order('created_at', { ascending: false })
        .limit(10);

      if (riskyLessons) {
        const existingIds = new Set(lessons.map((l) => l.id as string));
        for (const rl of riskyLessons) {
          if (!existingIds.has(rl.id)) {
            lessons.push(rl);
          }
        }
      }
    }

    // 5. In structured modes, re-rank and take top 5
    if (isStructuredMode && lessons.length > 0) {
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

        const tagBoostA = tagsA.some((t) => ERROR_BOOST_TAGS.has(t.toLowerCase())) ? TAG_BOOST : 0;
        const tagBoostB = tagsB.some((t) => ERROR_BOOST_TAGS.has(t.toLowerCase())) ? TAG_BOOST : 0;

        const riskA = isAntipatternMode ? (RISK_WEIGHTS[(a.risk_level as string) || 'none'] || 0) : 0;
        const riskB = isAntipatternMode ? (RISK_WEIGHTS[(b.risk_level as string) || 'none'] || 0) : 0;

        return (simB + tagBoostB + riskB) - (simA + tagBoostA + riskA);
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

    // 7. Call Gemini — different prompts per mode
    const client = createGeminiClient();
    let answer: string;
    let similar_lessons: Array<{ lesson_id: string; title: string; reason: string }> | undefined;
    let suggested_steps: string[] | undefined;

    const validIds = new Set(lessons.map((l) => l.id as string));

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
      const parsed = parseStructuredResponse(responseText, validIds, lessons);
      answer = parsed.answer;
      similar_lessons = parsed.similar_lessons;
      suggested_steps = parsed.suggested_steps;

    } else if (isAntipatternMode) {
      const lessonContext = lessons.map((l) =>
        `- ID: ${l.id}, Title: "${l.title}", Risk: ${l.risk_level || 'none'}, Antipattern: ${l.antipattern_name || 'N/A'}, Reason: ${l.antipattern_reason || 'N/A'}, Problem: ${l.problem || 'N/A'}`
      ).join('\n');

      const antipatternPrompt = `You are a software architecture reviewer. A developer is asking about antipatterns and risky practices in their project. Analyze using ONLY the project knowledge below.

## Project Knowledge
${context || 'No relevant context found.'}

## Known Antipatterns & Risky Lessons
${lessonContext || 'None identified yet.'}

## Developer Query
${query}

Return a JSON object with:
- summary: string (analysis of antipattern risks relevant to the query)
- similar_lessons: array of objects { lesson_id: string, title: string, reason: string } (lessons from the list above that are relevant. Use exact IDs from the Available list only.)
- suggested_steps: array of strings (3-5 concrete steps to address or mitigate the identified risks)

Return ONLY the JSON object, no markdown fencing.`;

      const responseText = await promptGemini(client, antipatternPrompt);
      const parsed = parseStructuredResponse(responseText, validIds, lessons);
      answer = parsed.answer;
      similar_lessons = parsed.similar_lessons;
      suggested_steps = parsed.suggested_steps;

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
      project: { id: project.id, slug: project.slug, name: project.name },
    };

    if (isStructuredMode) {
      response.similar_lessons = similar_lessons;
      response.suggested_steps = suggested_steps;
    }

    return jsonResponse(response);
  } catch (error) {
    console.error('search error:', error);
    return errorResponse(`Search failed: ${(error as Error).message}`, 500);
  }
});
