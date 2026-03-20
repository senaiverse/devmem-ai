import { LessonList } from './lesson-list'
import { CreateLessonDialog } from './create-lesson-dialog'
import { ExportLessonsButton } from './export-lessons-button'
import type { Lesson } from '@/types/lesson'
import type { LessonWriteFields } from '@/hooks/use-lessons'

interface LessonsTabContentProps {
  lessons: Lesson[]
  allTags: string[]
  isLoading: boolean
  searchTerm: string
  onSearchChange: (value: string) => void
  filterTag: string
  onFilterTagChange: (tag: string) => void
  projectName: string
  onCreateLesson: (fields: LessonWriteFields) => Promise<string>
  onUpdateLesson: (lessonId: string, fields: Partial<LessonWriteFields>) => Promise<void>
  onDeleteLesson: (lessonId: string) => Promise<void>
}

/**
 * Content for the Lessons tab: heading with count, export/create actions,
 * and the filterable lesson list.
 */
export function LessonsTabContent({
  lessons,
  allTags,
  isLoading,
  searchTerm,
  onSearchChange,
  filterTag,
  onFilterTagChange,
  projectName,
  onCreateLesson,
  onUpdateLesson,
  onDeleteLesson,
}: LessonsTabContentProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Lessons ({lessons.length})</h2>
        <div className="flex gap-2">
          <ExportLessonsButton lessons={lessons} projectName={projectName} />
          <CreateLessonDialog onCreate={onCreateLesson} />
        </div>
      </div>
      <LessonList
        lessons={lessons}
        allTags={allTags}
        isLoading={isLoading}
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        filterTag={filterTag}
        onFilterTagChange={onFilterTagChange}
        projectName={projectName}
        onUpdateLesson={onUpdateLesson}
        onDeleteLesson={onDeleteLesson}
      />
    </div>
  )
}
