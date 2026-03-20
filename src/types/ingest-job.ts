/** Ingest job entity as stored in PowerSync local DB. */
export interface IngestJob {
  id: string;
  project_id: string;
  storage_path: string;
  file_name: string;
  category: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error: string | null;
  document_id: string | null;
  created_at: string;
  updated_at: string;
}
