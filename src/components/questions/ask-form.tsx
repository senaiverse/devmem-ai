import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { SearchMode } from '@/types/api'

export interface AskFormProps {
  mode: SearchMode
  query: string
  onQueryChange: (value: string) => void
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
  antipattern: {
    placeholder: 'Describe a code pattern to check...',
    buttonLabel: 'Check pattern',
    searchingLabel: 'Analyzing...',
  },
}

/**
 * Controlled form for submitting a RAG search query.
 * Adapts placeholder and button text based on the active mode.
 * Query state is lifted to the parent so it persists across tab switches.
 */
export function AskForm({ mode, query, onQueryChange, onSubmit, isSearching }: AskFormProps) {
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
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={config.placeholder}
        rows={3}
        disabled={isSearching}
      />
      <Button type="submit" disabled={isSearching || !query.trim()}>
        {isSearching && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
        {isSearching ? config.searchingLabel : config.buttonLabel}
      </Button>
    </form>
  )
}
