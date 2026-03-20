import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { CopyPromptButton } from '@/components/lessons/copy-prompt-button'
import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lesson } from '@/types/lesson'

interface AntipatternCardProps {
  lesson: Lesson
  projectName: string
  onViewLesson: (lesson: Lesson) => void
}

/** Returns badge variant + optional className for risk level display. */
function getRiskBadgeClasses(level: string): {
  variant: 'destructive' | 'outline'
  className?: string
} {
  switch (level) {
    case 'high':
      return { variant: 'destructive' }
    case 'medium':
      return { variant: 'outline', className: 'border-warning/50 bg-warning/10 text-warning' }
    default:
      return { variant: 'outline' }
  }
}

/**
 * Card displaying a single antipattern entry with risk badge,
 * name, reason, and action buttons.
 */
export function AntipatternCard({ lesson, projectName, onViewLesson }: AntipatternCardProps) {
  const { variant, className: riskClassName } = getRiskBadgeClasses(lesson.risk_level)

  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant={variant} className={cn('text-xs shrink-0', riskClassName)}>
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
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onViewLesson(lesson)}
                    aria-label="View lesson"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent>View lesson details</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
