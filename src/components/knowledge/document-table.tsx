import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Trash2, Sparkles, Loader2 } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { generateLessonsFromDoc } from '@/services/generate-lessons.service'
import { useSyncStatus } from '@/hooks/use-sync-status'
import type { DocumentSummary } from '@/types/document'

interface DocumentTableProps {
  documents: DocumentSummary[]
  isLoading: boolean
  projectId: string
  onDelete: (documentId: string) => Promise<void>
}

/**
 * Table displaying ingested documents with chunk counts,
 * lesson generation action, and delete action.
 */
export function DocumentTable({ documents, isLoading, projectId, onDelete }: DocumentTableProps) {
  const { isOnline } = useSyncStatus()
  const [deleteTarget, setDeleteTarget] = useState<DocumentSummary | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await onDelete(deleteTarget.id)
      toast.success('Document deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete document')
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  async function handleGenerateLessons(doc: DocumentSummary) {
    setGeneratingId(doc.id)
    try {
      const result = await generateLessonsFromDoc(doc.id, projectId)
      toast.success(
        `Generated ${result.created_lessons_count} lesson${result.created_lessons_count === 1 ? '' : 's'} — they'll appear in the Lessons tab.`,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lesson generation failed'
      toast.error(message)
    } finally {
      setGeneratingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded" />
        ))}
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm font-medium">No documents yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Import documents to start building your knowledge base.
        </p>
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-0">Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Chunks</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="w-[72px] shrink-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell className="max-w-[200px] truncate font-medium">{doc.title}</TableCell>
              <TableCell>
                {doc.category && (
                  <Badge variant="outline" className="text-xs">{doc.category}</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">{doc.chunk_count}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(doc.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleGenerateLessons(doc)}
                          disabled={generatingId !== null || !isOnline}
                          aria-label={`Generate lessons from ${doc.title}`}
                        />
                      }
                    >
                      {generatingId === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                    </TooltipTrigger>
                    <TooltipContent>
                      {isOnline ? 'Generate lessons from document' : 'Requires network connection'}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(doc)}
                          disabled={!isOnline}
                          aria-label={`Delete ${doc.title}`}
                        />
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </TooltipTrigger>
                    <TooltipContent>
                      {isOnline ? 'Delete document and extracted lessons' : 'Requires network connection'}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deleteTarget?.title}&rdquo;, all its chunks, and any lessons extracted from it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
