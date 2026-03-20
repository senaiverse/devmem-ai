import { useTheme } from 'next-themes'
import { useSyncStatus } from '@/hooks/use-sync-status'
import { Sun, Moon, Brain } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { MobileSidebar } from '@/components/layout/mobile-sidebar'
import { cn } from '@/lib/utils'

/**
 * Top header bar showing sync status and theme toggle.
 */
export function Header() {
  const { isOnline, status } = useSyncStatus()
  const { theme, setTheme } = useTheme()

  /** Cycles through: light → dark → system → light. */
  function toggleTheme() {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-2 md:hidden">
        <MobileSidebar />
        <Brain className="h-5 w-5 text-primary" />
        <span className="text-lg font-semibold">DevMem AI</span>
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              />
            }
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </TooltipTrigger>
          <TooltipContent>Toggle theme (light / dark / system)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger>
            <Badge
              variant="outline"
              className={cn(
                'gap-1.5 text-xs',
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
        {!status.hasSynced && isOnline && (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="text-xs">
                Syncing...
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Initial sync in progress</TooltipContent>
          </Tooltip>
        )}
      </div>
    </header>
  )
}
