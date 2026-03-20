import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Calendar } from 'lucide-react'
import { useTimeline } from '@/hooks/use-timeline'

interface TimelineTabContentProps {
  projectId: string
}

/** Period preset for the timeline selector. */
interface PeriodPreset {
  label: string
  days: number
}

const PERIOD_PRESETS: PeriodPreset[] = [
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'This year', days: 365 },
]

/**
 * Computes ISO date string for N days ago from today.
 */
function daysAgoISO(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

/**
 * Content for the Timeline tab: period selector buttons
 * and the Gemini-generated improvement summary.
 */
export function TimelineTabContent({ projectId }: TimelineTabContentProps) {
  const { fetchSummary, result, isLoading, error } = useTimeline(projectId)
  const [activePeriod, setActivePeriod] = useState<string | null>(null)

  function handlePeriodClick(preset: PeriodPreset) {
    setActivePeriod(preset.label)
    const from = daysAgoISO(preset.days)
    const to = new Date().toISOString()
    fetchSummary(from, to)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Timeline</h2>
        <div className="flex gap-2">
          {PERIOD_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant={activePeriod === preset.label ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePeriodClick(preset)}
              disabled={isLoading}
            >
              {isLoading && activePeriod === preset.label ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="mr-1 h-4 w-4" />
              )}
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Generating summary...
        </div>
      )}

      {result && !isLoading && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{result.summary}</p>
            </CardContent>
          </Card>

          {Object.keys(result.themes).length > 0 && (
            <div className="space-y-3">
              {Object.entries(result.themes).map(([theme, items]) => (
                <Card key={theme}>
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="secondary">{theme}</Badge>
                    </div>
                    <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                      {items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {result.follow_up && (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardContent className="p-4">
                <h3 className="mb-1 text-sm font-semibold">Follow-up</h3>
                <p className="text-sm text-muted-foreground">{result.follow_up}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!result && !isLoading && !error && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Select a time period to generate an improvement summary.
        </div>
      )}
    </div>
  )
}
