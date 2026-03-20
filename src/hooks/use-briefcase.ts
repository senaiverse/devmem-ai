import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'devmem:briefcase'

/**
 * Reads pinned project IDs from localStorage.
 * Returns empty array if storage is empty or malformed.
 */
function readPinnedProjects(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

/**
 * Persists pinned project IDs to localStorage.
 */
function writePinnedProjects(ids: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

/**
 * Manages the "Offline Briefcase" — a set of projects pinned for
 * guaranteed offline availability. Pinned state persists in localStorage.
 *
 * PowerSync already syncs all project data to local SQLite. Pinning is
 * a UX concept that lets users explicitly mark projects as offline-ready
 * and shows appropriate banners when offline.
 */
export function useBriefcase() {
  const [pinnedProjects, setPinnedProjects] = useState<string[]>(readPinnedProjects)

  // Sync state to localStorage on changes
  useEffect(() => {
    writePinnedProjects(pinnedProjects)
  }, [pinnedProjects])

  const isPinned = useCallback(
    (projectId: string) => pinnedProjects.includes(projectId),
    [pinnedProjects],
  )

  const togglePin = useCallback((projectId: string) => {
    setPinnedProjects((prev) => {
      if (prev.includes(projectId)) {
        return prev.filter((id) => id !== projectId)
      }
      return [...prev, projectId]
    })
  }, [])

  return { pinnedProjects, isPinned, togglePin }
}
