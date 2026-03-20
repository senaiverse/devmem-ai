import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CopyPromptButton } from '@/components/lessons/copy-prompt-button'
import { ExternalLink } from 'lucide-react'
import type { Lesson, RiskLevel } from '@/types/lesson'

interface AntipatternCardProps {
  lesson: Lesson
  projectName: string
  onViewLesson: (lesson: Lesson) => void
}

const RISK_BADGE_VARIANT: Record<string, 'destructive' | 'secondary' | 'outline'> = {
  high: 'destructive',
  medium: 'secondary',
  low: 'outline',
}

/**
 * Card displaying a single antipattern entry with risk badge,
 * name, reason, and action buttons.
 */
export function AntipatternCard({ lesson, projectName, onViewLesson }: AntipatternCardProps) {
  const variant = RISK_BADGE_VARIANT[lesson.risk_level] ?? 'outline'

  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant={variant} className="text-xs shrink-0">
                {lesson.risk_level}
              </Badge>
              <span className="text-sm font-semibold truncate">
                {lesson.antipattern_name || lesson.title}
              </span>
            </div>
            {lesson.antipattern_reason && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {lesson.antipattern_reason}
              </p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <CopyPromptButton lesson={lesson} projectName={projectName} />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onViewLesson(lesson)}
              aria-label="View lesson"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
