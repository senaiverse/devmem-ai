-- 00005_powersync_publication.sql
-- Configure logical replication for PowerSync.
-- The publication tells Postgres which tables to stream via WAL.
-- REPLICA IDENTITY FULL is required so that PowerSync receives complete row data on updates and deletes.

CREATE PUBLICATION powersync FOR TABLE projects, lessons, questions;

ALTER TABLE projects  REPLICA IDENTITY FULL;
ALTER TABLE lessons   REPLICA IDENTITY FULL;
ALTER TABLE questions REPLICA IDENTITY FULL;
