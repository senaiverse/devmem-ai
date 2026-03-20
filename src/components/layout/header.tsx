import { useStatus } from '@powersync/react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

/**
 * Top header bar showing sync status and theme toggle.
 */
export function Header() {
  const status = useStatus()
  const { theme, setTheme } = useTheme()

  /** Cycles through: light → dark → system → light. */
  function toggleTheme() {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="md:hidden text-lg font-semibold">
        DEV-MEMORY-LEDGER
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
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
