import { Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BriefcaseToggleProps {
  isPinned: boolean
  onToggle: () => void
}

/**
 * Toggle button for pinning a project to the Offline Briefcase.
 * Pinned projects show offline-ready banners when disconnected.
 */
export function BriefcaseToggle({ isPinned, onToggle }: BriefcaseToggleProps) {
  return (
    <Button
      variant={isPinned ? 'default' : 'ghost'}
      size="sm"
      onClick={onToggle}
      title={isPinned ? 'Pinned for offline use' : 'Pin for offline use'}
      aria-label={isPinned ? 'Unpin from offline briefcase' : 'Pin to offline briefcase'}
    >
      <Briefcase className="mr-1 h-4 w-4" />
      {isPinned ? 'Briefcase' : 'Pin Offline'}
    </Button>
  )
}
