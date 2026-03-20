import { usePowerSync } from '@powersync/react'
import { Inbox, Trash2 } from 'lucide-react'
import { useIngestJobs, isStuck } from '@/hooks/use-ingest-jobs'
import {
  retryIngestJob,
  cancelIngestJob,
  requestCancelIngestJob,
  dismissIngestJob,
  clearFinishedJobs,
} from '@/services/ingest.service'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { ImportQueueItem } from './import-queue-item'
import { toast } from 'sonner'

interface ImportQueueListProps {
  projectId: string
}

/**
 * Real-time list of ingest jobs for a project, powered by PowerSync.
 * Shows cancel/retry/dismiss actions per job, plus a bulk clear button.
 */
export function ImportQueueList({ projectId }: ImportQueueListProps) {
  const db = usePowerSync()
  const {
    jobs,
    isLoading,
    isActive,
    pendingCount,
    processingCount,
    cancellingCount,
    completedCount,
    failedCount,
    finishedCount,
  } = useIngestJobs(projectId)

  async function handleRetry(jobId: string) {
    await retryIngestJob(db, jobId)
  }

  async function handleCancel(jobId: string, storagePath: string) {
    await cancelIngestJob(db, jobId, storagePath)
  }

  async function handleRequestCancel(jobId: string) {
    try {
      await requestCancelIngestJob(jobId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Cancellation failed'
      toast.error(message)
    }
  }

  async function handleDismiss(jobId: string) {
    await dismissIngestJob(db, jobId)
  }

  async function handleClearFinished() {
    await clearFinishedJobs(db, projectId)
  }

  if (isLoading) return null

  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No imports yet"
        description="Upload files above to start processing."
      />
    )
  }

  /** Builds the summary text for the queue header. */
  function getSummaryText(): string {
    if (isActive) {
      const parts: string[] = []
      if (pendingCount > 0) parts.push(`${pendingCount} pending`)
      if (processingCount > 0) parts.push(`${processingCount} processing`)
      if (cancellingCount > 0) parts.push(`${cancellingCount} cancelling`)
      return parts.join(', ')
    }
    const parts: string[] = []
    if (completedCount > 0) parts.push(`${completedCount} completed`)
    if (failedCount > 0) parts.push(`${failedCount} failed`)
    return parts.join(', ')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Ingest Queue</h3>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">{getSummaryText()}</p>
          {finishedCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={handleClearFinished}>
              <Trash2 className="h-3 w-3" /> Clear finished
            </Button>
          )}
        </div>
      </div>
      {jobs.map((job) => (
        <ImportQueueItem
          key={job.id}
          job={job}
          onRetry={handleRetry}
          onCancel={handleCancel}
          onRequestCancel={handleRequestCancel}
          onDismiss={handleDismiss}
          isStuck={isStuck(job)}
        />
      ))}
    </div>
  )
}
