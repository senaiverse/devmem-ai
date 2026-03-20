-- 00006_ingest_jobs_and_storage.sql
-- Adds storage_path to documents and creates the ingest_jobs queue table.

-- Track the Storage object path for each ingested document
ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_path text;

-- ingest_jobs: async processing queue for document ingestion.
-- Synced to clients via PowerSync so the UI shows real-time job status.
CREATE TABLE IF NOT EXISTS ingest_jobs (
    id           uuid        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    project_id   uuid        NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    storage_path text        NOT NULL,
    file_name    text        NOT NULL,
    category     text        NOT NULL DEFAULT 'docs',
    status       text        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error        text,
    document_id  uuid        REFERENCES documents (id) ON DELETE SET NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingest_jobs_project_id ON ingest_jobs (project_id);
CREATE INDEX IF NOT EXISTS idx_ingest_jobs_status     ON ingest_jobs (status);

-- Required for PowerSync to detect changes via logical replication
ALTER TABLE ingest_jobs REPLICA IDENTITY FULL;
