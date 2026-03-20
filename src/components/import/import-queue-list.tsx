import { usePowerSync } from '@powersync/react'
import { useIngestJobs } from '@/hooks/use-ingest-jobs'
import { retryIngestJob, cancelIngestJob } from '@/services/ingest.service'
import { ImportQueueItem } from './import-queue-item'

interface ImportQueueListProps {
  projectId: string
}

/**
 * Real-time list of ingest jobs for a project, powered by PowerSync.
 * Shows cancel/retry actions per job.
 */
export function ImportQueueList({ projectId }: ImportQueueListProps) {
  const db = usePowerSync()
  const { jobs, isLoading, isActive, pendingCount, processingCount, failedCount, completedCount } =
    useIngestJobs(projectId)

  async function handleRetry(jobId: string) {
    await retryIngestJob(db, jobId)
  }

  async function handleCancel(jobId: string, storagePath: string) {
    await cancelIngestJob(db, jobId, storagePath)
  }

  if (isLoading || jobs.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Ingest Queue</h3>
        <p className="text-xs text-muted-foreground">
          {isActive
            ? `${pendingCount} pending, ${processingCount} processing`
            : `${completedCount} completed${failedCount > 0 ? `, ${failedCount} failed` : ''}`}
        </p>
      </div>
      {jobs.map((job) => (
        <ImportQueueItem
          key={job.id}
          job={job}
          onRetry={handleRetry}
          onCancel={handleCancel}
        />
      ))}
    </div>
  )
}
