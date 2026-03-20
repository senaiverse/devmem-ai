import { useMemo } from 'react'
import { useQuery } from '@powersync/react'
import type { Lesson } from '@/types/lesson'
import { parseTags } from '@/types/lesson'

/**
 * Hook for querying lessons for a specific project via PowerSync local DB.
 * Supports client-side filtering by search term and tags.
 */
export function useLessons(projectId: string, searchTerm = '', filterTag = '') {
  const { data: rawLessons, isLoading } = useQuery<Lesson>(
    'SELECT * FROM lessons WHERE project_id = ? ORDER BY created_at DESC',
    [projectId]
  )

  const lessons = useMemo(() => {
    let filtered = rawLessons

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (l) =>
          l.title.toLowerCase().includes(term) ||
          parseTags(l.tags).some((t) => t.toLowerCase().includes(term))
      )
    }

    if (filterTag) {
      filtered = filtered.filter((l) =>
        parseTags(l.tags).some((t) => t.toLowerCase() === filterTag.toLowerCase())
      )
    }

    return filtered
  }, [rawLessons, searchTerm, filterTag])

  /** All unique tags across lessons for this project. */
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    for (const lesson of rawLessons) {
      for (const tag of parseTags(lesson.tags)) {
        tagSet.add(tag)
      }
    }
    return Array.from(tagSet).sort()
  }, [rawLessons])

  return { lessons, allTags, isLoading }
}
