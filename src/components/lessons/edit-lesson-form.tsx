import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { Lesson } from '@/types/lesson'
import { parseTags } from '@/types/lesson'
import type { LessonWriteFields } from '@/hooks/use-lessons'

interface EditLessonFormProps {
  lesson: Lesson
  onSave: (lessonId: string, fields: Partial<LessonWriteFields>) => Promise<void>
  onCancel: () => void
}

/**
 * Inline edit form for a lesson, used inside the detail sheet.
 */
export function EditLessonForm({ lesson, onSave, onCancel }: EditLessonFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [title, setTitle] = useState(lesson.title)
  const [problem, setProblem] = useState(lesson.problem ?? '')
  const [rootCause, setRootCause] = useState(lesson.root_cause ?? '')
  const [solution, setSolution] = useState(lesson.solution ?? '')
  const [recommendation, setRecommendation] = useState(lesson.recommendation ?? '')
  const [tagsInput, setTagsInput] = useState(parseTags(lesson.tags).join(', '))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setIsSubmitting(true)
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      await onSave(lesson.id, {
        title: title.trim(),
        problem: problem.trim() || null,
        root_cause: rootCause.trim() || null,
        solution: solution.trim() || null,
        recommendation: recommendation.trim() || null,
        tags,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-title">Title</Label>
        <Input
          id="edit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-problem">Problem</Label>
        <Textarea
          id="edit-problem"
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-root-cause">Root Cause</Label>
        <Textarea
          id="edit-root-cause"
          value={rootCause}
          onChange={(e) => setRootCause(e.target.value)}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-solution">Solution</Label>
        <Textarea
          id="edit-solution"
          value={solution}
          onChange={(e) => setSolution(e.target.value)}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-recommendation">Recommendation</Label>
        <Textarea
          id="edit-recommendation"
          value={recommendation}
          onChange={(e) => setRecommendation(e.target.value)}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
        <Input
          id="edit-tags"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting || !title.trim()}>
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
