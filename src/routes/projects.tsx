import { useProjects } from '@/hooks/use-projects'
import { ProjectList } from '@/components/projects/project-list'

/**
 * /projects — Projects listing page.
 */
export function ProjectsPage() {
  const { projects, isLoading, createProject } = useProjects()

  return (
    <ProjectList
      projects={projects}
      isLoading={isLoading}
      onCreateProject={createProject}
    />
  )
}
