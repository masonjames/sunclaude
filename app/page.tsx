import { Metadata } from 'next'
import { TaskBoard } from '@/components/TaskBoard'
import { IntegrationsSidebar } from '@/components/IntegrationsSidebar'
import { MainSidebar } from '@/components/MainSidebar'

export const metadata: Metadata = {
  title: 'Sunclaude - Task Management',
  description: 'To Do App with Focus Modes and Simple Integrations',
}

export default function HomePage() {
  return (
    <div className="flex h-screen">
      <MainSidebar />
      <main className="flex-1 overflow-auto">
        <TaskBoard />
      </main>
      <IntegrationsSidebar />
    </div>
  )
}