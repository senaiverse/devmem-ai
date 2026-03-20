-- 00001_enable_extensions.sql
-- Enable required Postgres extensions for UUID generation and vector similarity search.
-- These are installed into the 'extensions' schema, which is the Supabase convention.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA extensions;
