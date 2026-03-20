import { ShieldCheck } from 'lucide-react'
import { AntipatternCard } from './antipattern-card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import type { Lesson } from '@/types/lesson'

interface AntipatternListProps {
  grouped: Record<string, Lesson[]>
  isLoading: boolean
  projectName: string
  onViewLesson: (lesson: Lesson) => void
}

const RISK_SECTIONS = [
  { key: 'high', label: 'High Risk' },
  { key: 'medium', label: 'Medium Risk' },
  { key: 'low', label: 'Low Risk' },
] as const

/**
 * Displays flagged lessons grouped by risk level.
 */
export function AntipatternList({ grouped, isLoading, projectName, onViewLesson }: AntipatternListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    )
  }

  const hasAny = Object.values(grouped).some((arr) => arr.length > 0)

  if (!hasAny) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No antipatterns detected"
        description="All lessons look clean. Run classification to scan for potential issues."
      />
    )
  }

  return (
    <div className="space-y-6">
      {RISK_SECTIONS.map(({ key, label }) => {
        const lessons = grouped[key] || []
        if (lessons.length === 0) return null
        return (
          <div key={key}>
            <h3 className="mb-3 text-sm font-semibold">
              {label} ({lessons.length})
            </h3>
            <div className="space-y-2">
              {lessons.map((lesson) => (
                <AntipatternCard
                  key={lesson.id}
                  lesson={lesson}
                  projectName={projectName}
                  onViewLesson={onViewLesson}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
