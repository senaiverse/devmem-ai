/** Project entity as stored in PowerSync local DB. */
export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}
