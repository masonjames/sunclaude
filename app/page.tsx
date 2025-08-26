"use client"

import { useSession } from 'next-auth/react'
import { TaskBoardEnhanced } from '@/components/TaskBoardEnhanced'
import { IntegrationsSidebar } from '@/components/IntegrationsSidebar'
import { MainSidebar } from '@/components/MainSidebar'
import { RealtimeSyncProvider } from '@/components/providers/RealtimeSyncProvider'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function HomePage() {
  const { data: session, status } = useSession()

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold">Loading...</h1>
          <p className="text-muted-foreground">Please wait while we load your tasks</p>
        </div>
      </div>
    )
  }

  // Redirect to signin if not authenticated
  if (status === 'unauthenticated') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-semibold">Welcome to Sunclaude</h1>
          <p className="text-muted-foreground">
            A modern task management application with focus modes and integrations
          </p>
          <Button asChild>
            <Link href="/auth/signin">
              Sign In to Get Started
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // Show authenticated app
  return (
    <RealtimeSyncProvider>
      <div className="flex h-screen">
        <MainSidebar />
        <main className="flex-1 ml-[60px] mr-[60px] overflow-auto">
          <TaskBoardEnhanced />
        </main>
        <IntegrationsSidebar />
      </div>
    </RealtimeSyncProvider>
  )
}