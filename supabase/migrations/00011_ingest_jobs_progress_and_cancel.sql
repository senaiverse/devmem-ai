-- 00011_ingest_jobs_progress_and_cancel.sql
-- Adds progress tracking column and expands status to support cancellation workflow.

-- Progress: 0-100 integer for real-time progress reporting via PowerSync.
ALTER TABLE ingest_jobs ADD COLUMN IF NOT EXISTS progress integer NOT NULL DEFAULT 0;

-- Expand valid statuses: add 'cancelling' (client-requested) and 'cancelled' (confirmed).
ALTER TABLE ingest_jobs DROP CONSTRAINT IF EXISTS ingest_jobs_status_check;
ALTER TABLE ingest_jobs ADD CONSTRAINT ingest_jobs_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelling', 'cancelled'));
