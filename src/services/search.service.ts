import { EDGE_FUNCTIONS_URL } from '@/lib/constants'
import { assertOnline } from '@/lib/network-guard'
import type { SearchRequest, SearchResponse, SearchMode } from '@/types/api'

/**
 * Calls the /api/search Edge Function for RAG-powered Q&A.
 * Embeds the query, searches vector store, and returns a Gemini-generated answer.
 * In error mode, returns structured similar_lessons + suggested_steps.
 */
export async function searchProject(
  projectId: string,
  query: string,
  mode: SearchMode = 'question'
): Promise<SearchResponse> {
  assertOnline()
  const body: SearchRequest = { project_id: projectId, query, mode }

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
