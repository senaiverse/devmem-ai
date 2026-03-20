import { useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, usePowerSync } from '@powersync/react'
import { Button, buttonVariants } from '@/components/ui/button'
import { FileDropZone } from '@/components/import/file-drop-zone'
import { ImportQueueList } from '@/components/import/import-queue-list'
import { uploadFileToQueue } from '@/services/ingest.service'
import { toast } from 'sonner'
import type { Project } from '@/types/project'

const CATEGORIES = ['architecture', 'plan', 'changelog', 'runbook', 'docs', 'other'] as const

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
    <div className="mx-auto max-w-2xl space-y-6">
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

      <div className="space-y-2">
        <label htmlFor="category" className="text-sm font-medium">
          Category
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={category === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      <FileDropZone
        onFilesSelected={handleFilesSelected}
        disabled={isUploading}
      />

      {id && <ImportQueueList projectId={id} />}
    </div>
  )
}
