import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface AskFormProps {
  onSubmit: (query: string) => void
  isSearching: boolean
}

/**
 * Form for submitting a RAG search query.
 */
export function AskForm({ onSubmit, isSearching }: AskFormProps) {
  const [query, setQuery] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim() || isSearching) return
    onSubmit(query.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask a question about this project..."
        rows={3}
        disabled={isSearching}
      />
      <Button type="submit" disabled={isSearching || !query.trim()}>
        {isSearching ? 'Searching...' : 'Ask'}
      </Button>
    </form>
  )
}
