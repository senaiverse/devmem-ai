import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ErrorResultDisplay } from './error-result-display'
import type { SearchResponse } from '@/types/api'

interface AnswerDisplayProps {
  result: SearchResponse
}

/**
 * Displays search results. Delegates to ErrorResultDisplay when
 * the response contains error-mode fields (similar_lessons).
 */
export function AnswerDisplay({ result }: AnswerDisplayProps) {
  if (result.similar_lessons && result.similar_lessons.length > 0) {
    return <ErrorResultDisplay result={result} />
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Answer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{result.answer}</p>
        </CardContent>
      </Card>

      {result.sources.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Sources</h3>
          <div className="space-y-2">
            {result.sources.map((source, i) => (
              <Card key={`${source.id}-${i}`} className="bg-muted/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {source.type === 'lesson' ? 'Lesson' : 'Document'}
                    </Badge>
                    {source.title && (
                      <span className="text-sm font-medium">{source.title}</span>
                    )}
                  </div>
                  {source.content && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-3">
                      {source.content}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
