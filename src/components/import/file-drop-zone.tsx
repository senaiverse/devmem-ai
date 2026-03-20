import { useCallback, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void
  accept?: string
  disabled?: boolean
}

/**
 * Drag-and-drop zone for selecting files to import.
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

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) onFilesSelected(files)
    },
    [disabled, onFilesSelected]
  )

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) onFilesSelected(files)
    e.target.value = ''
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors',
        isDragging && 'border-primary bg-accent/50',
        disabled && 'opacity-50 pointer-events-none'
      )}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <p className="mb-2 text-sm font-medium">
        {isDragging ? 'Drop files here' : 'Drag & drop files here'}
      </p>
      <p className="mb-4 text-xs text-muted-foreground">
        Supports .md, .txt, .mdx files
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
