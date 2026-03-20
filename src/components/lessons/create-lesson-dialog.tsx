import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'
import type { LessonWriteFields } from '@/hooks/use-lessons'

interface CreateLessonDialogProps {
  onCreate: (fields: LessonWriteFields) => Promise<string>
}

/**
 * Dialog form for creating a manual lesson.
 */
export function CreateLessonDialog({ onCreate }: CreateLessonDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [title, setTitle] = useState('')
  const [problem, setProblem] = useState('')
  const [rootCause, setRootCause] = useState('')
  const [solution, setSolution] = useState('')
  const [recommendation, setRecommendation] = useState('')
  const [tagsInput, setTagsInput] = useState('')

  function resetForm() {
    setTitle('')
    setProblem('')
    setRootCause('')
    setSolution('')
    setRecommendation('')
    setTagsInput('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setIsSubmitting(true)
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      await onCreate({
        title: title.trim(),
        problem: problem.trim() || null,
        root_cause: rootCause.trim() || null,
        solution: solution.trim() || null,
        recommendation: recommendation.trim() || null,
        tags,
      })

      resetForm()
      setOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Add Lesson
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Lesson</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lesson-title">Title *</Label>
            <Input
              id="lesson-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Concise lesson title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson-problem">Problem</Label>
            <Textarea
              id="lesson-problem"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="What problem or question does this address?"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson-root-cause">Root Cause</Label>
            <Textarea
              id="lesson-root-cause"
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              placeholder="Underlying reason or context"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson-solution">Solution</Label>
            <Textarea
              id="lesson-solution"
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder="What was decided or implemented?"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson-recommendation">Recommendation</Label>
            <Textarea
              id="lesson-recommendation"
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              placeholder="Guidance for future reference"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson-tags">Tags (comma-separated)</Label>
            <Input
              id="lesson-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="react, typescript, auth"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? 'Creating...' : 'Create Lesson'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
