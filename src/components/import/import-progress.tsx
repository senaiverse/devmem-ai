import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export interface FileStatus {
  name: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  chunkCount?: number
  lessonsCreated?: number
  error?: string
}

interface ImportProgressProps {
  files: FileStatus[]
}

/**
 * Displays upload/ingest progress per file.
 */
export function ImportProgress({ files }: ImportProgressProps) {
  if (files.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Import Progress</h3>
      {files.map((file) => (
        <Card key={file.name}>
          <CardContent className="flex items-center justify-between p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              {file.status === 'success' && (
                <p className="text-xs text-muted-foreground">
                  {file.chunkCount} chunks, {file.lessonsCreated} lessons generated
                </p>
              )}
              {file.status === 'error' && (
                <p className="text-xs text-destructive">{file.error}</p>
              )}
            </div>
            <StatusBadge status={file.status} />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function StatusBadge({ status }: { status: FileStatus['status'] }) {
  const variants: Record<FileStatus['status'], 'default' | 'secondary' | 'outline' | 'destructive'> = {
    pending: 'outline',
    uploading: 'secondary',
    success: 'default',
    error: 'destructive',
  }

  const labels: Record<FileStatus['status'], string> = {
    pending: 'Pending',
    uploading: 'Uploading...',
    success: 'Done',
    error: 'Failed',
  }

  return (
    <Badge variant={variants[status]} className="ml-2 text-xs">
      {labels[status]}
    </Badge>
  )
}
