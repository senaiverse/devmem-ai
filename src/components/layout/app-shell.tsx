import type { ReactNode } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'

interface AppShellProps {
  children: ReactNode
}

/**
 * Main application layout with sidebar navigation and header.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
