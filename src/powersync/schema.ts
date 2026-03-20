import { column, Schema, Table } from '@powersync/web';

/**
 * PowerSync client-side schema.
 * Maps to the synced Postgres tables: projects, lessons, questions.
 * DO NOT define 'id' — PowerSync creates it automatically as TEXT PRIMARY KEY.
 */
const projects = new Table({
  name: column.text,
  slug: column.text,
  description: column.text,
  created_at: column.text,
});

const lessons = new Table(
  {
    project_id: column.text,
    title: column.text,
    problem: column.text,
    root_cause: column.text,
    solution: column.text,
    recommendation: column.text,
    tags: column.text,
    source_type: column.text,
    source_ref: column.text,
    created_at: column.text,
    risk_level: column.text,
    antipattern_name: column.text,
    antipattern_reason: column.text,
  },
  { indexes: { project: ['project_id'] } }
);

const questions = new Table(
  {
    project_id: column.text,
    question: column.text,
    answer: column.text,
    sources: column.text,
    created_at: column.text,
  },
  { indexes: { project: ['project_id'] } }
);

const ingest_jobs = new Table(
  {
    project_id: column.text,
    storage_path: column.text,
    file_name: column.text,
    category: column.text,
    status: column.text,
    error: column.text,
    document_id: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { project: ['project_id'], status: ['status'] } }
);

export const appSchema = new Schema({ projects, lessons, questions, ingest_jobs });

/** Derive TypeScript row types directly from the schema. */
export type Database = (typeof appSchema)['types'];
export type ProjectRow = Database['projects'];
export type LessonRow = Database['lessons'];
export type QuestionRow = Database['questions'];
export type IngestJobRow = Database['ingest_jobs'];
