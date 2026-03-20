import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { Lesson } from '@/types/lesson'
import { parseTags } from '@/types/lesson'

interface LessonDetailSheetProps {
  lesson: Lesson | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Side panel showing full lesson detail (problem, root cause, solution, recommendation).
 */
export function LessonDetailSheet({ lesson, open, onOpenChange }: LessonDetailSheetProps) {
  if (!lesson) return null

  const tags = parseTags(lesson.tags)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{lesson.title}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {lesson.problem && (
            <Section title="Problem" content={lesson.problem} />
          )}

          {lesson.root_cause && (
            <Section title="Root Cause" content={lesson.root_cause} />
          )}

          {lesson.solution && (
            <Section title="Solution" content={lesson.solution} />
          )}

          {lesson.recommendation && (
            <Section title="Recommendation" content={lesson.recommendation} />
          )}

          <Separator />

          <div className="text-xs text-muted-foreground">
            {lesson.source_type && (
              <p>Source: {lesson.source_type}{lesson.source_ref ? ` — ${lesson.source_ref}` : ''}</p>
            )}
            <p>Created: {new Date(lesson.created_at).toLocaleString()}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
        {content}
      </p>
    </div>
  )
}
