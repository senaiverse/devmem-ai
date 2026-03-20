import { RotateCcw, X, Loader2, CheckCircle2, AlertCircle, Clock, Ban } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import type { IngestJob, IngestJobStatus } from '@/types/ingest-job'

interface ImportQueueItemProps {
  job: IngestJob
  onRetry: (jobId: string) => void
  onCancel: (jobId: string, storagePath: string) => void
  /** Requests cancellation of a job that is currently processing. */
  onRequestCancel: (jobId: string) => void
  /** Dismisses a finished job (completed/cancelled/failed) from the queue. */
  onDismiss: (jobId: string) => void
  /** Whether the job is considered stuck (processing > 3 min with no update). */
  isStuck?: boolean
}

/**
 * Single ingest job row with status badge, progress bar, and cancel/retry/dismiss actions.
 */
export function ImportQueueItem({
  job,
  onRetry,
  onCancel,
  onRequestCancel,
  onDismiss,
  isStuck = false,
}: ImportQueueItemProps) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{job.file_name}</p>
            <p className="text-xs text-muted-foreground">{job.category}</p>
          </div>
          <div className="ml-2 flex items-center gap-2">
            <JobStatusBadge status={job.status} isStuck={isStuck} />
            {/* Retry: shown for failed or stuck jobs */}
            {(job.status === 'failed' || isStuck) && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button variant="ghost" size="icon" onClick={() => onRetry(job.id)} aria-label="Retry" />
                  }
                >
                  <RotateCcw className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent>Retry processing</TooltipContent>
              </Tooltip>
            )}
            {/* Cancel pending: deletes row + storage file */}
            {job.status === 'pending' && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onCancel(job.id, job.storage_path)}
                      aria-label="Cancel"
                    />
                  }
                >
                  <X className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent>Cancel and remove file</TooltipContent>
              </Tooltip>
            )}
            {/* Cancel processing: requests cancellation via Postgres */}
            {job.status === 'processing' && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRequestCancel(job.id)}
                      aria-label="Cancel processing"
                    />
                  }
                >
                  <X className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent>Stop processing</TooltipContent>
              </Tooltip>
            )}
            {/* Dismiss finished: removes row from queue */}
            {(job.status === 'completed' || job.status === 'cancelled' || job.status === 'failed') && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDismiss(job.id)}
                      aria-label="Dismiss"
                    />
                  }
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>Dismiss from queue</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Progress bar — shown during processing */}
        {job.status === 'processing' && (
          <div className="mt-2">
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-1.5 rounded-full bg-primary transition-all duration-500"
                style={{ width: `${job.progress}%` }}
              />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{job.progress}%</p>
          </div>
        )}

        {/* Rate-limit transient warning during processing */}
        {job.status === 'processing' && job.error && (
          <p className="mt-1 text-xs text-amber-500">{job.error}</p>
        )}

        {/* Error message for failed jobs */}
        {job.status === 'failed' && job.error && (
          <p className="mt-1 text-xs text-destructive">{job.error}</p>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Renders a status badge for the given ingest job status.
 */
function JobStatusBadge({ status, isStuck }: { status: IngestJobStatus; isStuck?: boolean }) {
  if (isStuck) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="outline" className="gap-1 border-amber-500 text-xs text-amber-500">
            <AlertCircle className="h-3 w-3" /> Stuck?
          </Badge>
        </TooltipTrigger>
        <TooltipContent>Processing for 3+ minutes with no update — try retrying</TooltipContent>
      </Tooltip>
    )
  }

  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="gap-1 text-xs">
          <Clock className="h-3 w-3" /> Pending
        </Badge>
      )
    case 'processing':
      return (
        <Badge variant="secondary" className="gap-1 text-xs">
          <Loader2 className="h-3 w-3 animate-spin" /> Processing
        </Badge>
      )
    case 'completed':
      return (
        <Badge variant="default" className="gap-1 text-xs">
          <CheckCircle2 className="h-3 w-3" /> Done
        </Badge>
      )
    case 'failed':
      return (
        <Badge variant="destructive" className="gap-1 text-xs">
          <AlertCircle className="h-3 w-3" /> Failed
        </Badge>
      )
    case 'cancelling':
      return (
        <Badge variant="outline" className="gap-1 border-amber-500 text-xs text-amber-500">
          <Loader2 className="h-3 w-3 animate-spin" /> Cancelling
        </Badge>
      )
    case 'cancelled':
      return (
        <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
          <Ban className="h-3 w-3" /> Cancelled
        </Badge>
      )
    default:
      return null
  }
}
