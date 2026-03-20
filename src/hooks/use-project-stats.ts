import { useQuery } from '@powersync/react'
import { useState, useEffect } from 'react'
import { listDocuments } from '@/services/document.service'

interface ProjectStats {
  lessonCount: number
  questionCount: number
  documentCount: number
  isLoading: boolean
}

/**
 * Hook that aggregates project statistics from PowerSync (lessons, questions)
 * and the server (documents).
 */
export function useProjectStats(projectId: string): ProjectStats {
  const { data: lessonRows, isLoading: lessonsLoading } = useQuery<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM lessons WHERE project_id = ?',
    [projectId]
  )

  const { data: questionRows, isLoading: questionsLoading } = useQuery<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM questions WHERE project_id = ?',
    [projectId]
  )

  const [documentCount, setDocumentCount] = useState(0)
  const [docsLoading, setDocsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setDocsLoading(true)
    listDocuments(projectId)
      .then((res) => {
        if (!cancelled) setDocumentCount(res.documents.length)
      })
      .catch(() => {
        if (!cancelled) setDocumentCount(0)
      })
      .finally(() => {
        if (!cancelled) setDocsLoading(false)
      })
    return () => { cancelled = true }
  }, [projectId])

  return {
    lessonCount: lessonRows[0]?.cnt ?? 0,
    questionCount: questionRows[0]?.cnt ?? 0,
    documentCount,
    isLoading: lessonsLoading || questionsLoading || docsLoading,
  }
}
