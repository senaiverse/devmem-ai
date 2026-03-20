import { useState, useEffect, useCallback } from 'react'
import { listDocuments, deleteDocument as deleteDocumentApi } from '@/services/document.service'
import type { DocumentSummary } from '@/types/document'

/**
 * Hook for fetching and managing documents for a project.
 * Documents are fetched from the list-documents Edge Function
 * (not synced via PowerSync since they're server-side only).
 */
export function useDocuments(projectId: string) {
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await listDocuments(projectId)
      setDocuments(res.documents)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load documents'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  /** Deletes a document and refreshes the list. */
  const deleteDocument = useCallback(
    async (documentId: string) => {
      await deleteDocumentApi(documentId)
      setDocuments((prev) => prev.filter((d) => d.id !== documentId))
    },
    []
  )

  return { documents, isLoading, error, refetch: fetchDocuments, deleteDocument }
}
