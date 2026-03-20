/** Request body for POST /api/ingest-doc */
export interface IngestDocRequest {
  project_id: string;
  path: string;
  title: string;
  category: string;
  raw_text: string;
}

/** Response from POST /api/ingest-doc */
export interface IngestDocResponse {
  document_id: string;
  chunk_count: number;
  lessons_created: number;
}

/** Request body for POST /api/create-lesson-from-change */
export interface CreateLessonRequest {
  project_id: string;
  diff_summary?: string;
  error_log?: string;
  notes?: string;
}

/** Request body for POST /api/search */
export interface SearchRequest {
  project_id: string;
  query: string;
}

/** Response from POST /api/search */
export interface SearchResponse {
  answer: string;
  sources: Array<{
    type: 'lesson' | 'chunk';
    id: string;
    document_id?: string;
    chunk_index?: number;
    content?: string;
    title?: string;
  }>;
  question_id: string;
}
