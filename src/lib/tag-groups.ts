/**
 * Tag-to-theme grouping for the lesson filter bar.
 * Tags are matched case-insensitively; unmatched tags fall into "Other".
 */

interface TagGroup {
  label: string
  tags: string[]
}

/** Canonical theme groups with their member tags. */
export const TAG_GROUPS: Record<string, TagGroup> = {
  architectureDesign: {
    label: 'Architecture & Design',
    tags: ['architecture', 'design', 'refactoring', 'patterns', 'modularity', 'abstraction'],
  },
  testingQuality: {
    label: 'Testing & Quality',
    tags: ['testing', 'test-coverage', 'qa', 'code-review', 'linting', 'ci-cd'],
  },
  infraSecurity: {
    label: 'Infra & Security',
    tags: ['security', 'infrastructure', 'deployment', 'devops', 'networking', 'database'],
  },
  productDX: {
    label: 'Product & DX',
    tags: ['performance', 'ux', 'dx', 'documentation', 'onboarding', 'tooling'],
  },
}

interface GroupedTags {
  key: string
  label: string
  tags: string[]
}

/**
 * Assigns each tag to its theme group (case-insensitive).
 * Unmatched tags go to "Other". Empty groups are omitted.
 * Returns only groups that contain at least one tag from `allTags`.
 */
export function groupTags(allTags: string[]): GroupedTags[] {
  const assigned = new Set<string>()
  const result: GroupedTags[] = []

  for (const [key, group] of Object.entries(TAG_GROUPS)) {
    const lowerSet = new Set(group.tags.map((t) => t.toLowerCase()))
    const matched = allTags.filter(
      (tag) => lowerSet.has(tag.toLowerCase()) && !assigned.has(tag)
    )
    matched.forEach((tag) => assigned.add(tag))
    if (matched.length > 0) {
      result.push({ key, label: group.label, tags: matched })
    }
  }

  const other = allTags.filter((tag) => !assigned.has(tag))
  if (other.length > 0) {
    result.push({ key: 'other', label: 'Other', tags: other })
  }

  return result
}
