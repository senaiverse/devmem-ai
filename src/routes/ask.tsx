import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@powersync/react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { AskForm } from '@/components/questions/ask-form'
import { AnswerDisplay } from '@/components/questions/answer-display'
import { QuestionHistory } from '@/components/questions/question-history'
import { useSearch } from '@/hooks/use-search'
import { useQuestions } from '@/hooks/use-questions'
import type { Project } from '@/types/project'

/**
 * /projects/:id/ask — RAG-powered Q&A page.
 */
export function AskPage() {
  const { id } = useParams<{ id: string }>()
  const { data: projectRows } = useQuery<Project>(
    'SELECT * FROM projects WHERE id = ? LIMIT 1',
    [id!]
  )
  const project = projectRows[0] ?? null

  const { search, result, isSearching, error, reset } = useSearch(id!)
  const { questions, isLoading: isLoadingHistory } = useQuestions(id!)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ask a Question</h1>
          {project && (
            <p className="text-sm text-muted-foreground">{project.name}</p>
          )}
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/projects/${id}`}>Back to Project</Link>
        </Button>
      </div>

      <AskForm onSubmit={search} isSearching={isSearching} />

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Result</h2>
            <Button variant="ghost" size="sm" onClick={reset}>
              Clear
            </Button>
          </div>
          <AnswerDisplay result={result} />
        </div>
      )}

      <Separator />

      <div>
        <h2 className="mb-4 text-lg font-semibold">History</h2>
        <QuestionHistory questions={questions} isLoading={isLoadingHistory} />
      </div>
    </div>
  )
}
