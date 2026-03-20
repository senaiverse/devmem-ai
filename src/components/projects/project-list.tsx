import { Skeleton } from '@/components/ui/skeleton'
import { ProjectCard } from './project-card'
import { ProjectFormDialog } from './project-form-dialog'
import type { Project } from '@/types/project'

interface ProjectListProps {
  projects: Project[]
  isLoading: boolean
  onCreateProject: (name: string, slug: string, description?: string) => Promise<string>
}

/**
 * Grid of project cards with a create dialog.
 */
export function ProjectList({ projects, isLoading, onCreateProject }: ProjectListProps) {
  async function handleCreate(name: string, slug: string, description?: string) {
    await onCreateProject(name, slug, description)
  }

  return (
    <div className="animate-page-enter">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <ProjectFormDialog onSubmit={handleCreate} />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-lg font-medium">No projects yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first project to start capturing lessons.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}
