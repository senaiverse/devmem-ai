import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { AntipatternList } from './antipattern-list'
import { LessonDetailSheet } from '@/components/lessons/lesson-detail-sheet'
import { useAntipatterns } from '@/hooks/use-antipatterns'
import { classifyLessons } from '@/services/classify.service'
import type { Lesson } from '@/types/lesson'
import type { LessonWriteFields } from '@/hooks/use-lessons'

interface AntiPatternsTabContentProps {
  projectId: string
  projectName: string
  onUpdateLesson?: (lessonId: string, fields: Partial<LessonWriteFields>) => Promise<void>
  onDeleteLesson?: (lessonId: string) => Promise<void>
}

/**
 * Content for the Antipatterns tab: list + classify all button.
 */
export function AntiPatternsTabContent({
  projectId,
  projectName,
  onUpdateLesson,
  onDeleteLesson,
}: AntiPatternsTabContentProps) {
  const { grouped, isLoading, count } = useAntipatterns(projectId)
  const [isClassifying, setIsClassifying] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)

  async function handleClassifyAll() {
    setIsClassifying(true)
    try {
      const result = await classifyLessons(projectId)
      toast.success(
        `Classified ${result.classified_count} lesson${result.classified_count !== 1 ? 's' : ''}${result.errors > 0 ? ` (${result.errors} errors)` : ''}`
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Classification failed'
      toast.error(message)
    } finally {
      setIsClassifying(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Antipatterns ({count})</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClassifyAll}
          disabled={isClassifying}
        >
          {isClassifying ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 h-4 w-4" />
          )}
          Classify All
        </Button>
      </div>

      <AntipatternList
        grouped={grouped}
        isLoading={isLoading}
        projectName={projectName}
        onViewLesson={setSelectedLesson}
      />

      <LessonDetailSheet
        lesson={selectedLesson}
        open={selectedLesson !== null}
        onOpenChange={(open) => { if (!open) setSelectedLesson(null) }}
        onUpdate={onUpdateLesson}
        onDelete={onDeleteLesson}
        projectName={projectName}
      />
    </div>
  )
}
