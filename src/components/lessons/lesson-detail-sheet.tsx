import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Pencil, Trash2 } from 'lucide-react'
import { EditLessonForm } from './edit-lesson-form'
import type { Lesson } from '@/types/lesson'
import { parseTags } from '@/types/lesson'
import type { LessonWriteFields } from '@/hooks/use-lessons'

interface LessonDetailSheetProps {
  lesson: Lesson | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: (lessonId: string, fields: Partial<LessonWriteFields>) => Promise<void>
  onDelete?: (lessonId: string) => Promise<void>
}

/**
 * Side panel showing full lesson detail with edit and delete capabilities.
 */
export function LessonDetailSheet({
  lesson,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
}: LessonDetailSheetProps) {
  const [isEditing, setIsEditing] = useState(false)

  if (!lesson) return null

  const tags = parseTags(lesson.tags)

  async function handleSave(lessonId: string, fields: Partial<LessonWriteFields>) {
    if (!onUpdate) return
    await onUpdate(lessonId, fields)
    setIsEditing(false)
  }

  async function handleDelete() {
    if (!onDelete) return
    await onDelete(lesson.id)
    onOpenChange(false)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) setIsEditing(false)
        onOpenChange(o)
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-start justify-between gap-2">
            <SheetTitle className="flex-1">{lesson.title}</SheetTitle>
            {(onUpdate || onDelete) && !isEditing && (
              <div className="flex gap-1">
                {onUpdate && (
                  <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete &ldquo;{lesson.title}&rdquo; and its embedding. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {isEditing && onUpdate ? (
            <EditLessonForm
              lesson={lesson}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {lesson.problem && <Section title="Problem" content={lesson.problem} />}
              {lesson.root_cause && <Section title="Root Cause" content={lesson.root_cause} />}
              {lesson.solution && <Section title="Solution" content={lesson.solution} />}
              {lesson.recommendation && <Section title="Recommendation" content={lesson.recommendation} />}

              <Separator />

              <div className="text-xs text-muted-foreground">
                {lesson.source_type && (
                  <p>Source: {lesson.source_type}{lesson.source_ref ? ` — ${lesson.source_ref}` : ''}</p>
                )}
                <p>Created: {new Date(lesson.created_at).toLocaleString()}</p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{content}</p>
    </div>
  )
}
