import { useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, usePowerSync } from '@powersync/react'
import { Loader2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { FileDropZone } from '@/components/import/file-drop-zone'
import { ImportQueueList } from '@/components/import/import-queue-list'
import { OfflineBanner } from '@/components/projects/offline-banner'
import { uploadFileToQueue } from '@/services/ingest.service'
import { useSyncStatus } from '@/hooks/use-sync-status'
import { toast } from 'sonner'
import type { Project } from '@/types/project'

const CATEGORIES = [
  { value: 'architecture', tooltip: 'System design, ADRs' },
  { value: 'plan', tooltip: 'Roadmaps, sprint plans' },
  { value: 'changelog', tooltip: 'Release notes, version history' },
  { value: 'runbook', tooltip: 'Ops procedures, deploy guides' },
  { value: 'docs', tooltip: 'General documentation' },
  { value: 'other', tooltip: 'Miscellaneous' },
] as const

/**
 * /projects/:id/import — Import documents via bucket upload + queue.
 * Files are uploaded to Supabase Storage and processed asynchronously.
 * Real-time status updates arrive via PowerSync.
 */
export function ImportPage() {
  const { id } = useParams<{ id: string }>()
  const db = usePowerSync()
  const { data: projectRows } = useQuery<Project>(
    'SELECT * FROM projects WHERE id = ? LIMIT 1',
    [id!]
  )
  const project = projectRows[0] ?? null

  const { isOnline } = useSyncStatus()
  const [category, setCategory] = useState<string>('docs')
  const [isUploading, setIsUploading] = useState(false)

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      if (!id) return
      setIsUploading(true)

      let queued = 0
      for (const file of files) {
        try {
          await uploadFileToQueue(db, id, file, category)
          queued++
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Upload failed'
          toast.error(`Failed to queue ${file.name}: ${message}`)
        }
      }

      setIsUploading(false)
      if (queued > 0) {
        toast.success(
          `${queued} file${queued > 1 ? 's' : ''} queued for processing.`
        )
      }
    },
    [id, db, category]
  )

  return (
    <div className="animate-page-enter mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Import Documents</h1>
          {project && (
            <p className="text-sm text-muted-foreground">{project.name}</p>
          )}
        </div>
        <Link to={`/projects/${id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Back to Project
        </Link>
      </div>

      <OfflineBanner
        isOnline={isOnline}
        message="You're offline. File import requires a network connection."
      />

      <div className="space-y-2">
        <p className="text-sm font-medium">Category</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <Tooltip key={cat.value}>
              <TooltipTrigger
                render={
                  <Button
                    variant={category === cat.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCategory(cat.value)}
                  />
                }
              >
                {cat.value}
              </TooltipTrigger>
              <TooltipContent>{cat.tooltip}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      <FileDropZone
        onFilesSelected={handleFilesSelected}
        disabled={isUploading || !isOnline}
      />

      {!isOnline && (
        <p className="text-xs text-warning">File import is disabled while offline.</p>
      )}

      {isUploading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Uploading files...
        </div>
      )}

      {id && <ImportQueueList projectId={id} />}
    </div>
  )
}
