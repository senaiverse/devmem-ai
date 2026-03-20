import { EDGE_FUNCTIONS_URL } from '@/lib/constants'
import { assertOnline } from '@/lib/network-guard'
import type { ListDocumentsResponse, DeleteDocumentResponse } from '@/types/api'

/**
 * Fetches document summaries (with chunk counts) for a project
 * from the list-documents Edge Function.
 */
export async function listDocuments(projectId: string): Promise<ListDocumentsResponse> {
  assertOnline()
  const res = await fetch(`${EDGE_FUNCTIONS_URL}/list-documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`list-documents failed (${res.status}): ${text}`)
  }

  return res.json() as Promise<ListDocumentsResponse>
}

/**
 * Deletes a document and its associated chunks, lessons, and storage file
 * via the delete-document Edge Function.
 */
export async function deleteDocument(documentId: string): Promise<DeleteDocumentResponse> {
  assertOnline()
  const res = await fetch(`${EDGE_FUNCTIONS_URL}/delete-document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_id: documentId }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`delete-document failed (${res.status}): ${text}`)
  }

  return res.json() as Promise<DeleteDocumentResponse>
}
