import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@powersync/react'
import { buttonVariants } from '@/components/ui/button'
import { DocumentTable } from '@/components/knowledge/document-table'
import { ErrorAlert } from '@/components/shared/error-alert'
import { OfflineBanner } from '@/components/projects/offline-banner'
import { useDocuments } from '@/hooks/use-documents'
import { useSyncStatus } from '@/hooks/use-sync-status'
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
  const { isOnline } = useSyncStatus()
  const { documents, isLoading, error, deleteDocument } = useDocuments(id!)

  return (
    <div className="animate-page-enter mx-auto max-w-3xl space-y-6">
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

      <OfflineBanner
        isOnline={isOnline}
        message="You're offline. Document management requires a network connection."
      />

      <ErrorAlert message={error} />

      <DocumentTable
        documents={documents}
        isLoading={isLoading}
        projectId={id!}
        onDelete={deleteDocument}
      />
    </div>
  )
}
