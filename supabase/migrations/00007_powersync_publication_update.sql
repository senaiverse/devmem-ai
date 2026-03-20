-- 00007_powersync_publication_update.sql
-- Adds ingest_jobs to the PowerSync logical replication publication.
ALTER PUBLICATION powersync ADD TABLE ingest_jobs;
