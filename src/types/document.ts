/** Document summary returned by the list-documents Edge Function. */
export interface DocumentSummary {
  id: string;
  project_id: string;
  path: string | null;
  title: string;
  category: string | null;
  chunk_count: number;
  created_at: string;
  updated_at: string | null;
}
