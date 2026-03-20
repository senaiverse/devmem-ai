import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { generateEmbedding, chunkText } from '../_shared/embeddings.ts';
import { extractAndInsertLessons } from '../_shared/lesson-extractor.ts';

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
    const lessonsCreated = await extractAndInsertLessons(
      supabase, project_id, documentId, title, category || 'general', raw_text
    );

    return jsonResponse({
      document_id: documentId,
      chunk_count: chunkRows.length,
      lessons_created: lessonsCreated,
    });
  } catch (error) {
    console.error('ingest-doc error:', error);
    return errorResponse(`Ingestion failed: ${(error as Error).message ?? 'Unknown error'}`, 500);
  }
});
