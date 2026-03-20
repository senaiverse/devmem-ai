import { EDGE_FUNCTIONS_URL } from '@/lib/constants'

/** Focus areas analysis — strong vs weak themes based on tag frequency. */
export interface FocusAreas {
  strong: string[]
  weak: string[]
  counts: Record<string, number>
}

/** Response from the summarize-period Edge Function. */
export interface SummarizePeriodResponse {
  summary: string
  themes: Record<string, string[]>
  follow_up: string
  focusAreas?: FocusAreas
  cached?: boolean
}

/**
 * Calls the summarize-period Edge Function to generate a thematic
 * summary of lessons recorded within the given time window.
 */
export async function summarizePeriod(
  projectId: string,
  from: string,
  to: string
): Promise<SummarizePeriodResponse> {
  const res = await fetch(`${EDGE_FUNCTIONS_URL}/summarize-period`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, from, to }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Summary failed (${res.status}): ${text}`)
  }

  return res.json() as Promise<SummarizePeriodResponse>
}
