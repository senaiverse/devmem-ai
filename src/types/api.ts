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

/** Search mode: standard question or error/stack-trace analysis. */
export type SearchMode = 'question' | 'error';

/** Request body for POST /api/search */
export interface SearchRequest {
  project_id: string;
  query: string;
  mode?: SearchMode;
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
  /** Present in error mode — lessons similar to the pasted error/stack trace. */
  similar_lessons?: Array<{
    lesson_id: string;
    title: string;
    reason: string;
  }>;
  /** Present in error mode — suggested resolution steps. */
  suggested_steps?: string[];
}

/** Request body for POST /api/process-ingest-job */
export interface ProcessIngestJobRequest {
  job_id: string;
}

/** Response from POST /api/process-ingest-job */
export interface ProcessIngestJobResponse {
  document_id: string;
  chunk_count: number;
  lessons_created: number;
}

/** Request body for POST /api/embed-lesson */
export interface EmbedLessonRequest {
  lesson_id: string;
}

/** Response from POST /api/embed-lesson */
export interface EmbedLessonResponse {
  lesson_id: string;
  success: boolean;
}

/** Request body for POST /api/list-documents */
export interface ListDocumentsRequest {
  project_id: string;
}

/** Response from POST /api/list-documents */
export interface ListDocumentsResponse {
  documents: DocumentSummaryApi[];
}

/** Document summary shape from the list-documents Edge Function. */
export interface DocumentSummaryApi {
  id: string;
  project_id: string;
  path: string | null;
  title: string;
  category: string | null;
  chunk_count: number;
  created_at: string;
  updated_at: string | null;
}

/** Request body for POST /api/delete-document */
export interface DeleteDocumentRequest {
  document_id: string;
}

/** Response from POST /api/delete-document */
export interface DeleteDocumentResponse {
  success: boolean;
  document_id: string;
}
