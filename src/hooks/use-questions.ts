import { useQuery } from '@powersync/react'
import type { Question } from '@/types/question'

/**
 * Hook for querying Q&A history for a specific project via PowerSync local DB.
 */
export function useQuestions(projectId: string) {
  const { data: questions, isLoading } = useQuery<Question>(
    'SELECT * FROM questions WHERE project_id = ? ORDER BY created_at DESC',
    [projectId]
  )

  return { questions, isLoading }
}
