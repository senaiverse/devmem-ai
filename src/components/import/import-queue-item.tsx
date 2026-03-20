import { RotateCcw, X, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { IngestJob } from '@/types/ingest-job'

interface ImportQueueItemProps {
  job: IngestJob
  onRetry: (jobId: string) => void
  onCancel: (jobId: string, storagePath: string) => void
}

/**
 * Single ingest job row with status badge and cancel/retry actions.
 */
export function ImportQueueItem({ job, onRetry, onCancel }: ImportQueueItemProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{job.file_name}</p>
          <p className="text-xs text-muted-foreground">{job.category}</p>
          {job.status === 'failed' && job.error && (
            <p className="mt-1 text-xs text-destructive">{job.error}</p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-2">
          <JobStatusBadge status={job.status} />
          {job.status === 'failed' && (
            <Button variant="ghost" size="icon" onClick={() => onRetry(job.id)} aria-label="Retry">
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          {(job.status === 'pending' || job.status === 'failed') && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCancel(job.id, job.storage_path)}
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function JobStatusBadge({ status }: { status: IngestJob['status'] }) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="text-xs gap-1">
          <Clock className="h-3 w-3" /> Pending
        </Badge>
      )
    case 'processing':
      return (
        <Badge variant="secondary" className="text-xs gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Processing
        </Badge>
      )
    case 'completed':
      return (
        <Badge variant="default" className="text-xs gap-1">
          <CheckCircle2 className="h-3 w-3" /> Done
        </Badge>
      )
    case 'failed':
      return (
        <Badge variant="destructive" className="text-xs gap-1">
          <AlertCircle className="h-3 w-3" /> Failed
        </Badge>
      )
  }
}
