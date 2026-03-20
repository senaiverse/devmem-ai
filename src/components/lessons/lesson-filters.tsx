import { useState } from 'react'
import { Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { groupTags } from '@/lib/tag-groups'

interface LessonFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  filterTag: string
  onFilterTagChange: (tag: string) => void
  allTags: string[]
}

/**
 * Search input and collapsible grouped tag filter bar for lessons.
 * Tags are grouped into theme categories (Architecture, Testing, etc.).
 * Collapsed by default — shows active filter badge + expand button.
 */
export function LessonFilters({
  searchTerm,
  onSearchChange,
  filterTag,
  onFilterTagChange,
  allTags,
}: LessonFiltersProps) {
  const [expanded, setExpanded] = useState(false)
  const groups = groupTags(allTags)

  function handleTagClick(tag: string) {
    onFilterTagChange(filterTag === tag ? '' : tag)
    setExpanded(false)
  }

  function handleClearFilter() {
    onFilterTagChange('')
    setExpanded(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search lessons..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1"
        />
        {allTags.length > 0 && (
          <Button
            variant={expanded ? 'default' : 'outline'}
            size="sm"
            onClick={() => setExpanded((prev) => !prev)}
            className="shrink-0 gap-1.5"
          >
            <Filter className="h-3.5 w-3.5" />
            Filter
          </Button>
        )}
      </div>

      {/* Active filter indicator (shown when collapsed with a filter active) */}
      {!expanded && filterTag && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Filtered by:</span>
          <Badge variant="default" className="cursor-pointer" onClick={handleClearFilter}>
            {filterTag} &times;
          </Badge>
        </div>
      )}

      {/* Expanded grouped tag picker */}
      {expanded && allTags.length > 0 && (
        <div className="space-y-2 rounded-md border bg-card p-3">
          <div className="flex items-center gap-1.5">
            <Badge
              variant={filterTag === '' ? 'default' : 'outline'}
              className={cn('cursor-pointer', filterTag === '' && 'pointer-events-none')}
              onClick={handleClearFilter}
            >
              All
            </Badge>
            {filterTag && (
              <span className="text-xs text-muted-foreground">
                Active: <strong>{filterTag}</strong>
              </span>
            )}
          </div>

          {groups.map((group) => (
            <div key={group.key}>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-1">
                {group.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={filterTag === tag ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => handleTagClick(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
