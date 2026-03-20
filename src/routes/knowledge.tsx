import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@powersync/react'
import { buttonVariants } from '@/components/ui/button'
import { DocumentTable } from '@/components/knowledge/document-table'
import { useDocuments } from '@/hooks/use-documents'
import type { Project } from '@/types/project'

/**
 * /projects/:id/knowledge — View and manage ingested documents.
 */
export function KnowledgePage() {
  const { id } = useParams<{ id: string }>()
  const { data: projectRows } = useQuery<Project>(
    'SELECT * FROM projects WHERE id = ? LIMIT 1',
    [id!]
  )
  const project = projectRows[0] ?? null
  const { documents, isLoading, error, deleteDocument } = useDocuments(id!)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          {project && (
            <p className="text-sm text-muted-foreground">{project.name}</p>
          )}
        </div>
        <Link to={`/projects/${id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Back to Project
        </Link>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <DocumentTable
        documents={documents}
        isLoading={isLoading}
        projectId={id!}
        onDelete={deleteDocument}
      />
    </div>
  )
}
