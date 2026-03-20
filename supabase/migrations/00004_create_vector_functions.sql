-- 00004_create_vector_functions.sql
-- RPC functions for vector similarity search used by the RAG pipeline.
-- Both functions use cosine distance (<=> operator) and accept an optional project filter.

/**
 * match_document_chunks
 *
 * Returns document chunks whose embeddings are closest to the supplied query vector.
 * Results are filtered by a minimum similarity threshold and optionally scoped to a project.
 */
CREATE OR REPLACE FUNCTION match_document_chunks(
    query_embedding     extensions.vector(384),
    match_threshold     float   DEFAULT 0.5,
    match_count         int     DEFAULT 10,
    filter_project_id   uuid    DEFAULT NULL
)
RETURNS TABLE (
    id          uuid,
    document_id uuid,
    content     text,
    similarity  float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        dc.content,
        1 - (dc.embedding <=> query_embedding)::float AS similarity
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    WHERE
        dc.embedding IS NOT NULL
        AND 1 - (dc.embedding <=> query_embedding) >= match_threshold
        AND (filter_project_id IS NULL OR d.project_id = filter_project_id)
    ORDER BY dc.embedding <=> query_embedding ASC
    LIMIT match_count;
END;
$$;

/**
 * match_lesson_embeddings
 *
 * Returns lesson embeddings closest to the supplied query vector.
 * Results are filtered by a minimum similarity threshold and optionally scoped to a project.
 */
CREATE OR REPLACE FUNCTION match_lesson_embeddings(
    query_embedding     extensions.vector(384),
    match_threshold     float   DEFAULT 0.5,
    match_count         int     DEFAULT 10,
    filter_project_id   uuid    DEFAULT NULL
)
RETURNS TABLE (
    id          uuid,
    lesson_id   uuid,
    similarity  float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        le.id,
        le.lesson_id,
        1 - (le.embedding <=> query_embedding)::float AS similarity
    FROM lesson_embeddings le
    JOIN lessons l ON l.id = le.lesson_id
    WHERE
        le.embedding IS NOT NULL
        AND 1 - (le.embedding <=> query_embedding) >= match_threshold
        AND (filter_project_id IS NULL OR l.project_id = filter_project_id)
    ORDER BY le.embedding <=> query_embedding ASC
    LIMIT match_count;
END;
$$;
