/**
 * process-ingest-job Edge Function
 *
 * Reads a file from Supabase Storage `doc-uploads` bucket, chunks the text,
 * generates embeddings for each chunk, extracts lessons via Gemini, and marks
 * the corresponding `ingest_jobs` row as completed.
 *
 * Supports:
 * - Real-time progress updates (0-100) synced via PowerSync
 * - Mid-processing cancellation (client sets status → 'cancelling')
 * - Exponential backoff on embedding rate limits
 *
 * Request body: `{ job_id: string }`
 *
 * The function implements retry logic when fetching the job row because the
 * client writes via PowerSync, which may not have synced to Postgres yet.
 */
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase-client.ts';
import { generateEmbeddingWithBackoff, chunkText } from '../_shared/embeddings.ts';
import { extractAndInsertLessons } from '../_shared/lesson-extractor.ts';

// deno-lint-ignore no-explicit-any
type SupabaseClient = ReturnType<typeof createAdminClient>;

/** Returns a promise that resolves after `ms` milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* -------------------------------------------------------------------------- */
/*  Progress & Cancellation Helpers                                           */
/* -------------------------------------------------------------------------- */

/**
 * Updates progress (and optionally error) on the ingest_jobs row.
 * Non-fatal — logs but does not throw on failure.
 */
async function updateJobProgress(
  supabase: SupabaseClient,
  jobId: string,
  progress: number,
  extra?: { error?: string | null }
): Promise<void> {
  try {
    await supabase
      .from('ingest_jobs')
      .update({
        progress,
        updated_at: new Date().toISOString(),
        ...(extra ?? {}),
      })
      .eq('id', jobId);
  } catch (err) {
    console.error(`[progress] Failed to update progress for ${jobId}:`, err);
  }
}

/**
 * Checks whether the job's current status in Postgres is 'cancelling'.
 * Returns true if so, false otherwise.
 */
async function isJobCancelling(
  supabase: SupabaseClient,
  jobId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('ingest_jobs')
    .select('status')
    .eq('id', jobId)
    .single();
  return data?.status === 'cancelling';
}

/**
 * Performs cleanup when a job is cancelled mid-processing:
 * - Deletes any chunks already inserted for the document
 * - Sets status to 'cancelled' with progress frozen at current value
 */
