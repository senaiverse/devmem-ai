-- Migration: period_summaries
-- Caches timeline summaries to avoid redundant Gemini calls.
-- Server-only table — NOT added to PowerSync publication.

CREATE TABLE period_summaries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_date    timestamptz NOT NULL,
  to_date      timestamptz NOT NULL,
  summary      text NOT NULL,
  themes       jsonb NOT NULL DEFAULT '{}',
  follow_up    text,
  focus_areas  jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, from_date, to_date)
);

CREATE INDEX idx_period_summaries_lookup
  ON period_summaries(project_id, from_date, to_date);
