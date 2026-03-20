import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
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
  projectName?: string
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
  projectName,
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
        <div className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : lessons.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={searchTerm || filterTag ? 'No lessons match your filters' : 'No lessons yet'}
          description={
            searchTerm || filterTag
              ? 'Try adjusting your search or filter criteria.'
              : 'Import docs or create your first lesson to get started.'
          }
        />
      ) : (
        <div className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
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
        projectName={projectName}
      />
    </div>
  )
}
