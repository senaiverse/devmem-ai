import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import type { Question } from '@/types/question'

interface QuestionHistoryProps {
  questions: Question[]
  isLoading: boolean
}

/**
 * List of past Q&A entries from PowerSync local DB.
 */
export function QuestionHistory({ questions, isLoading }: QuestionHistoryProps) {
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
      <p className="text-sm text-muted-foreground">
        No questions asked yet.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {questions.map((q) => (
        <Card key={q.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{q.question}</CardTitle>
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
  )
}
