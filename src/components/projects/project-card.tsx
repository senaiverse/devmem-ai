import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Project } from '@/types/project'

interface ProjectCardProps {
  project: Project
}

/**
 * Card displaying a single project summary.
 * Clicking navigates to the project detail page.
 */
export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link to={`/projects/${project.id}`} className="block">
      <Card className="transition-colors hover:bg-accent/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{project.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {project.description || 'No description'}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {new Date(project.created_at).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
