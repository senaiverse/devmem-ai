import { useSyncStatus } from '@/hooks/use-sync-status'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Badge-style connection indicator with tooltip.
 * Green = synced, amber = offline with pulse animation.
 */
export function ConnectionIndicator() {
  const { isOnline } = useSyncStatus()

  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge
          variant="outline"
          className={cn(
            'gap-1.5',
            isOnline
              ? 'border-success/50 text-success'
              : 'border-warning/50 text-warning'
          )}
        >
          <span
            className={cn(
              'inline-block h-1.5 w-1.5 rounded-full',
              isOnline ? 'bg-success' : 'bg-warning animate-pulse'
            )}
          />
          {isOnline ? 'Synced' : 'Offline'}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        {isOnline
          ? 'Connected — changes sync automatically'
          : 'Working offline — changes sync when reconnected'}
      </TooltipContent>
    </Tooltip>
  )
}
