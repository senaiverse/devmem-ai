import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { generateEmbedding } from '../_shared/embeddings.ts';
import { GoogleGenAI } from 'https://esm.sh/@google/genai@1.33.0';

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { project_id, query } = await req.json();

    if (!project_id || !query) {
      return errorResponse('Missing required fields: project_id, query');
    }

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) {
      return errorResponse('GEMINI_API_KEY not configured', 500);
    }

    const supabase = createAdminClient();

    // 1. Embed the query
    const queryEmbedding = await generateEmbedding(query);

    // 2. Search document chunks
    const { data: chunkMatches, error: chunkError } = await supabase.rpc(
      'match_document_chunks',
      {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: 0.3,
        match_count: 5,
        filter_project_id: project_id,
      }
    );
    if (chunkError) console.error('Chunk search error:', chunkError);

    // 3. Search lesson embeddings
    const { data: lessonMatches, error: lessonError } = await supabase.rpc(
      'match_lesson_embeddings',
      {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: 0.3,
        match_count: 5,
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

    // 5. Build context for RAG prompt
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

    // 6. Call Gemini for RAG answer
    const ragPrompt = `You are a knowledgeable software engineering assistant. Answer the following question based ONLY on the project knowledge provided below. If the context doesn't contain enough information to answer fully, say so.

## Project Knowledge
${context || 'No relevant context found.'}

## Question
${query}

Provide a clear, concise answer. Reference specific lessons or documents when relevant.`;

    const client = new GoogleGenAI({ apiKey: geminiKey });
    const interaction = await client.interactions.create({
      model: 'gemini-2.5-flash',
      input: ragPrompt,
    });

    const answer = interaction.outputs[interaction.outputs.length - 1].text || 'No answer generated.';

    // 7. Build sources list
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

    // 8. Store in questions table
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

    return jsonResponse({
      answer,
      sources,
      question_id: questionData?.id || null,
    });
  } catch (error) {
    console.error('search error:', error);
    return errorResponse(`Search failed: ${error.message}`, 500);
  }
});
