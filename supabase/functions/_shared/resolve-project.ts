import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Resolved project identity returned by resolveProject().
 * Provides the UUID needed by all downstream queries,
 * plus name/slug for response enrichment.
 */
export interface ResolvedProject {
  id: string;
  name: string;
  slug: string;
}

/**
 * Resolves a project from either `project_id` (uuid) or `project_slug` (text).
 *
 * Resolution priority:
 * 1. If `project_id` is provided, fetch by id.
 * 2. If `project_slug` is provided (and no project_id), fetch by slug.
 * 3. If neither is provided, throws with a descriptive message.
 *
 * When both are provided, `project_id` wins silently — this keeps the
 * contract simple for agents that may populate both fields.
 *
 * @throws Error if neither field is provided or if no matching project exists.
 */
export async function resolveProject(
  supabase: SupabaseClient,
  body: { project_id?: string; project_slug?: string }
): Promise<ResolvedProject> {
  const { project_id, project_slug } = body;

  if (!project_id && !project_slug) {
    throw new Error('Either project_id or project_slug is required');
  }

  let query = supabase.from('projects').select('id, name, slug');

  if (project_id) {
    query = query.eq('id', project_id);
  } else {
    query = query.eq('slug', project_slug!);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    const identifier = project_id
      ? `project_id=${project_id}`
      : `project_slug=${project_slug}`;
    throw new Error(`Project not found: ${identifier}`);
  }

  return { id: data.id, name: data.name, slug: data.slug };
}
