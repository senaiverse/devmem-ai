import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@powersync/react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { Project } from '@/types/project'

/**
 * Sheet-based mobile navigation (visible below md breakpoint).
 * Mirrors the desktop Sidebar's project list and active-link highlighting.
 */
export function MobileSidebar() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const { data: projects } = useQuery<Project>(
    'SELECT * FROM projects ORDER BY created_at DESC'
  )

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open menu"
          />
        }
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b px-4">
          <SheetTitle>DevMem AI</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100dvh-3.5rem)]">
          <div className="p-4">
            <Link
              to="/projects"
              onClick={() => setOpen(false)}
              className={cn(
                'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                location.pathname === '/projects'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              All Projects
            </Link>
            <Separator className="my-3" />
            <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Projects
            </p>
            <nav className="space-y-1">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'block rounded-md px-3 py-2 text-sm transition-colors',
                    location.pathname.startsWith(`/projects/${project.id}`)
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <span className="truncate" title={project.name}>{project.name}</span>
                </Link>
              ))}
              {projects.length === 0 && (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  No projects yet. Create one from the Projects page.
                </p>
              )}
            </nav>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
