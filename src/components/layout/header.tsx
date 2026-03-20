import { useStatus } from '@powersync/react'
import { Badge } from '@/components/ui/badge'

/**
 * Top header bar showing sync status.
 */
export function Header() {
  const status = useStatus()

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="md:hidden text-lg font-semibold">
        DEV-MEMORY-LEDGER
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <Badge variant={status.connected ? 'default' : 'secondary'} className="text-xs">
          {status.connected ? 'Online' : 'Offline'}
        </Badge>
        {!status.hasSynced && (
          <Badge variant="outline" className="text-xs">
            Syncing...
          </Badge>
        )}
      </div>
    </header>
  )
}
