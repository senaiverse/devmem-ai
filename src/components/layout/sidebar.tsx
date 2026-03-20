import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@powersync/react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { Project } from '@/types/project'

/**
 * Left sidebar with project navigation.
 * Reads project list from PowerSync local DB.
 */
export function Sidebar() {
  const location = useLocation()
  const { data: projects } = useQuery<Project>(
    'SELECT * FROM projects ORDER BY created_at DESC'
  )

  return (
    <aside className="hidden w-64 flex-shrink-0 border-r bg-card md:block">
      <div className="flex h-14 items-center border-b px-4">
        <Link to="/projects" className="flex items-center gap-2 font-semibold">
          <span className="text-lg">DEV-MEMORY-LEDGER</span>
        </Link>
      </div>
      <ScrollArea className="h-[calc(100vh-3.5rem)]">
        <div className="p-4">
          <Link
            to="/projects"
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
                className={cn(
                  'block rounded-md px-3 py-2 text-sm transition-colors',
                  location.pathname.startsWith(`/projects/${project.id}`)
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {project.name}
              </Link>
            ))}
            {projects.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                No projects yet
              </p>
            )}
          </nav>
        </div>
      </ScrollArea>
    </aside>
  )
}
