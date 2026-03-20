import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  exportLessonsAsMarkdown,
  exportLessonsAsJson,
  downloadFile,
} from '@/services/export.service'
import type { Lesson } from '@/types/lesson'

interface ExportLessonsButtonProps {
  lessons: Lesson[]
  projectName: string
}

/**
 * Dropdown button for exporting lessons as Markdown or JSON.
 */
export function ExportLessonsButton({ lessons, projectName }: ExportLessonsButtonProps) {
  function handleMarkdown() {
    const content = exportLessonsAsMarkdown(lessons, projectName)
    const slug = projectName.toLowerCase().replace(/\s+/g, '-')
    downloadFile(content, `${slug}-lessons.md`, 'text/markdown')
  }

  function handleJson() {
    const content = exportLessonsAsJson(lessons, projectName)
    const slug = projectName.toLowerCase().replace(/\s+/g, '-')
    downloadFile(content, `${slug}-lessons.json`, 'application/json')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={lessons.length === 0}>
          <Download className="mr-1 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleMarkdown}>Export as Markdown</DropdownMenuItem>
        <DropdownMenuItem onClick={handleJson}>Export as JSON</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
