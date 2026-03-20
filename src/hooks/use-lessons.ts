import { useMemo, useCallback } from 'react'
import { useQuery, usePowerSync } from '@powersync/react'
import type { Lesson } from '@/types/lesson'
import { parseTags } from '@/types/lesson'
import { toast } from 'sonner'
import { embedLesson } from '@/services/lesson.service'

/** Fields accepted for creating or updating a lesson via PowerSync. */
export interface LessonWriteFields {
  title: string
  problem?: string | null
  root_cause?: string | null
  solution?: string | null
  recommendation?: string | null
  tags?: string[]
}

/**
 * Hook for querying and mutating lessons for a specific project via PowerSync.
 * Reads are instant (local SQLite), writes sync upstream automatically.
 * After create/update, fires the embed-lesson Edge Function (non-blocking).
 */
export function useLessons(projectId: string, searchTerm = '', filterTag = '') {
  const db = usePowerSync()
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

  /** Creates a manual lesson in PowerSync and triggers embedding. */
  const createLesson = useCallback(
    async (fields: LessonWriteFields): Promise<string> => {
      const id = crypto.randomUUID()
      const now = new Date().toISOString()

      await db.execute(
        `INSERT INTO lessons (id, project_id, title, problem, root_cause, solution, recommendation, tags, source_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?)`,
        [
          id,
          projectId,
          fields.title,
          fields.problem ?? null,
          fields.root_cause ?? null,
          fields.solution ?? null,
          fields.recommendation ?? null,
          JSON.stringify(fields.tags ?? []),
          now,
        ]
      )

      toast.success('Lesson created')

      // Fire embedding generation (non-blocking)
      embedLesson(id).catch(() =>
        toast.warning('Lesson saved, but search indexing failed. It may not appear in search results.')
      )

      return id
    },
    [db, projectId]
  )

  /** Updates a lesson's fields in PowerSync and re-triggers embedding. */
  const updateLesson = useCallback(
    async (lessonId: string, fields: Partial<LessonWriteFields>): Promise<void> => {
      const setClauses: string[] = []
      const values: unknown[] = []

      if (fields.title !== undefined) {
        setClauses.push('title = ?')
        values.push(fields.title)
      }
      if (fields.problem !== undefined) {
        setClauses.push('problem = ?')
        values.push(fields.problem)
      }
      if (fields.root_cause !== undefined) {
        setClauses.push('root_cause = ?')
        values.push(fields.root_cause)
      }
      if (fields.solution !== undefined) {
        setClauses.push('solution = ?')
        values.push(fields.solution)
      }
      if (fields.recommendation !== undefined) {
        setClauses.push('recommendation = ?')
        values.push(fields.recommendation)
      }
      if (fields.tags !== undefined) {
        setClauses.push('tags = ?')
        values.push(JSON.stringify(fields.tags))
      }

      if (setClauses.length === 0) return

      values.push(lessonId)
      await db.execute(
        `UPDATE lessons SET ${setClauses.join(', ')} WHERE id = ?`,
        values
      )

      toast.success('Lesson updated')

      // Re-embed after update (non-blocking)
      embedLesson(lessonId).catch(() =>
        toast.warning('Lesson saved, but search indexing failed. It may not appear in search results.')
      )
    },
    [db]
  )

  /** Deletes a lesson from PowerSync. Embedding cascades via FK. */
  const deleteLesson = useCallback(
    async (lessonId: string): Promise<void> => {
      await db.execute('DELETE FROM lessons WHERE id = ?', [lessonId])
      toast.success('Lesson deleted')
    },
    [db]
  )

  return { lessons, allTags, isLoading, createLesson, updateLesson, deleteLesson }
}
