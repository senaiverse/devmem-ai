import type { Lesson } from '@/types/lesson'
import { parseTags } from '@/types/lesson'

/**
 * Converts lessons to a Markdown string suitable for download.
 */
export function exportLessonsAsMarkdown(lessons: Lesson[], projectName: string): string {
  const lines: string[] = [
    `# ${projectName} — Lessons Learned`,
    '',
    `> Exported on ${new Date().toLocaleDateString()}`,
    '',
    `---`,
    '',
  ]

  for (const lesson of lessons) {
    lines.push(`## ${lesson.title}`)
    lines.push('')
    if (lesson.problem) {
      lines.push(`**Problem:** ${lesson.problem}`)
      lines.push('')
    }
    if (lesson.root_cause) {
      lines.push(`**Root Cause:** ${lesson.root_cause}`)
      lines.push('')
    }
    if (lesson.solution) {
      lines.push(`**Solution:** ${lesson.solution}`)
      lines.push('')
    }
    if (lesson.recommendation) {
      lines.push(`**Recommendation:** ${lesson.recommendation}`)
      lines.push('')
    }
    const tags = parseTags(lesson.tags)
    if (tags.length > 0) {
      lines.push(`**Tags:** ${tags.map((t) => `\`${t}\``).join(', ')}`)
      lines.push('')
    }
    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Converts lessons to a JSON string suitable for download.
 */
export function exportLessonsAsJson(lessons: Lesson[], projectName: string): string {
  const payload = {
    project: projectName,
    exported_at: new Date().toISOString(),
    lesson_count: lessons.length,
    lessons: lessons.map((l) => ({
      id: l.id,
      title: l.title,
      problem: l.problem,
      root_cause: l.root_cause,
      solution: l.solution,
      recommendation: l.recommendation,
      tags: parseTags(l.tags),
      source_type: l.source_type,
      created_at: l.created_at,
    })),
  }

  return JSON.stringify(payload, null, 2)
}

/**
 * Triggers a browser file download from a string.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
