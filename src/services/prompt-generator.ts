import type { Lesson } from '@/types/lesson'
import { parseTags } from '@/types/lesson'

/**
 * Generates a structured refactoring prompt for AI coding tools
 * (Claude, Cursor, etc.) based on a lesson's content.
 */
export function generateRefactorPrompt(projectName: string, lesson: Lesson): string {
  const tags = parseTags(lesson.tags)
  const sections: string[] = []

  sections.push(`You are an AI coding assistant helping improve the project "${projectName}".`)
  sections.push(`We have a known issue documented as a lesson:`)
  sections.push('')
  sections.push(`## ${lesson.title}`)
  sections.push('')

  if (lesson.antipattern_name && lesson.risk_level !== 'none') {
    sections.push(`**Antipattern Detected:** ${lesson.antipattern_name} (risk: ${lesson.risk_level})`)
    if (lesson.antipattern_reason) {
      sections.push(lesson.antipattern_reason)
    }
    sections.push('')
  }

  if (lesson.problem) {
    sections.push(`**Problem:** ${lesson.problem}`)
    sections.push('')
  }

  if (lesson.root_cause) {
    sections.push(`**Root Cause:** ${lesson.root_cause}`)
    sections.push('')
  }

  if (lesson.solution) {
    sections.push(`**Existing Solution:** ${lesson.solution}`)
    sections.push('')
  }

  if (lesson.recommendation) {
    sections.push(`**Recommendation:** ${lesson.recommendation}`)
    sections.push('')
  }

  if (tags.length > 0) {
    sections.push(`**Tags:** ${tags.join(', ')}`)
    sections.push('')
  }

  sections.push(
    `**Goal:** Propose a safer, more maintainable design or refactor that addresses this issue in the context of "${projectName}". Focus on concrete steps, code-level changes, and migration strategy.`
  )

  return sections.join('\n')
}
