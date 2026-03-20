import { BookOpen, HelpCircle, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjectStats } from '@/hooks/use-project-stats'
import { useCountUp } from '@/hooks/use-count-up'

interface StatsCardsProps {
  projectId: string
}

/**
 * Row of 3 stat cards showing lesson, question, and document counts.
 */
export function StatsCards({ projectId }: StatsCardsProps) {
  const { lessonCount, questionCount, documentCount, isLoading } = useProjectStats(projectId)

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard icon={BookOpen} label="Lessons" value={lessonCount} />
      <StatCard icon={HelpCircle} label="Questions" value={questionCount} />
      <StatCard icon={FileText} label="Documents" value={documentCount} />
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
}) {
  const animatedValue = useCountUp(value)

  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-lg bg-muted p-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-2xl font-bold">{animatedValue}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}
