import { EDGE_FUNCTIONS_URL } from '@/lib/constants'
import type { IngestDocRequest, IngestDocResponse } from '@/types/api'

/**
 * Reads a File object and sends its text content to the ingest-doc Edge Function.
 * Returns the document ID, chunk count, and number of lessons auto-generated.
 */
export async function ingestFile(
  projectId: string,
  file: File,
  category: string
): Promise<IngestDocResponse> {
  const rawText = await file.text()

  const body: IngestDocRequest = {
    project_id: projectId,
    path: file.name,
    title: file.name.replace(/\.[^.]+$/, ''),
    category,
    raw_text: rawText,
  }

  const res = await fetch(`${EDGE_FUNCTIONS_URL}/ingest-doc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Ingest failed for ${file.name} (${res.status}): ${text}`)
  }

  return res.json() as Promise<IngestDocResponse>
}
