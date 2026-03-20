import { useQuery } from '@powersync/react'
import type { IngestJob } from '@/types/ingest-job'

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

  return {
    jobs,
    isLoading,
    pendingCount,
    processingCount,
    failedCount,
    completedCount,
    isActive: pendingCount > 0 || processingCount > 0,
  }
}
