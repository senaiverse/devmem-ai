import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Lesson } from '@/types/lesson'
import { parseTags } from '@/types/lesson'

interface LessonCardProps {
  lesson: Lesson
  onClick: () => void
}

/**
 * Card for a single lesson showing title, tags, and creation date.
 */
export function LessonCard({ lesson, onClick }: LessonCardProps) {
  const tags = parseTags(lesson.tags)

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-accent/50"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{lesson.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
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
