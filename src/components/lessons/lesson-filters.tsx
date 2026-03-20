import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface LessonFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  filterTag: string
  onFilterTagChange: (tag: string) => void
  allTags: string[]
}

/**
 * Search input and tag filter bar for lessons.
 */
export function LessonFilters({
  searchTerm,
  onSearchChange,
  filterTag,
  onFilterTagChange,
  allTags,
}: LessonFiltersProps) {
  return (
    <div className="space-y-3">
      <Input
        placeholder="Search lessons..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <Badge
            variant={filterTag === '' ? 'default' : 'outline'}
            className={cn('cursor-pointer', filterTag === '' && 'pointer-events-none')}
            onClick={() => onFilterTagChange('')}
          >
            All
          </Badge>
          {allTags.map((tag) => (
            <Badge
              key={tag}
              variant={filterTag === tag ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => onFilterTagChange(filterTag === tag ? '' : tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
