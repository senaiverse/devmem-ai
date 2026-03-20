import { WifiOff } from 'lucide-react'

interface OfflineBannerProps {
  isOnline: boolean
  isPinned: boolean
}

/**
 * Contextual banner shown when the user is offline.
 * Message varies based on whether the project is pinned to the briefcase.
 * Hidden when online.
 */
export function OfflineBanner({ isOnline, isPinned }: OfflineBannerProps) {
  if (isOnline) return null

  return (
    <div
      className={`flex items-center gap-2 rounded-md border p-3 text-sm ${
        isPinned
          ? 'border-info/50 bg-info/10 text-info'
          : 'border-warning/50 bg-warning/10 text-warning'
      }`}
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      {isPinned
        ? "You're offline. This project's memory is available from your local briefcase."
        : "You're offline. Some data may be missing — pin this project while online next time."}
    </div>
  )
}
