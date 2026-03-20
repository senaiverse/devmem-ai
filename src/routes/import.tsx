import { useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@powersync/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FileDropZone } from '@/components/import/file-drop-zone'
import { ImportProgress, type FileStatus } from '@/components/import/import-progress'
import { ingestFile } from '@/services/ingest.service'
import { toast } from 'sonner'
import type { Project } from '@/types/project'

const CATEGORIES = ['architecture', 'plan', 'changelog', 'runbook', 'docs', 'other'] as const

/**
 * /projects/:id/import — Import documents for RAG ingestion.
 */
export function ImportPage() {
  const { id } = useParams<{ id: string }>()
  const { data: projectRows } = useQuery<Project>(
    'SELECT * FROM projects WHERE id = ? LIMIT 1',
    [id!]
  )
  const project = projectRows[0] ?? null

  const [category, setCategory] = useState<string>('docs')
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      if (!id) return
      setIsProcessing(true)

      const statuses: FileStatus[] = files.map((f) => ({
        name: f.name,
        status: 'pending' as const,
      }))
      setFileStatuses(statuses)

      let successCount = 0
      const DELAY_MS = 2000

      for (let i = 0; i < files.length; i++) {
        if (i > 0) {
          await new Promise((r) => setTimeout(r, DELAY_MS))
        }

        setFileStatuses((prev) =>
          prev.map((s, j) => (j === i ? { ...s, status: 'uploading' } : s))
        )

        try {
          const result = await ingestFile(id, files[i], category)
          setFileStatuses((prev) =>
            prev.map((s, j) =>
              j === i
                ? {
                    ...s,
                    status: 'success',
                    chunkCount: result.chunk_count,
                    lessonsCreated: result.lessons_created,
                  }
                : s
            )
          )
          successCount++
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Upload failed'
          setFileStatuses((prev) =>
            prev.map((s, j) => (j === i ? { ...s, status: 'error', error: message } : s))
          )
        }
      }

      setIsProcessing(false)
      if (successCount > 0) {
        toast.success(
          `${successCount} doc${successCount > 1 ? 's' : ''} ingested. Lessons will appear shortly.`
        )
      }
    },
    [id, category]
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
        <Button variant="outline" size="sm" asChild>
          <Link to={`/projects/${id}`}>Back to Project</Link>
        </Button>
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
        disabled={isProcessing}
      />

      <ImportProgress files={fileStatuses} />
    </div>
  )
}
