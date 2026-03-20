/**
 * delete-document Edge Function
 *
 * Deletes a document along with its cascaded chunks, any lessons that
 * reference it (lesson_embeddings cascade automatically), and the
 * original file in Storage if a `storage_path` is present.
 *
 * Request body: `{ document_id: string }`
 */
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase-client.ts';

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { document_id } = await req.json();

    if (!document_id) {
      return errorResponse('Missing required field: document_id');
    }

    const supabase = createAdminClient();

    // 1. Fetch the document to verify it exists and get its storage_path
    const { data: doc, error: fetchError } = await supabase
      .from('documents')
      .select('id, storage_path')
      .eq('id', document_id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!doc) {
      return errorResponse(`Document ${document_id} not found`, 404);
    }

    // 2. Delete lessons that reference this document (lesson_embeddings cascade)
    const { error: lessonDeleteError } = await supabase
      .from('lessons')
      .delete()
      .eq('source_type', 'document')
      .eq('source_ref', document_id);

    if (lessonDeleteError) throw lessonDeleteError;

    // 3. Delete the document row (document_chunks cascade automatically)
    const { error: docDeleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', document_id);

    if (docDeleteError) throw docDeleteError;

    // 4. Remove the file from Storage if a storage_path is present
    if (doc.storage_path) {
      await supabase.storage.from('doc-uploads').remove([doc.storage_path]);
    }

    return jsonResponse({ success: true, document_id });
  } catch (error) {
    console.error('delete-document error:', error);
    return errorResponse(`Failed to delete document: ${(error as Error).message}`, 500);
  }
});
