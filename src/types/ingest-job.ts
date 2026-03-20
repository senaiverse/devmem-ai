/** Valid ingest job statuses as a union type. */
export type IngestJobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelling'
  | 'cancelled'

/** Ingest job entity as stored in PowerSync local DB. */
export interface IngestJob {
  id: string
  project_id: string
  storage_path: string
  file_name: string
  category: string
  status: IngestJobStatus
  error: string | null
  document_id: string | null
  progress: number
  created_at: string
  updated_at: string
}
