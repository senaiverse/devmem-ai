/** Lesson entity as stored in PowerSync local DB. */
export interface Lesson {
  id: string;
  project_id: string;
  title: string;
  problem: string | null;
  root_cause: string | null;
  solution: string | null;
  recommendation: string | null;
  tags: string; // JSON string of text[] — parse with JSON.parse()
  source_type: string | null;
  source_ref: string | null;
  created_at: string;
}

/** Parsed tags helper. */
export function parseTags(tagsStr: string | null): string[] {
  if (!tagsStr) return [];
  try {
    const parsed = JSON.parse(tagsStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Handle Postgres text[] format: {tag1,tag2}
    if (tagsStr.startsWith('{') && tagsStr.endsWith('}')) {
      return tagsStr.slice(1, -1).split(',').filter(Boolean);
    }
    return [];
  }
}
