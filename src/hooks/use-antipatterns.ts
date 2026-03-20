import { useMemo } from 'react'
import { useQuery } from '@powersync/react'
import type { Lesson } from '@/types/lesson'

/**
 * Hook that queries lessons flagged as antipatterns (risk_level != 'none')
 * from the local PowerSync DB, grouped by risk level.
 */
export function useAntipatterns(projectId: string) {
  const { data: flaggedLessons, isLoading } = useQuery<Lesson>(
    `SELECT * FROM lessons
     WHERE project_id = ? AND risk_level != 'none'
     ORDER BY
       CASE risk_level
         WHEN 'high' THEN 1
         WHEN 'medium' THEN 2
         WHEN 'low' THEN 3
         ELSE 4
       END,
       created_at DESC`,
    [projectId]
  )

  const grouped = useMemo(() => {
    const groups: Record<string, Lesson[]> = { high: [], medium: [], low: [] }
    for (const lesson of flaggedLessons) {
      const level = lesson.risk_level
      if (level in groups) {
        groups[level].push(lesson)
      }
    }
    return groups
  }, [flaggedLessons])

  return { flaggedLessons, grouped, isLoading, count: flaggedLessons.length }
}
