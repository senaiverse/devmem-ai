import { EDGE_FUNCTIONS_URL } from '@/lib/constants'
import type { SearchRequest, SearchResponse } from '@/types/api'

/**
 * Calls the /api/search Edge Function for RAG-powered Q&A.
 * Embeds the query, searches vector store, and returns a Gemini-generated answer.
 */
export async function searchProject(
  projectId: string,
  query: string
): Promise<SearchResponse> {
  const body: SearchRequest = { project_id: projectId, query }

  const res = await fetch(`${EDGE_FUNCTIONS_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Search failed (${res.status}): ${text}`)
  }

  return res.json() as Promise<SearchResponse>
}
