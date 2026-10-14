import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#eef2f6] p-0 sm:p-2 md:p-3">
      {/* Floating container with rounded corners and border matching reference */}
      <div className="flex-1 flex overflow-hidden rounded-none sm:rounded-2xl border-0 sm:border border-[#e2e8f0] bg-white shadow-xs">
        <Sidebar />
        <main className="flex-1 flex overflow-hidden min-w-0 bg-white">
          {children}
        </main>
      </div>
    </div>
  )
}
