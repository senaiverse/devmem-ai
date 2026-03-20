-- 00009_add_antipattern_columns.sql
-- Adds antipattern classification fields to the lessons table.
-- These columns are synced via PowerSync (REPLICA IDENTITY FULL covers them automatically).

ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS risk_level text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS antipattern_name text,
  ADD COLUMN IF NOT EXISTS antipattern_reason text;

-- Partial index for filtering antipatterns on the project detail page.
CREATE INDEX IF NOT EXISTS idx_lessons_risk_level
  ON lessons (project_id, risk_level) WHERE risk_level != 'none';
