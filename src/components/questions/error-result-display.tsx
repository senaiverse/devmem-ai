import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, ListChecks } from 'lucide-react'
import type { SearchResponse } from '@/types/api'

interface ErrorResultDisplayProps {
  result: SearchResponse
}

/**
 * Renders error-mode search results: summary, similar past issues,
 * and suggested resolution steps.
 */
export function ErrorResultDisplay({ result }: ErrorResultDisplayProps) {
  const { similar_lessons = [], suggested_steps = [] } = result

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{result.answer}</p>
        </CardContent>
      </Card>

      {similar_lessons.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Similar Past Issues</h3>
          <div className="space-y-2">
            {similar_lessons.map((item) => (
              <Card key={item.lesson_id} className="bg-muted/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Lesson</Badge>
                    <span className="text-sm font-medium">{item.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.reason}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {suggested_steps.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold">
            <ListChecks className="h-4 w-4" />
            Suggested Steps
          </h3>
          <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
            {suggested_steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      <p className="text-xs text-muted-foreground italic">
        Using project lessons and docs; no external data.
      </p>
    </div>
  )
}
