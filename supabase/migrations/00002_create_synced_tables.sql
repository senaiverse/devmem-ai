-- 00002_create_synced_tables.sql
-- Tables that are synced to the client via PowerSync.
-- These represent the core domain entities: projects, lessons, and questions.

-- projects: top-level grouping entity
CREATE TABLE IF NOT EXISTS projects (
    id          uuid        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name        text        NOT NULL,
    slug        text        NOT NULL UNIQUE,
    description text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- lessons: captured knowledge items linked to a project
CREATE TABLE IF NOT EXISTS lessons (
    id              uuid        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    project_id      uuid        NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    title           text        NOT NULL,
    problem         text,
    root_cause      text,
    solution        text,
    recommendation  text,
    tags            text[]      DEFAULT '{}',
    source_type     text,
    source_ref      text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- questions: user questions and AI-generated answers linked to a project
CREATE TABLE IF NOT EXISTS questions (
    id          uuid        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    project_id  uuid        NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    question    text        NOT NULL,
    answer      text,
    sources     jsonb       DEFAULT '[]',
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes on foreign keys to speed up cascading deletes and filtered queries
CREATE INDEX IF NOT EXISTS idx_lessons_project_id   ON lessons (project_id);
CREATE INDEX IF NOT EXISTS idx_questions_project_id ON questions (project_id);
