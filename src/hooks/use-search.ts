import { useState, useCallback } from 'react'
import { searchProject } from '@/services/search.service'
import type { SearchResponse, SearchMode } from '@/types/api'

/**
 * Hook for RAG search against a project's knowledge base.
 * Supports both question and error analysis modes.
 */
export function useSearch(projectId: string) {
  const [isSearching, setIsSearching] = useState(false)
  const [result, setResult] = useState<SearchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(
    async (query: string, mode: SearchMode = 'question') => {
      setIsSearching(true)
      setError(null)
      setResult(null)

      try {
        const response = await searchProject(projectId, query, mode)
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

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { search, result, isSearching, error, reset }
}
