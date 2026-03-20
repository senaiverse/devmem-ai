/**
 * process-ingest-job Edge Function
 *
 * Reads a file from Supabase Storage `doc-uploads` bucket, chunks the text,
 * generates embeddings for each chunk, extracts lessons via Gemini, and marks
 * the corresponding `ingest_jobs` row as completed.
 *
 * Request body: `{ job_id: string }`
 *
 * The function implements retry logic when fetching the job row because the
 * client writes via PowerSync, which may not have synced to Postgres yet.
 */
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { generateEmbedding, chunkText } from '../_shared/embeddings.ts';
import { extractAndInsertLessons } from '../_shared/lesson-extractor.ts';

/** Returns a promise that resolves after `ms` milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  let jobId: string | undefined;

  try {
    const body = await req.json();
    jobId = body.job_id;

    if (!jobId) {
      return errorResponse('Missing required field: job_id');
    }

    const supabase = createAdminClient();

    // 1. Fetch the ingest_jobs row with retry logic (PowerSync sync delay)
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 500;
    let job: Record<string, unknown> | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const { data, error } = await supabase
        .from('ingest_jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        job = data;
        break;
      }

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
      }
    }

    if (!job) {
      return errorResponse(`Job ${jobId} not found after ${MAX_RETRIES} retries`, 404);
    }

    // 2. Guard against re-processing
    if (job.status !== 'pending') {
      return errorResponse(`Job ${jobId} is already ${job.status}`, 409);
    }

    // 3. Mark job as processing
    await supabase
      .from('ingest_jobs')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    // 4. Download the file from Storage
    const storagePath = job.storage_path as string;
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('doc-uploads')
      .download(storagePath);

    if (downloadError || !fileBlob) {
      throw new Error(`Failed to download file: ${downloadError?.message ?? 'no data'}`);
    }

    const rawText = await fileBlob.text();

    // 5. Upsert document (match on project_id + path where path = file_name)
    const projectId = job.project_id as string;
    const fileName = job.file_name as string;
    const title = (job.title as string) || fileName;
    const category = (job.category as string) || 'general';
    let documentId: string;

    const { data: existing } = await supabase
      .from('documents')
      .select('id')
      .eq('project_id', projectId)
      .eq('path', fileName)
      .maybeSingle();

    if (existing) {
      documentId = existing.id;
      await supabase
        .from('documents')
        .update({ title, category, raw_text: rawText, updated_at: new Date().toISOString() })
        .eq('id', documentId);
    } else {
      const { data: newDoc, error: insertError } = await supabase
        .from('documents')
        .insert({ project_id: projectId, path: fileName, title, category, raw_text: rawText })
        .select('id')
        .single();
      if (insertError) throw insertError;
      documentId = newDoc.id;
    }

    // 6. Update the job row with the document_id
    await supabase
      .from('ingest_jobs')
      .update({ document_id: documentId })
      .eq('id', jobId);

    // 7. Delete old chunks for this document
    await supabase.from('document_chunks').delete().eq('document_id', documentId);

    // 8. Chunk the text
    const chunks = chunkText(rawText);

    // 9. Embed each chunk and insert into document_chunks
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
      const { error: chunkInsertError } = await supabase
        .from('document_chunks')
        .insert(chunkRows);
      if (chunkInsertError) throw chunkInsertError;
    }

    // 10. Extract lessons via Gemini (non-fatal)
    const lessonsCreated = await extractAndInsertLessons(
      supabase, projectId, documentId, title, category, rawText
    );

    // 11. Mark job as completed
    await supabase
      .from('ingest_jobs')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    // 12. Clean up the uploaded file from storage
    await supabase.storage.from('doc-uploads').remove([storagePath]);

    return jsonResponse({
      document_id: documentId,
      chunk_count: chunkRows.length,
      lessons_created: lessonsCreated,
    });
  } catch (error) {
    console.error('process-ingest-job error:', error);

    // Best-effort: mark the job as failed
    if (jobId) {
      try {
        const supabase = createAdminClient();
        await supabase
          .from('ingest_jobs')
          .update({
            status: 'failed',
            error: (error as Error).message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId);
      } catch (updateError) {
        console.error('Failed to mark job as failed:', updateError);
      }
    }

    return errorResponse(`Ingestion job failed: ${(error as Error).message}`, 500);
  }
});
