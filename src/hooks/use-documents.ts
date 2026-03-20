import { useState, useEffect, useCallback } from 'react'
import { listDocuments, deleteDocument as deleteDocumentApi } from '@/services/document.service'
import { OfflineError } from '@/lib/network-guard'
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
  const [fetchTrigger, setFetchTrigger] = useState(0)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    listDocuments(projectId)
      .then((res) => {
        if (!cancelled) setDocuments(res.documents)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof OfflineError) return
        setError(err instanceof Error ? err.message : 'Failed to load documents')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [projectId, fetchTrigger])

  /** Re-fetch documents from the server. */
  const refetch = useCallback(() => setFetchTrigger((n) => n + 1), [])

  /** Deletes a document and removes it from local state. */
  const deleteDocument = useCallback(
    async (documentId: string) => {
      await deleteDocumentApi(documentId)
      setDocuments((prev) => prev.filter((d) => d.id !== documentId))
    },
    []
  )

  return { documents, isLoading, error, refetch, deleteDocument }
}
