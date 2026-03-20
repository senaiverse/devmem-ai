import { Pin, PinOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BriefcaseToggleProps {
  isPinned: boolean
  onToggle: () => void
}

/**
 * Toggle button for pinning a project to the Offline Briefcase.
 * Stable "Offline" label; icon conveys pinned/unpinned state.
 */
export function BriefcaseToggle({ isPinned, onToggle }: BriefcaseToggleProps) {
  return (
    <Button
      variant={isPinned ? 'default' : 'outline'}
      size="sm"
      onClick={onToggle}
      aria-label={isPinned ? 'Unpin from offline briefcase' : 'Pin to offline briefcase'}
    >
      {isPinned ? (
        <Pin className="mr-1 h-3.5 w-3.5" />
      ) : (
        <PinOff className="mr-1 h-3.5 w-3.5" />
      )}
      Offline
    </Button>
  )
}
