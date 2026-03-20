import { AlertCircle } from 'lucide-react'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export interface ErrorAlertProps {
  message: string | null | undefined
  className?: string
  onRetry?: () => void
}

/**
 * Reusable error display using the Alert primitive.
 * Renders nothing when `message` is falsy.
 */
export function ErrorAlert({ message, className, onRetry }: ErrorAlertProps) {
  if (!message) return null

  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        {onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
