import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { LessonCard } from './lesson-card'
import { LessonDetailSheet } from './lesson-detail-sheet'
import { LessonFilters } from './lesson-filters'
import type { Lesson } from '@/types/lesson'
import type { LessonWriteFields } from '@/hooks/use-lessons'

interface LessonListProps {
  lessons: Lesson[]
  allTags: string[]
  isLoading: boolean
  searchTerm: string
  onSearchChange: (value: string) => void
  filterTag: string
  onFilterTagChange: (tag: string) => void
  onUpdateLesson?: (lessonId: string, fields: Partial<LessonWriteFields>) => Promise<void>
  onDeleteLesson?: (lessonId: string) => Promise<void>
}

/**
 * Filterable list of lesson cards with a detail side panel.
 * Optionally supports edit/delete via mutation callbacks.
 */
export function LessonList({
  lessons,
  allTags,
  isLoading,
  searchTerm,
  onSearchChange,
  filterTag,
  onFilterTagChange,
  onUpdateLesson,
  onDeleteLesson,
}: LessonListProps) {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)

  return (
    <div>
      <LessonFilters
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        filterTag={filterTag}
        onFilterTagChange={onFilterTagChange}
        allTags={allTags}
      />

      {isLoading ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : lessons.length === 0 ? (
        <div className="mt-8 text-center text-sm text-muted-foreground">
          {searchTerm || filterTag
            ? 'No lessons match your filters.'
            : 'No lessons yet. Import docs or create a lesson to get started.'}
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {lessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              onClick={() => setSelectedLesson(lesson)}
            />
          ))}
        </div>
      )}

      <LessonDetailSheet
        lesson={selectedLesson}
        open={selectedLesson !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedLesson(null)
        }}
        onUpdate={onUpdateLesson}
        onDelete={onDeleteLesson}
      />
    </div>
  )
}
