import { useQuery } from '@powersync/react'
import type { IngestJob } from '@/types/ingest-job'

/** Threshold in milliseconds after which a processing job is considered stuck. */
const STUCK_THRESHOLD_MS = 3 * 60 * 1000

/**
 * Returns true if the job has been stuck in 'processing' state for longer
 * than STUCK_THRESHOLD_MS (3 minutes) without a progress update.
 */
export function isStuck(job: IngestJob): boolean {
  if (job.status !== 'processing') return false
  const elapsed = Date.now() - new Date(job.updated_at).getTime()
  return elapsed > STUCK_THRESHOLD_MS
}

/**
 * Hook for querying ingest jobs for a project via PowerSync.
 * Jobs sync in real-time — status changes from the Edge Function
 * propagate automatically through PowerSync.
 */
export function useIngestJobs(projectId: string) {
  const { data: jobs, isLoading } = useQuery<IngestJob>(
    'SELECT * FROM ingest_jobs WHERE project_id = ? ORDER BY created_at DESC',
    [projectId]
  )

  const pendingCount = jobs.filter((j) => j.status === 'pending').length
  const processingCount = jobs.filter((j) => j.status === 'processing').length
  const failedCount = jobs.filter((j) => j.status === 'failed').length
  const completedCount = jobs.filter((j) => j.status === 'completed').length
  const cancellingCount = jobs.filter((j) => j.status === 'cancelling').length
  const cancelledCount = jobs.filter((j) => j.status === 'cancelled').length
  const finishedCount = completedCount + failedCount + cancelledCount

  return {
    jobs,
    isLoading,
    pendingCount,
    processingCount,
    failedCount,
    completedCount,
    cancellingCount,
    cancelledCount,
    finishedCount,
    isActive: pendingCount > 0 || processingCount > 0 || cancellingCount > 0,
  }
}
