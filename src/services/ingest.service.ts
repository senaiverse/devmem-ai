import { supabase } from '@/lib/supabase'
import { EDGE_FUNCTIONS_URL } from '@/lib/constants'
import { assertOnline } from '@/lib/network-guard'
import type { ProcessIngestJobResponse } from '@/types/api'

/**
 * Uploads a file to the `doc-uploads` Storage bucket and inserts a pending
 * ingest_jobs row via PowerSync. Then fires the `process-ingest-job` Edge
 * Function to handle chunking, embedding, and lesson extraction async.
 *
 * @returns The ingest job ID (UUID) for tracking.
 */
export async function uploadFileToQueue(
  db: { execute: (sql: string, params: unknown[]) => Promise<unknown> },
  projectId: string,
  file: File,
  category: string
): Promise<string> {
  assertOnline()
  const jobId = crypto.randomUUID()
  const storagePath = `${projectId}/${jobId}-${file.name}`

  // 1. Upload file to Supabase Storage bucket
  const { error: uploadError } = await supabase.storage
    .from('doc-uploads')
    .upload(storagePath, file, { upsert: false })

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`)
  }

  // 2. Insert ingest_jobs row via PowerSync (local-first)
  const now = new Date().toISOString()
  await db.execute(
    `INSERT INTO ingest_jobs (id, project_id, storage_path, file_name, category, status, progress, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?)`,
    [jobId, projectId, storagePath, file.name, category, now, now]
  )

  // 3. Fire Edge Function (non-blocking — job status updates via PowerSync sync)
  fireProcessJob(jobId).catch((err) =>
    console.error(`[ingest] Failed to fire process-ingest-job for ${jobId}:`, err)
  )

  return jobId
}

/**
 * Retries a failed ingest job by resetting its status to 'pending'
 * and re-firing the processing Edge Function.
 */
export async function retryIngestJob(
  db: { execute: (sql: string, params: unknown[]) => Promise<unknown> },
  jobId: string
): Promise<void> {
  assertOnline()
  const now = new Date().toISOString()
  await db.execute(
    `UPDATE ingest_jobs SET status = 'pending', error = NULL, progress = 0, updated_at = ? WHERE id = ?`,
    [now, jobId]
  )

  fireProcessJob(jobId).catch((err) =>
    console.error(`[ingest] Failed to fire retry for ${jobId}:`, err)
  )
}

/**
 * Cancels a pending ingest job by deleting the storage file and removing
 * the job row from the local DB.
 */
export async function cancelIngestJob(
  db: { execute: (sql: string, params: unknown[]) => Promise<unknown> },
  jobId: string,
  storagePath: string
): Promise<void> {
  // Remove file from bucket (best-effort)
  await supabase.storage.from('doc-uploads').remove([storagePath])

  // Delete the job row via PowerSync
  await db.execute('DELETE FROM ingest_jobs WHERE id = ?', [jobId])
}

/**
 * Requests cancellation of a processing ingest job by setting its status
 * to 'cancelling' directly in Postgres (bypassing PowerSync) so the Edge
 * Function sees the change on its next status check.
 *
 * For pending/failed jobs, use cancelIngestJob() which deletes the row.
 */
export async function requestCancelIngestJob(jobId: string): Promise<void> {
  assertOnline()
  const { error } = await supabase
    .from('ingest_jobs')
    .update({ status: 'cancelling', updated_at: new Date().toISOString() })
    .eq('id', jobId)

  if (error) {
    throw new Error(`Failed to request cancellation: ${error.message}`)
  }
}

/**
 * Dismisses a finished ingest job (completed/cancelled/failed) by deleting
 * the row from the local DB via PowerSync.
 */
export async function dismissIngestJob(
  db: { execute: (sql: string, params: unknown[]) => Promise<unknown> },
  jobId: string
): Promise<void> {
  await db.execute('DELETE FROM ingest_jobs WHERE id = ?', [jobId])
}

/**
 * Clears all finished ingest jobs (completed, failed, cancelled) for a project.
 */
export async function clearFinishedJobs(
  db: { execute: (sql: string, params: unknown[]) => Promise<unknown> },
  projectId: string
): Promise<void> {
  await db.execute(
    `DELETE FROM ingest_jobs WHERE project_id = ? AND status IN ('completed', 'failed', 'cancelled')`,
    [projectId]
  )
}

/**
 * Fires the process-ingest-job Edge Function.
 * Intentionally does not await — status updates arrive via PowerSync sync.
 */
async function fireProcessJob(jobId: string): Promise<ProcessIngestJobResponse> {
  assertOnline()
  const res = await fetch(`${EDGE_FUNCTIONS_URL}/process-ingest-job`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: jobId }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`process-ingest-job failed (${res.status}): ${text}`)
  }

  return res.json() as Promise<ProcessIngestJobResponse>
}
