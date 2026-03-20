import { useSyncStatus } from '@/hooks/use-sync-status'

/**
 * Small dot indicator showing PowerSync connection state.
 * Green = online, amber = offline.
 */
export function ConnectionIndicator() {
  const { isOnline } = useSyncStatus()

  return (
    <div className="flex items-center gap-1.5" aria-label={isOnline ? 'Online' : 'Offline'}>
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          isOnline
            ? 'bg-green-500'
            : 'bg-amber-500 animate-pulse'
        }`}
      />
      <span className="text-xs text-muted-foreground">
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  )
}
