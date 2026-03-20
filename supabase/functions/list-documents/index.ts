/**
 * list-documents Edge Function
 *
 * Returns document summaries with chunk counts for a given project.
 * Results are ordered by creation date, newest first.
 *
 * Request body: `{ project_id: string }`
 */
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase-client.ts';

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { project_id } = await req.json();

    if (!project_id) {
      return errorResponse('Missing required field: project_id');
    }

    const supabase = createAdminClient();

    // 1. Query documents with aggregated chunk count
    const { data: documents, error: queryError } = await supabase
      .from('documents')
      .select('id, project_id, path, title, category, created_at, updated_at, document_chunks(count)')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false });

    if (queryError) throw queryError;

    // 2. Flatten the chunk count and remove the nested document_chunks key
    const mapped = (documents || []).map((doc: Record<string, unknown>) => {
      const chunks = doc.document_chunks as Array<{ count: number }> | undefined;
      const chunkCount = chunks?.[0]?.count ?? 0;

      const { document_chunks: _, ...rest } = doc;
      return { ...rest, chunk_count: chunkCount };
    });

    return jsonResponse({ documents: mapped });
  } catch (error) {
    console.error('list-documents error:', error);
    return errorResponse(`Failed to list documents: ${(error as Error).message}`, 500);
  }
});
