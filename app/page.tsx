import { Metadata } from 'next'
import { TaskBoard } from '@/components/TaskBoard'
import { IntegrationsSidebar } from '@/components/IntegrationsSidebar'
import { MainSidebar } from '@/components/MainSidebar'
import { SidebarProvider } from "@/components/ui/sidebar"

export const metadata: Metadata = {
  title: 'LocalSunsama - Task Management',
  description: 'Manage your daily and weekly tasks efficiently',
}

export default function HomePage() {
  return (
    <SidebarProvider>
      <div className="grid h-screen grid-cols-[auto_1fr_auto]">
        <MainSidebar />
        <TaskBoard />
        <IntegrationsSidebar />
      </div>
    </SidebarProvider>
  )
}