import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { PowerSyncProvider } from '@/powersync/provider'
import { ErrorBoundary } from '@/components/shared/error-boundary'
import { AppShell } from '@/components/layout/app-shell'
import { ProjectsPage } from '@/routes/projects'
import { ProjectDetailPage } from '@/routes/project-detail'
import { AskPage } from '@/routes/ask'
import { ImportPage } from '@/routes/import'
import { KnowledgePage } from '@/routes/knowledge'

/**
 * Root application component.
 * Wraps everything in ThemeProvider (dark/light/system), PowerSync provider,
 * and a global TooltipProvider (300ms delay to prevent accidental triggers).
 */
export function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PowerSyncProvider>
        <TooltipProvider delay={300}>
          <BrowserRouter>
            <AppShell>
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Navigate to="/projects" replace />} />
                  <Route path="/projects" element={<ProjectsPage />} />
                  <Route path="/projects/:id" element={<ProjectDetailPage />} />
                  <Route path="/projects/:id/ask" element={<AskPage />} />
                  <Route path="/projects/:id/import" element={<ImportPage />} />
                  <Route path="/projects/:id/knowledge" element={<KnowledgePage />} />
                  <Route path="*" element={<Navigate to="/projects" replace />} />
                </Routes>
              </ErrorBoundary>
            </AppShell>
            <Toaster />
          </BrowserRouter>
        </TooltipProvider>
      </PowerSyncProvider>
    </ThemeProvider>
  )
}
