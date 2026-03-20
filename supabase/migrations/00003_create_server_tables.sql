-- 00003_create_server_tables.sql
-- Server-only tables that are NOT synced to the client.
-- These store raw documents, chunked text, and vector embeddings for RAG retrieval.

-- documents: raw ingested documents linked to a project
CREATE TABLE IF NOT EXISTS documents (
    id          uuid        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    project_id  uuid        NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    path        text,
    title       text        NOT NULL,
    category    text,
    raw_text    text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- document_chunks: text segments with vector embeddings for similarity search
CREATE TABLE IF NOT EXISTS document_chunks (
    id            uuid                        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    document_id   uuid                        NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
    chunk_index   integer                     NOT NULL,
    content       text                        NOT NULL,
    embedding     extensions.vector(384),
    created_at    timestamptz                 NOT NULL DEFAULT now()
);

-- lesson_embeddings: vector representations of lessons for semantic search
CREATE TABLE IF NOT EXISTS lesson_embeddings (
    id          uuid                        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    lesson_id   uuid                        NOT NULL REFERENCES lessons (id) ON DELETE CASCADE,
    embedding   extensions.vector(384),
    created_at  timestamptz                 NOT NULL DEFAULT now()
);

-- Foreign-key indexes for fast joins and cascading deletes
CREATE INDEX IF NOT EXISTS idx_documents_project_id        ON documents (project_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks (document_id);
CREATE INDEX IF NOT EXISTS idx_lesson_embeddings_lesson_id ON lesson_embeddings (lesson_id);

-- HNSW vector indexes for approximate nearest-neighbour search (cosine distance)
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
    ON document_chunks
    USING hnsw (embedding extensions.vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_lesson_embeddings_embedding
    ON lesson_embeddings
    USING hnsw (embedding extensions.vector_cosine_ops);
