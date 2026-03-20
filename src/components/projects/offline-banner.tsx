import { WifiOff } from 'lucide-react'

interface OfflineBannerProps {
  isOnline: boolean
  /** Override the default banner message. */
  message?: string
}

/**
 * Contextual banner shown when the user is offline.
 * Hidden when online.
 */
export function OfflineBanner({ isOnline, message }: OfflineBannerProps) {
  if (isOnline) return null

  const defaultMessage = "You're offline. Browsing works, but AI features need a connection."

  return (
    <div
      className="flex items-center gap-2 rounded-md border border-warning/50 bg-warning/10 p-3 text-sm text-warning"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      {message ?? defaultMessage}
    </div>
  )
}
