import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { generateEmbedding, chunkText } from '../_shared/embeddings.ts';
import { GoogleGenAI } from 'https://esm.sh/@google/genai@1.33.0';

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { project_id, path, title, category, raw_text } = await req.json();

    if (!project_id || !title || !raw_text) {
      return errorResponse('Missing required fields: project_id, title, raw_text');
    }

    const supabase = createAdminClient();

    // 1. Upsert document (match on project_id + path)
    let documentId: string;
    if (path) {
      const { data: existing } = await supabase
        .from('documents')
        .select('id')
        .eq('project_id', project_id)
        .eq('path', path)
        .maybeSingle();

      if (existing) {
        documentId = existing.id;
        await supabase
          .from('documents')
          .update({ title, category, raw_text, updated_at: new Date().toISOString() })
          .eq('id', documentId);
      } else {
        const { data, error } = await supabase
          .from('documents')
          .insert({ project_id, path, title, category, raw_text })
          .select('id')
          .single();
        if (error) throw error;
        documentId = data.id;
      }
    } else {
      const { data, error } = await supabase
        .from('documents')
        .insert({ project_id, path, title, category, raw_text })
        .select('id')
        .single();
      if (error) throw error;
      documentId = data.id;
    }

    // 2. Delete old chunks for this document
    await supabase.from('document_chunks').delete().eq('document_id', documentId);

    // 3. Chunk the text
    const chunks = chunkText(raw_text);

    // 4. Embed each chunk and insert
    const chunkRows = [];
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i]);
      chunkRows.push({
        document_id: documentId,
        chunk_index: i,
        content: chunks[i],
        embedding: JSON.stringify(embedding),
      });
    }

    if (chunkRows.length > 0) {
      const { error: insertError } = await supabase.from('document_chunks').insert(chunkRows);
      if (insertError) throw insertError;
    }

    // 5. Optionally generate lessons from the document via Gemini
    let lessonsCreated = 0;
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (geminiKey && raw_text.length > 100) {
      try {
        const client = new GoogleGenAI({ apiKey: geminiKey });
        const prompt = `You are a software engineering knowledge extractor. Analyze this document and extract 1-3 structured lessons that capture key decisions, patterns, or solutions.

Document title: ${title}
Category: ${category || 'general'}
Content:
${raw_text.slice(0, 4000)}

Return a JSON array of lessons. Each lesson must have these fields:
- title: string (concise lesson title)
- problem: string (what problem or question this addresses)
- root_cause: string (underlying reason or context)
- solution: string (what was decided or implemented)
- recommendation: string (guidance for future reference)
- tags: string[] (2-5 relevant tags)

Return ONLY the JSON array, no markdown fencing.`;

        const interaction = await client.interactions.create({
          model: 'gemini-2.5-flash',
          input: prompt,
        });

        const responseText = interaction.outputs[interaction.outputs.length - 1].text || '';
        // Try to parse JSON from the response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const lessons = JSON.parse(jsonMatch[0]);

          for (const lesson of lessons) {
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
                source_type: 'document',
                source_ref: documentId,
              })
              .select('id')
              .single();

            if (lessonError) {
              console.error('Failed to insert lesson:', lessonError);
              continue;
            }

            // Embed the lesson
            const lessonText = [lesson.title, lesson.problem, lesson.solution, lesson.recommendation]
              .filter(Boolean)
              .join(' ');
            const lessonEmbedding = await generateEmbedding(lessonText);

            await supabase.from('lesson_embeddings').insert({
              lesson_id: lessonData.id,
              embedding: JSON.stringify(lessonEmbedding),
            });

            lessonsCreated++;
          }
        }
      } catch (aiError) {
        console.error('Gemini lesson extraction failed (non-fatal):', aiError);
      }
    }

    return jsonResponse({
      document_id: documentId,
      chunk_count: chunkRows.length,
      lessons_created: lessonsCreated,
    });
  } catch (error) {
    console.error('ingest-doc error:', error);
    return errorResponse(`Ingestion failed: ${error.message}`, 500);
  }
});
