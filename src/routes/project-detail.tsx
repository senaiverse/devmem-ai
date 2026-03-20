import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@powersync/react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { StatsCards } from '@/components/projects/stats-cards'
import { LessonList } from '@/components/lessons/lesson-list'
import { CreateLessonDialog } from '@/components/lessons/create-lesson-dialog'
import { ExportLessonsButton } from '@/components/lessons/export-lessons-button'
import { useLessons } from '@/hooks/use-lessons'
import { useProjects } from '@/hooks/use-projects'
import type { Project } from '@/types/project'

/**
 * /projects/:id — Project detail showing stats, lessons with filters,
 * manual lesson creation, export, and links to sub-pages.
 */
export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { deleteProject } = useProjects()

  const { data: projectRows } = useQuery<Project>(
    'SELECT * FROM projects WHERE id = ? LIMIT 1',
    [id!]
  )
  const project = projectRows[0] ?? null

  const [searchTerm, setSearchTerm] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const { lessons, allTags, isLoading, createLesson, updateLesson, deleteLesson } =
    useLessons(id!, searchTerm, filterTag)

  async function handleDelete() {
    if (!id) return
    await deleteProject(id)
    navigate('/projects')
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <div className="flex gap-2">
            <Link to={`/projects/${id}/ask`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Ask a Question
            </Link>
            <Link to={`/projects/${id}/import`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Import Docs
            </Link>
            <Link to={`/projects/${id}/knowledge`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Knowledge Base
            </Link>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
        {project.description && (
          <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
        )}
      </div>

      <StatsCards projectId={id!} />

      <Separator />

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Lessons ({lessons.length})
          </h2>
          <div className="flex gap-2">
            <ExportLessonsButton lessons={lessons} projectName={project.name} />
            <CreateLessonDialog onCreate={createLesson} />
          </div>
        </div>
        <LessonList
          lessons={lessons}
          allTags={allTags}
          isLoading={isLoading}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterTag={filterTag}
          onFilterTagChange={setFilterTag}
          onUpdateLesson={updateLesson}
          onDeleteLesson={deleteLesson}
        />
      </div>
    </div>
  )
}
