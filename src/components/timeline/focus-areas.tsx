import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface FocusAreasProps {
  strong: string[]
  weak: string[]
  counts: Record<string, number>
}

/**
 * Displays a compact focus areas analysis below the timeline summary.
 * Shows which themes are strong (well-covered) vs need attention (under-represented).
 */
export function FocusAreas({ strong, weak, counts }: FocusAreasProps) {
  if (strong.length === 0 && weak.length === 0) return null

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <h3 className="text-sm font-semibold">Focus Areas</h3>

        {strong.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Strong:</span>
            {strong.map((theme) => (
              <Badge
                key={theme}
                variant="outline"
                className="border-success/50 bg-success/10 text-success"
              >
                {theme}
                <span className="ml-1 text-[10px] opacity-60">{counts[theme]}</span>
              </Badge>
            ))}
          </div>
        )}

        {weak.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Needs attention:</span>
            {weak.map((theme) => (
              <Badge
                key={theme}
                variant="outline"
                className="border-warning/50 bg-warning/10 text-warning"
              >
                {theme}
                <span className="ml-1 text-[10px] opacity-60">{counts[theme]}</span>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Balanced across themes.</p>
        )}
      </CardContent>
    </Card>
  )
}
