import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { AntipatternList } from './antipattern-list'
import { LessonDetailSheet } from '@/components/lessons/lesson-detail-sheet'
import { useAntipatterns } from '@/hooks/use-antipatterns'
import { useSyncStatus } from '@/hooks/use-sync-status'
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
  const { isOnline } = useSyncStatus()
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
        <div>
          <h2 className="text-lg font-semibold">Antipatterns ({count})</h2>
          <p className="text-sm text-muted-foreground">
            Lessons flagged with potential code smells or tech debt. Click &quot;Classify All&quot; to scan unclassified lessons.
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                onClick={handleClassifyAll}
                disabled={isClassifying || !isOnline}
              />
            }
          >
            {isClassifying ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-4 w-4" />
            )}
            Classify All
          </TooltipTrigger>
          <TooltipContent>
            {isOnline ? 'Scan unclassified lessons for antipatterns' : 'Requires network connection'}
          </TooltipContent>
        </Tooltip>
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
