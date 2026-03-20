import { cn } from '@/lib/utils'

import type { ComponentType, ReactNode } from 'react'

export interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

/**
 * Reusable empty state with optional icon, description, and CTA.
 * Designed to be composed inside cards, panels, or standalone.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('py-8 text-center', className)}>
      {Icon && <Icon className="mx-auto h-10 w-10 text-muted-foreground/40" />}
      <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
