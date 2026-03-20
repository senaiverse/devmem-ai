import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Markdown } from '@/components/ui/markdown'
import type { Question } from '@/types/question'
import { parseSources } from '@/types/question'

interface QuestionDetailDialogProps {
  question: Question | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Centered dialog showing a past Q&A entry: full answer text,
 * parsed source references, and timestamp.
 */
export function QuestionDetailDialog({
  question,
  open,
  onOpenChange,
}: QuestionDetailDialogProps) {
  if (!question) return null

  const sources = parseSources(question.sources)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium leading-snug">
            {question.question}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-2">
          {question.answer ? (
            <Markdown className="text-sm">{question.answer}</Markdown>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              Waiting for answer...
            </p>
          )}

          {sources.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Sources
                </h3>
                <div className="space-y-2">
                  {sources.map((source, i) => (
                    <div
                      key={`${source.id}-${i}`}
                      className="flex items-start gap-2 rounded-md border bg-muted/50 p-2"
                    >
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {source.type === 'lesson' ? 'Lesson' : 'Document'}
                      </Badge>
                      <div className="min-w-0">
                        {source.title && (
                          <p className="text-sm font-medium">{source.title}</p>
                        )}
                        {source.content && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-3">
                            {source.content}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          <p className="text-xs text-muted-foreground">
            Asked: {new Date(question.created_at).toLocaleString()}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
