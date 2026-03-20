import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Expand } from 'lucide-react'
import { QuestionDetailDialog } from './question-detail-dialog'
import type { Question } from '@/types/question'

interface QuestionHistoryProps {
  questions: Question[]
  isLoading: boolean
}

/**
 * List of past Q&A entries from PowerSync local DB.
 * Cards are clickable — opens a centered dialog with the full answer and sources.
 */
export function QuestionHistory({ questions, isLoading }: QuestionHistoryProps) {
  const [selected, setSelected] = useState<Question | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm font-medium">No questions asked yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Use the form above to ask your first question.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {questions.map((q) => (
          <Card
            key={q.id}
            role="button"
            tabIndex={0}
            className="group cursor-pointer transition-all duration-200 hover:bg-accent/50 hover:shadow-md hover:-translate-y-0.5"
            onClick={() => setSelected(q)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(q) } }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm font-medium">{q.question}</CardTitle>
                <Expand className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </CardHeader>
            <CardContent>
              {q.answer ? (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {q.answer}
                </p>
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  Waiting for answer...
                </p>
              )}
              <Separator className="my-2" />
              <p className="text-xs text-muted-foreground">
                {new Date(q.created_at).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <QuestionDetailDialog
        question={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      />
    </>
  )
}
