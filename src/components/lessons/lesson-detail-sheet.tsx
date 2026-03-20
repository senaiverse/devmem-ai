import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { EditLessonForm } from './edit-lesson-form'
import { CopyPromptButton } from './copy-prompt-button'
import type { Lesson } from '@/types/lesson'
import { parseTags } from '@/types/lesson'
import type { LessonWriteFields } from '@/hooks/use-lessons'

interface LessonDetailSheetProps {
  lesson: Lesson | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: (lessonId: string, fields: Partial<LessonWriteFields>) => Promise<void>
  onDelete?: (lessonId: string) => Promise<void>
  projectName?: string
}

/**
 * Centered dialog showing full lesson detail with edit and delete capabilities.
 * Header stays fixed; content area scrolls independently.
 */
export function LessonDetailSheet({
  lesson,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  projectName,
}: LessonDetailSheetProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  if (!lesson) return null

  const tags = parseTags(lesson.tags)

  async function handleSave(lessonId: string, fields: Partial<LessonWriteFields>) {
    if (!onUpdate) return
    await onUpdate(lessonId, fields)
    setIsEditing(false)
  }

  async function handleDelete() {
    if (!onDelete || !lesson) return
    setIsDeleting(true)
    try {
      await onDelete(lesson.id)
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete lesson')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setIsEditing(false)
        onOpenChange(o)
      }}
    >
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-xl" showCloseButton={false}>
        {/* Sticky header */}
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <DialogTitle className="flex-1">{lesson.title}</DialogTitle>
            {!isEditing && (
              <div className="flex gap-1">
                {projectName && (
                  <CopyPromptButton lesson={lesson} projectName={projectName} />
                )}
                {onUpdate && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} aria-label="Edit" />
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent>Edit lesson</TooltipContent>
                  </Tooltip>
                )}
                {onDelete && (
                  <AlertDialog>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <AlertDialogTrigger
                            render={
                              <Button variant="ghost" size="icon" aria-label="Delete" />
                            }
                          />
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </TooltipTrigger>
                      <TooltipContent>Delete lesson</TooltipContent>
                    </Tooltip>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete &ldquo;{lesson.title}&rdquo; and its embedding. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                          {isDeleting ? (
                            <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Deleting...</>
                          ) : (
                            'Delete'
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="min-h-0 flex-1 overflow-y-auto space-y-4 pb-2">
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
      </DialogContent>
    </Dialog>
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
