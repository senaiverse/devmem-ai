import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { generateRefactorPrompt } from '@/services/prompt-generator'
import type { Lesson } from '@/types/lesson'

interface CopyPromptButtonProps {
  lesson: Lesson
  projectName: string
  variant?: 'ghost' | 'outline'
  size?: 'icon' | 'sm'
}

/**
 * Button that copies a structured AI refactoring prompt to clipboard.
 */
export function CopyPromptButton({
  lesson,
  projectName,
  variant = 'ghost',
  size = 'icon',
}: CopyPromptButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const prompt = generateRefactorPrompt(projectName, lesson)
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    toast.success('Prompt copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant={variant} size={size} onClick={handleCopy} aria-label="Copy refactor prompt">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copy AI refactor prompt</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
