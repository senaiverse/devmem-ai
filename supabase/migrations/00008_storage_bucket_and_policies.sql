-- 00008_storage_bucket_and_policies.sql
-- Creates the doc-uploads private Storage bucket and RLS policies.
-- Supabase Storage always enforces RLS on storage.objects, so explicit
-- policies are required for the client (anon key) to upload/read/delete.

INSERT INTO storage.buckets (id, name, public)
VALUES ('doc-uploads', 'doc-uploads', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow all uploads to doc-uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'doc-uploads');

CREATE POLICY "Allow all reads from doc-uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'doc-uploads');

CREATE POLICY "Allow all deletes from doc-uploads"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'doc-uploads');
