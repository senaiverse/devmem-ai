import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Lesson } from '@/types/lesson'
import { parseTags } from '@/types/lesson'

interface LessonCardProps {
  lesson: Lesson
  onClick: () => void
}

/** Whether risk level warrants a visible badge (skip none/low). */
function isNotableRisk(level: string | undefined): boolean {
  return !!level && level !== 'none' && level !== 'low'
}

/**
 * Card for a single lesson showing title, tags, risk level,
 * source type, and creation date.
 */
export function LessonCard({ lesson, onClick }: LessonCardProps) {
  const tags = parseTags(lesson.tags)
  const showRisk = isNotableRisk(lesson.risk_level)
  const hasBadges = tags.length > 0 || showRisk || !!lesson.source_type

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-accent/50"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{lesson.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {hasBadges && (
          <div className="mb-2 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {showRisk && (
              <Badge
                variant={lesson.risk_level === 'high' ? 'destructive' : 'outline'}
                className={cn(
                  'text-xs',
                  lesson.risk_level === 'medium' && 'border-warning/50 bg-warning/10 text-warning'
                )}
              >
                {lesson.risk_level} risk
              </Badge>
            )}
            {lesson.source_type && (
              <Badge variant="secondary" className="text-xs">
                {lesson.source_type}
              </Badge>
            )}
          </div>
        )}
        {lesson.problem && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {lesson.problem}
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {new Date(lesson.created_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  )
}
