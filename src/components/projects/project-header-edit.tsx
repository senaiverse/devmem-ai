import { useState, useRef, useEffect } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export interface ProjectHeaderEditProps {
  name: string
  description: string | null
  onSave: (name: string, slug: string, description: string | null) => Promise<void>
}

/** Generates a URL-safe slug from a project name. */
function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Inline-editable project name and description.
 * Displays static text by default; pencil icon toggles edit mode
 * with Input/Textarea fields and Save/Cancel actions.
 */
export function ProjectHeaderEdit({ name, description, onSave }: ProjectHeaderEditProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(name)
  const [editDescription, setEditDescription] = useState(description ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      nameInputRef.current?.focus()
    }
  }, [isEditing])

  function handleStartEdit() {
    setEditName(name)
    setEditDescription(description ?? '')
    setIsEditing(true)
  }

  function handleCancel() {
    setIsEditing(false)
  }

  async function handleSave() {
    const trimmedName = editName.trim()
    if (!trimmedName) {
      toast.error('Project name cannot be empty')
      return
    }

    setIsSaving(true)
    try {
      await onSave(
        trimmedName,
        toSlug(trimmedName),
        editDescription.trim() || null
      )
      setIsEditing(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update project'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') handleCancel()
  }

  if (isEditing) {
    return (
      <div className="space-y-2" onKeyDown={handleKeyDown}>
        <Input
          ref={nameInputRef}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder="Project name"
          className="text-lg font-bold"
          disabled={isSaving}
        />
        <Textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          placeholder="Project description (optional)"
          rows={2}
          disabled={isSaving}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !editName.trim()}
          >
            <Check className="mr-1 h-3.5 w-3.5" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="group/header flex items-start gap-2">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold">{name}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleStartEdit}
        aria-label="Edit project name and description"
        className="shrink-0 opacity-0 transition-opacity group-hover/header:opacity-100 focus:opacity-100"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
