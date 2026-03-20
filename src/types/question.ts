/** Question entity as stored in PowerSync local DB. */
export interface Question {
  id: string;
  project_id: string;
  question: string;
  answer: string | null;
  sources: string; // JSON string — parse with JSON.parse()
  created_at: string;
}

/** Source reference in a RAG answer. */
export interface SourceRef {
  type: 'lesson' | 'chunk';
  id: string;
  document_id?: string;
  chunk_index?: number;
  content?: string;
  title?: string;
}

/** Parsed sources helper. */
export function parseSources(sourcesStr: string | null): SourceRef[] {
  if (!sourcesStr) return [];
  try {
    const parsed = JSON.parse(sourcesStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
