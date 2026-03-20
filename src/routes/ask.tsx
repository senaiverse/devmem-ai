import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@powersync/react'
import { buttonVariants } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AskForm } from '@/components/questions/ask-form'
import { AnswerDisplay } from '@/components/questions/answer-display'
import { QuestionHistory } from '@/components/questions/question-history'
import { useSearch } from '@/hooks/use-search'
import { useQuestions } from '@/hooks/use-questions'
import type { Project } from '@/types/project'
import type { SearchMode } from '@/types/api'

/**
 * /projects/:id/ask — RAG-powered Q&A page with Question and Error modes.
 */
export function AskPage() {
  const { id } = useParams<{ id: string }>()
  const { data: projectRows } = useQuery<Project>(
    'SELECT * FROM projects WHERE id = ? LIMIT 1',
    [id!]
  )
  const project = projectRows[0] ?? null

  const [mode, setMode] = useState<SearchMode>('question')
  const { search, result, isSearching, error, reset } = useSearch(id!)
  const { questions, isLoading: isLoadingHistory } = useQuestions(id!)

  function handleSubmit(query: string) {
    search(query, mode)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ask a Question</h1>
          {project && (
            <p className="text-sm text-muted-foreground">{project.name}</p>
          )}
        </div>
        <Link to={`/projects/${id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Back to Project
        </Link>
      </div>

      <Tabs defaultValue="question" onValueChange={(v) => setMode(v as SearchMode)}>
        <TabsList>
          <TabsTrigger value="question">Question</TabsTrigger>
          <TabsTrigger value="error">Error</TabsTrigger>
        </TabsList>
        <TabsContent value="question">
          <AskForm
            mode="question"
            onSubmit={handleSubmit}
            isSearching={isSearching}
          />
        </TabsContent>
        <TabsContent value="error">
          <AskForm
            mode="error"
            onSubmit={handleSubmit}
            isSearching={isSearching}
          />
        </TabsContent>
      </Tabs>

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
