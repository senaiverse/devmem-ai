import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useQuery } from '@powersync/react'
import { MoreHorizontal, FileUp, BookOpen, Trash2 } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { StatsCards } from '@/components/projects/stats-cards'
import { LessonsTabContent } from '@/components/lessons/lessons-tab-content'
import { AntiPatternsTabContent } from '@/components/antipatterns/antipatterns-tab-content'
import { TimelineTabContent } from '@/components/timeline/timeline-tab-content'
import { ProjectHeaderEdit } from '@/components/projects/project-header-edit'
import { OfflineBanner } from '@/components/projects/offline-banner'
import { useLessons } from '@/hooks/use-lessons'
import { useProjects } from '@/hooks/use-projects'
import { useAntipatterns } from '@/hooks/use-antipatterns'
import { useSyncStatus } from '@/hooks/use-sync-status'
import type { Project } from '@/types/project'

/**
 * /projects/:id — Project detail with tabbed views for
 * Lessons, Antipatterns, and Timeline.
 */
export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { updateProject, deleteProject } = useProjects()
  const { isOnline } = useSyncStatus()

  const { data: projectRows, isLoading: isLoadingProject } = useQuery<Project>(
    'SELECT * FROM projects WHERE id = ? LIMIT 1',
    [id!]
  )
  const project = projectRows[0] ?? null

  const [isDeleting, setIsDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const { lessons, allTags, isLoading, createLesson, updateLesson, deleteLesson } =
    useLessons(id!, searchTerm, filterTag)

  const { count: antipatternCount } = useAntipatterns(id!)

  async function handleDelete() {
    if (!id) return
    setIsDeleting(true)
    try {
      await deleteProject(id)
      toast.success('Project deleted')
      navigate('/projects')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete project')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoadingProject) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <p className="text-lg font-medium">Project not found</p>
        <p className="text-sm text-muted-foreground">
          This project may have been deleted or the URL is invalid.
        </p>
        <Link to="/projects" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Back to Projects
        </Link>
      </div>
    )
  }

  return (
    <div className="animate-page-enter mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <ProjectHeaderEdit
            name={project.name}
            description={project.description}
            onSave={(name, slug, description) =>
              updateProject(id!, { name, slug, description })
            }
          />
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger
                render={
                  <DropdownMenuTrigger
                    render={
                      <Button variant="outline" size="sm">
                        <BookOpen className="mr-1.5 h-4 w-4" /> Docs
                      </Button>
                    }
                  />
                }
              />
              <TooltipContent>Import documents or browse knowledge base</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link to={`/projects/${id}/import`} />}>
                <FileUp className="h-4 w-4" /> Import Documents
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link to={`/projects/${id}/knowledge`} />}>
                <BookOpen className="h-4 w-4" /> Knowledge Base
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link to={`/projects/${id}/ask`} className={buttonVariants({ size: 'sm' })}>
            Ask
          </Link>
          <AlertDialog>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <DropdownMenuTrigger
                      render={
                        <Button variant="outline" size="icon" aria-label="More actions">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      }
                    />
                  }
                />
                <TooltipContent>More actions</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                <AlertDialogTrigger
                  render={
                    <DropdownMenuItem variant="destructive">
                      <Trash2 className="h-4 w-4" /> Delete Project
                    </DropdownMenuItem>
                  }
                />
              </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Project</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete &ldquo;{project.name}&rdquo; and all its lessons, embeddings, and history. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <OfflineBanner isOnline={isOnline} />

      <StatsCards projectId={id!} />

      <Separator />

      <Tabs defaultValue="lessons">
        <TabsList>
          <TabsTrigger value="lessons">Lessons ({lessons.length})</TabsTrigger>
          <TabsTrigger value="antipatterns">Antipatterns ({antipatternCount})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="lessons">
          <LessonsTabContent
            lessons={lessons}
            allTags={allTags}
            isLoading={isLoading}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterTag={filterTag}
            onFilterTagChange={setFilterTag}
            projectName={project.name}
            onCreateLesson={createLesson}
            onUpdateLesson={updateLesson}
            onDeleteLesson={deleteLesson}
          />
        </TabsContent>

        <TabsContent value="antipatterns">
          <AntiPatternsTabContent
            projectId={id!}
            projectName={project.name}
            onUpdateLesson={updateLesson}
            onDeleteLesson={deleteLesson}
          />
        </TabsContent>

        <TabsContent value="timeline">
          <TimelineTabContent projectId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
