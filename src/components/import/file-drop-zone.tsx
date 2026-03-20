import { useCallback, useRef, useState } from 'react'
import { CloudUpload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

/** Maximum allowed file size in bytes (2 MB). */
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void
  accept?: string
  disabled?: boolean
}

/**
 * Filters out oversized files, showing a toast for each rejected file.
 * Returns only files within the size limit.
 */
function filterBySize(files: File[]): File[] {
  const valid: File[] = []
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`"${file.name}" exceeds 2MB limit`)
    } else {
      valid.push(file)
    }
  }
  return valid
}

/**
 * Drag-and-drop zone for selecting files to import.
 * Validates file size (max 2MB) before passing to parent.
 */
export function FileDropZone({
  onFilesSelected,
  accept = '.md,.txt,.mdx',
  disabled = false,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (disabled) return

      const valid = filterBySize(Array.from(e.dataTransfer.files))
      if (valid.length > 0) onFilesSelected(valid)
    },
    [disabled, onFilesSelected]
  )

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const valid = filterBySize(Array.from(e.target.files ?? []))
    if (valid.length > 0) onFilesSelected(valid)
    e.target.value = ''
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors',
        isDragging && 'border-primary bg-accent/50',
        disabled && 'pointer-events-none opacity-50'
      )}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <CloudUpload className="mb-3 h-8 w-8 text-muted-foreground/50" />
      <p className="mb-2 text-sm font-medium">
        {isDragging ? 'Drop files here' : 'Drag & drop files here'}
      </p>
      <p className="mb-4 text-xs text-muted-foreground">
        Supports .md, .txt, .mdx files (max 2MB each)
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        Browse Files
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
