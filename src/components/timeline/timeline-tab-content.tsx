import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Calendar, Clock } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { ErrorAlert } from '@/components/shared/error-alert'
import { EmptyState } from '@/components/shared/empty-state'
import { useTimeline } from '@/hooks/use-timeline'
import { useSyncStatus } from '@/hooks/use-sync-status'
import { FocusAreas } from '@/components/timeline/focus-areas'

interface TimelineTabContentProps {
  projectId: string
}

/** Period preset for the timeline selector. */
interface PeriodPreset {
  label: string
  tooltip: string
  days: number
}

const PERIOD_PRESETS: PeriodPreset[] = [
  { label: '24h', tooltip: 'Last 24 hours', days: 1 },
  { label: '7d', tooltip: 'Last 7 days', days: 7 },
  { label: '14d', tooltip: 'Last 14 days', days: 14 },
  { label: '30d', tooltip: 'Last 30 days', days: 30 },
  { label: '90d', tooltip: 'Last 90 days', days: 90 },
  { label: '6mo', tooltip: 'Last 6 months', days: 180 },
  { label: '1yr', tooltip: 'Last 1 year', days: 365 },
]

/**
 * Computes ISO date string for N days ago, snapped to midnight UTC
 * for stable cache keys. The 24h preset is not snapped.
 */
function daysAgoISO(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  if (days > 1) {
    date.setUTCHours(0, 0, 0, 0)
  }
  return date.toISOString()
}

/**
 * Content for the Timeline tab: period selector buttons
 * and the Gemini-generated improvement summary with focus areas.
 */
export function TimelineTabContent({ projectId }: TimelineTabContentProps) {
  const { isOnline } = useSyncStatus()
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
        <div className="flex flex-wrap gap-1.5">
          {PERIOD_PRESETS.map((preset) => (
            <Tooltip key={preset.label}>
              <TooltipTrigger
                render={
                  <Button
                    variant={activePeriod === preset.label ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePeriodClick(preset)}
                    disabled={isLoading || !isOnline}
                  />
                }
              >
                {isLoading && activePeriod === preset.label ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Calendar className="mr-1 h-3 w-3" />
                )}
                {preset.label}
              </TooltipTrigger>
              <TooltipContent>
                {isOnline ? preset.tooltip : 'Requires network connection'}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      <ErrorAlert message={error} />

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Generating summary...</span>
        </div>
      )}

      {result && !isLoading && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Summary</CardTitle>
                {result.cached && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Cached
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>Loaded from cache — select a period to regenerate</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </CardHeader>
            <CardContent className="max-h-64 overflow-y-auto">
              <p className="whitespace-pre-wrap text-sm">{result.summary}</p>
            </CardContent>
          </Card>

          {result.focusAreas && (
            <FocusAreas
              strong={result.focusAreas.strong}
              weak={result.focusAreas.weak}
              counts={result.focusAreas.counts}
            />
          )}

          {Object.keys(result.themes).length > 0 && (
            <div className="space-y-3">
              {Object.entries(result.themes)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([theme, items]) => (
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
            <Card className="border-warning/50">
              <CardContent className="p-4">
                <h3 className="mb-1 text-sm font-semibold">Follow-up</h3>
                <p className="text-sm text-muted-foreground">{result.follow_up}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!result && !isLoading && !error && (
        <EmptyState
          icon={Clock}
          title="Select a time period"
          description="Choose a period above to generate an improvement summary powered by Gemini."
        />
      )}
    </div>
  )
}