async function handleCancellation(
  supabase: SupabaseClient,
  jobId: string,
  documentId: string | null,
  currentProgress: number
): Promise<Response> {
  if (documentId) {
    await supabase.from('document_chunks').delete().eq('document_id', documentId);
  }
  await supabase
    .from('ingest_jobs')
    .update({
      status: 'cancelled',
      progress: currentProgress,
      error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);
  return jsonResponse({ cancelled: true, progress: currentProgress });
}

/* -------------------------------------------------------------------------- */
/*  Progress Milestones                                                       */
/* -------------------------------------------------------------------------- */

const PROGRESS = {
  STARTED: 5,
  FILE_DOWNLOADED: 15,
  DOC_UPSERTED: 20,
  OLD_CHUNKS_DELETED: 25,
  TEXT_CHUNKED: 30,
  EMBED_START: 30,
  EMBED_END: 80,
  LESSONS_EXTRACTED: 85,
  COMPLETED: 100,
} as const;

/** How often to check for cancellation during the embedding loop (every N chunks). */
const CANCEL_CHECK_INTERVAL = 3;

/* -------------------------------------------------------------------------- */
/*  Main Handler                                                              */
/* -------------------------------------------------------------------------- */

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

    // 2. Guard against re-processing or already-cancelling jobs
    if (job.status === 'cancelling') {
      // Job was cancelled before we could start — transition directly to cancelled
      await supabase
        .from('ingest_jobs')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', jobId);
      return jsonResponse({ cancelled: true, progress: 0 });
    }

    if (job.status !== 'pending') {
      return errorResponse(`Job ${jobId} is already ${job.status}`, 409);
    }

    // 3. Mark job as processing
    await supabase
      .from('ingest_jobs')
      .update({ status: 'processing', progress: PROGRESS.STARTED, updated_at: new Date().toISOString() })
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
    await updateJobProgress(supabase, jobId, PROGRESS.FILE_DOWNLOADED);

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

    await updateJobProgress(supabase, jobId, PROGRESS.DOC_UPSERTED);

    // 7. Delete old chunks and lessons for this document (re-ingest cleanup)
    await supabase.from('document_chunks').delete().eq('document_id', documentId);

    // Clean up old lessons extracted from this document (cascade deletes embeddings + classifications)
    const { data: oldLessons } = await supabase
      .from('lessons')
      .select('id')
      .eq('source_ref', documentId)
      .eq('source_type', 'document');
    if (oldLessons && oldLessons.length > 0) {
      const oldIds = oldLessons.map((l: { id: string }) => l.id);
      await supabase.from('lesson_embeddings').delete().in('lesson_id', oldIds);
      await supabase.from('lessons').delete().in('id', oldIds);
    }

    await updateJobProgress(supabase, jobId, PROGRESS.OLD_CHUNKS_DELETED);

    // 8. Chunk the text
    const chunks = chunkText(rawText);
    await updateJobProgress(supabase, jobId, PROGRESS.TEXT_CHUNKED);

    // 9. Embed each chunk with cancellation checks and rate-limit backoff
    const chunkRows: Array<{
      document_id: string;
      chunk_index: number;
      content: string;
      embedding: string;
    }> = [];

    for (let i = 0; i < chunks.length; i++) {
      // Check for cancellation periodically
      if (i % CANCEL_CHECK_INTERVAL === 0) {
        if (await isJobCancelling(supabase, jobId)) {
          return handleCancellation(supabase, jobId, documentId,
            PROGRESS.EMBED_START + Math.round((i / chunks.length) * (PROGRESS.EMBED_END - PROGRESS.EMBED_START)));
        }
      }

      const embedding = await generateEmbeddingWithBackoff(
        chunks[i],
        (attempt, delayMs) => {
          console.warn(`[embed] Rate limited on chunk ${i + 1}/${chunks.length}, retry ${attempt}, waiting ${delayMs}ms`);
          updateJobProgress(supabase, jobId,
            PROGRESS.EMBED_START + Math.round((i / chunks.length) * (PROGRESS.EMBED_END - PROGRESS.EMBED_START)),
            { error: `Rate limited, retrying in ${delayMs / 1000}s...` }
          );
        }
      );

      chunkRows.push({
        document_id: documentId,
        chunk_index: i,
        content: chunks[i],
        embedding: JSON.stringify(embedding),
      });

      // Update progress after successful embedding (clears any transient rate-limit error)
      const chunkProgress = PROGRESS.EMBED_START +
        Math.round(((i + 1) / chunks.length) * (PROGRESS.EMBED_END - PROGRESS.EMBED_START));
      await updateJobProgress(supabase, jobId, chunkProgress, { error: null });
    }

    if (chunkRows.length > 0) {
      const { error: chunkInsertError } = await supabase
        .from('document_chunks')
        .insert(chunkRows);
      if (chunkInsertError) throw chunkInsertError;
    }

    // 10. Extract lessons via Gemini (non-fatal)
    await updateJobProgress(supabase, jobId, PROGRESS.LESSONS_EXTRACTED);
    const lessonsCreated = await extractAndInsertLessons(
      supabase, projectId, documentId, title, category, rawText
    );

    // 11. Mark job as completed
    await supabase
      .from('ingest_jobs')
      .update({ status: 'completed', progress: PROGRESS.COMPLETED, updated_at: new Date().toISOString() })
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

    // Best-effort: mark the job as failed (but don't overwrite cancelled/cancelling)
    if (jobId) {
      try {
        const supabase = createAdminClient();
        const { data: currentJob } = await supabase
          .from('ingest_jobs')
          .select('status')
          .eq('id', jobId)
          .single();

        if (currentJob?.status !== 'cancelled' && currentJob?.status !== 'cancelling') {
          await supabase
            .from('ingest_jobs')
            .update({
              status: 'failed',
              error: (error as Error).message,
              updated_at: new Date().toISOString(),
            })
            .eq('id', jobId);
        }
      } catch (updateError) {
        console.error('Failed to mark job as failed:', updateError);
      }
    }

    return errorResponse(`Ingestion job failed: ${(error as Error).message}`, 500);
  }
});
