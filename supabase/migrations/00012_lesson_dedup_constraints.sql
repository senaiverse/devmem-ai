-- Migration: Add deduplication constraints for lessons and embeddings.
--
-- 1. UNIQUE on lessons(project_id, title) — prevents duplicate lesson titles
--    within the same project. Uses ON CONFLICT DO NOTHING in insert paths.
-- 2. UNIQUE on lesson_embeddings(lesson_id) — ensures one embedding per lesson,
--    enabling atomic upsert via ON CONFLICT DO UPDATE.

-- Before adding the UNIQUE constraint, remove any existing duplicates.
-- Keep the most recent row (highest created_at) for each (project_id, title) pair.
DELETE FROM lessons
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY project_id, title
                   ORDER BY created_at DESC
               ) AS rn
        FROM lessons
    ) ranked
    WHERE rn > 1
);

ALTER TABLE lessons
    ADD CONSTRAINT lessons_project_title_unique UNIQUE (project_id, title);

-- Before adding the UNIQUE constraint on embeddings, remove duplicates.
-- Keep the most recently inserted row for each lesson_id.
DELETE FROM lesson_embeddings
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY lesson_id
                   ORDER BY id DESC
               ) AS rn
        FROM lesson_embeddings
    ) ranked
    WHERE rn > 1
);

ALTER TABLE lesson_embeddings
    ADD CONSTRAINT lesson_embeddings_lesson_unique UNIQUE (lesson_id);
