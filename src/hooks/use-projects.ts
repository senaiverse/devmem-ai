import { useQuery, usePowerSync } from '@powersync/react'
import { v4 as uuidv4 } from 'uuid'
import type { Project } from '@/types/project'

/**
 * Hook for CRUD operations on projects via PowerSync local DB.
 * Reads are instant (local SQLite), writes sync upstream automatically.
 */
export function useProjects() {
  const db = usePowerSync()
  const { data: projects, isLoading } = useQuery<Project>(
    'SELECT * FROM projects ORDER BY created_at DESC'
  )

  async function createProject(name: string, slug: string, description?: string) {
    const id = uuidv4()
    await db.execute(
      'INSERT INTO projects (id, name, slug, description, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, name, slug, description ?? null, new Date().toISOString()]
    )
    return id
  }

  async function updateProject(id: string, updates: Partial<Pick<Project, 'name' | 'slug' | 'description'>>) {
    const setClauses: string[] = []
    const values: unknown[] = []

    if (updates.name !== undefined) {
      setClauses.push('name = ?')
      values.push(updates.name)
    }
    if (updates.slug !== undefined) {
      setClauses.push('slug = ?')
      values.push(updates.slug)
    }
    if (updates.description !== undefined) {
      setClauses.push('description = ?')
      values.push(updates.description)
    }

    if (setClauses.length === 0) return
    values.push(id)

    await db.execute(
      `UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    )
  }

  async function deleteProject(id: string) {
    await db.execute('DELETE FROM projects WHERE id = ?', [id])
  }

  return { projects, isLoading, createProject, updateProject, deleteProject }
}
