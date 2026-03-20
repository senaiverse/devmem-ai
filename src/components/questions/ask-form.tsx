import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { SearchMode } from '@/types/api'

interface AskFormProps {
  mode: SearchMode
  onSubmit: (query: string) => void
  isSearching: boolean
}

const MODE_CONFIG: Record<SearchMode, { placeholder: string; buttonLabel: string; searchingLabel: string }> = {
  question: {
    placeholder: 'Ask a question about this project...',
    buttonLabel: 'Ask',
    searchingLabel: 'Searching...',
  },
  error: {
    placeholder: 'Paste an error message or stack trace...',
    buttonLabel: 'Find similar issues',
    searchingLabel: 'Analyzing...',
  },
}

/**
 * Form for submitting a RAG search query.
 * Adapts placeholder and button text based on the active mode.
 */
export function AskForm({ mode, onSubmit, isSearching }: AskFormProps) {
  const [query, setQuery] = useState('')
  const config = MODE_CONFIG[mode]

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim() || isSearching) return
    onSubmit(query.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-3">
      <Textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={config.placeholder}
        rows={3}
        disabled={isSearching}
      />
      <Button type="submit" disabled={isSearching || !query.trim()}>
        {isSearching ? config.searchingLabel : config.buttonLabel}
      </Button>
    </form>
  )
}
