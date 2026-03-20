import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { PowerSyncProvider } from '@/powersync/provider'
import { AppShell } from '@/components/layout/app-shell'
import { ProjectsPage } from '@/routes/projects'
import { ProjectDetailPage } from '@/routes/project-detail'
import { AskPage } from '@/routes/ask'
import { ImportPage } from '@/routes/import'

/**
 * Root application component.
 * Wraps everything in PowerSync provider for local-first data access.
 */
export function App() {
  return (
    <PowerSyncProvider>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/projects/:id/ask" element={<AskPage />} />
            <Route path="/projects/:id/import" element={<ImportPage />} />
          </Routes>
        </AppShell>
        <Toaster />
      </BrowserRouter>
    </PowerSyncProvider>
  )
}
