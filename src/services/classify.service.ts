import { EDGE_FUNCTIONS_URL } from '@/lib/constants'
import { assertOnline } from '@/lib/network-guard'

/** Response from the classify-lessons Edge Function. */
export interface ClassifyLessonsResponse {
  classified_count: number
  errors: number
}

/**
 * Calls the classify-lessons Edge Function to bulk-classify
 * all unclassified lessons for a project.
 */
export async function classifyLessons(
  projectId: string
): Promise<ClassifyLessonsResponse> {
  assertOnline()
  const res = await fetch(`${EDGE_FUNCTIONS_URL}/classify-lessons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Classification failed (${res.status}): ${text}`)
  }

  return res.json() as Promise<ClassifyLessonsResponse>
}
