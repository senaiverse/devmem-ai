import { useState, useCallback } from 'react'
import { searchProject } from '@/services/search.service'
import type { SearchResponse } from '@/types/api'

/**
 * Hook for RAG search against a project's knowledge base.
 * Calls the /api/search edge function.
 */
export function useSearch(projectId: string) {
  const [isSearching, setIsSearching] = useState(false)
  const [result, setResult] = useState<SearchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(
    async (query: string) => {
      setIsSearching(true)
      setError(null)
      setResult(null)

      try {
        const response = await searchProject(projectId, query)
        setResult(response)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Search failed'
        setError(message)
      } finally {
        setIsSearching(false)
      }
    },
    [projectId]
  )

  function reset() {
    setResult(null)
    setError(null)
  }

  return { search, result, isSearching, error, reset }
}
