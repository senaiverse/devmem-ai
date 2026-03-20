/**
 * Theme Mapper — maps lesson tags to strategic themes for focus area analysis.
 *
 * Used by summarize-period to compute which themes are strong vs weak
 * based on lesson tag frequency within a time window.
 */

/** Focus areas result from theme analysis. */
export interface FocusAreas {
  strong: string[];
  weak: string[];
  counts: Record<string, number>;
}

/**
 * Maps theme names to keyword patterns. A lesson matches a theme if any of
 * its tags contain one of the theme's keywords as a substring (case-insensitive).
 */
const THEME_MAP: Record<string, string[]> = {
  'Testing': ['test', 'qa', 'jest', 'e2e', 'unit-test', 'integration-test', 'coverage', 'spec'],
  'Security': ['security', 'auth', 'policy', 'rls', 'xss', 'injection', 'cors', 'token', 'rbac'],
  'Performance': ['perf', 'latency', 'scaling', 'cache', 'optimization', 'bundle', 'memory', 'speed'],
  'Developer Experience': ['dx', 'tooling', 'lint', 'devex', 'ci', 'cd', 'workflow', 'automation', 'developer'],
  'Observability': ['logging', 'monitoring', 'metrics', 'tracing', 'alerting', 'error-tracking', 'observability'],
  'Architecture': ['architecture', 'design', 'pattern', 'module', 'refactor', 'migration', 'schema', 'api'],
  'Product': ['feature', 'user', 'product', 'ux', 'ui', 'a11y', 'i18n', 'onboarding'],
};

/**
 * Computes focus areas (strong/weak themes) from a set of lessons.
 *
 * Logic:
 * 1. Count how many lessons map to each theme via tag substring matching
 * 2. Compute the mean count across themes that have at least 1 match
 * 3. Strong = themes with count >= mean; Weak = themes with 0 < count < mean
 */
export function computeFocusAreas(
  lessons: { tags: string[] | string | null }[],
): FocusAreas {
  const counts: Record<string, number> = {};

  for (const theme of Object.keys(THEME_MAP)) {
    counts[theme] = 0;
  }

  for (const lesson of lessons) {
    const tags = normalizeTags(lesson.tags);
    if (tags.length === 0) continue;

    const lowerTags = tags.map((t) => t.toLowerCase());

    for (const [theme, keywords] of Object.entries(THEME_MAP)) {
      const matches = lowerTags.some((tag) =>
        keywords.some((kw) => tag.includes(kw)),
      );
      if (matches) {
        counts[theme]++;
      }
    }
  }

  // Compute mean across non-zero themes
  const nonZeroCounts = Object.values(counts).filter((c) => c > 0);
  if (nonZeroCounts.length === 0) {
    return { strong: [], weak: [], counts };
  }

  const mean = nonZeroCounts.reduce((a, b) => a + b, 0) / nonZeroCounts.length;

  const strong: string[] = [];
  const weak: string[] = [];

  for (const [theme, count] of Object.entries(counts)) {
    if (count >= mean) {
      strong.push(theme);
    } else if (count > 0) {
      weak.push(theme);
    }
  }

  // Sort by count descending for consistent output
  strong.sort((a, b) => counts[b] - counts[a]);
  weak.sort((a, b) => counts[b] - counts[a]);

  return { strong, weak, counts };
}

/**
 * Normalizes tags from various formats (Postgres text[], JSON string, null)
 * into a plain string array.
 */
function normalizeTags(tags: string[] | string | null): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  // Handle JSON-encoded arrays (e.g. from PowerSync or serialized data)
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
