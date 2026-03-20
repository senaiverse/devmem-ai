import { EDGE_FUNCTIONS_URL } from '@/lib/constants'
import { assertOnline } from '@/lib/network-guard'

/** Response from the generate-lessons-from-doc Edge Function. */
export interface GenerateLessonsResponse {
  created_lessons_count: number
  lesson_ids: string[]
}

/**
 * Calls the generate-lessons-from-doc Edge Function to extract
 * additional lessons from an existing document on demand.
 */
export async function generateLessonsFromDoc(
  documentId: string,
  projectId: string,
): Promise<GenerateLessonsResponse> {
  assertOnline()
  const res = await fetch(`${EDGE_FUNCTIONS_URL}/generate-lessons-from-doc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_id: documentId, project_id: projectId }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Lesson generation failed (${res.status}): ${text}`)
  }

  return res.json() as Promise<GenerateLessonsResponse>
}
