import { useState, useCallback } from 'react'
import { summarizePeriod, type SummarizePeriodResponse } from '@/services/timeline.service'

/**
 * Hook for fetching period-based improvement summaries.
 * Calls the summarize-period Edge Function on demand.
 */
export function useTimeline(projectId: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<SummarizePeriodResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = useCallback(
    async (from: string, to: string) => {
      setIsLoading(true)
      setError(null)
      setResult(null)

      try {
        const response = await summarizePeriod(projectId, from, to)
        setResult(response)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Summary failed'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    },
    [projectId]
  )

  return { fetchSummary, result, isLoading, error }
}
