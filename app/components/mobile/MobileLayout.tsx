"use client"

import * as React from "react"
import { Menu, X, Plus, Bell, Settings, Calendar, GitBranch, Home } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TaskBoardEnhanced } from "@/components/TaskBoardEnhanced"
import { TabbedIntegrationPanel } from "@/components/integrations/TabbedIntegrationPanel"
import { CalendarIntegration } from "@/components/calendar/CalendarIntegration"
import { GitHubIntegration } from "@/components/integrations/GitHubIntegration"
import { useTaskStats } from "@/stores/task-store"
import { cn } from "@/lib/utils"

interface MobileLayoutProps {
  children?: React.ReactNode
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const [activeTab, setActiveTab] = React.useState('tasks')
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const stats = useTaskStats()

  // Close sidebar when tab changes
  React.useEffect(() => {
    setSidebarOpen(false)
  }, [activeTab])

  // Handle swipe gestures
  React.useEffect(() => {
    let startX = 0
    let startY = 0

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!startX || !startY) return

      const currentX = e.touches[0].clientX
      const currentY = e.touches[0].clientY
      
      const diffX = startX - currentX
      const diffY = startY - currentY

      // Only handle horizontal swipes
      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > 50) { // Minimum swipe distance
          if (diffX > 0) {
            // Swipe left - next tab
            const tabs = ['tasks', 'integrations', 'calendar', 'github']
            const currentIndex = tabs.indexOf(activeTab)
            if (currentIndex < tabs.length - 1) {
              setActiveTab(tabs[currentIndex + 1])
            }
          } else {
            // Swipe right - previous tab
            const tabs = ['tasks', 'integrations', 'calendar', 'github']
            const currentIndex = tabs.indexOf(activeTab)
            if (currentIndex > 0) {
              setActiveTab(tabs[currentIndex - 1])
            }
          }
        }
      }

      startX = 0
      startY = 0
    }

    document.addEventListener('touchstart', handleTouchStart)
    document.addEventListener('touchmove', handleTouchMove)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
    }
  }, [activeTab])

  const getTabBadge = (tab: string) => {
    switch (tab) {
      case 'tasks':
        return stats.total > 0 ? stats.total : null
      case 'integrations':
        return stats.inProgress > 0 ? stats.inProgress : null
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Mobile Header */}
      <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <div className="py-6 space-y-6">
                <div className="px-3">
                  <h2 className="text-lg font-semibold">Sunclaude</h2>
                  <p className="text-sm text-muted-foreground">Task Management</p>
                </div>
                
                <div className="space-y-1">
                  <Button
                    variant={activeTab === 'tasks' ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveTab('tasks')}
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Tasks
                    {getTabBadge('tasks') && (
                      <Badge variant="secondary" className="ml-auto">
                        {getTabBadge('tasks')}
                      </Badge>
                    )}
                  </Button>
                  
                  <Button
                    variant={activeTab === 'integrations' ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveTab('integrations')}
                  >
                    <GitBranch className="h-4 w-4 mr-2" />
                    Integrations
                    {getTabBadge('integrations') && (
                      <Badge variant="secondary" className="ml-auto">
                        {getTabBadge('integrations')}
                      </Badge>
                    )}
                  </Button>
                  
                  <Button
                    variant={activeTab === 'calendar' ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveTab('calendar')}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Calendar
                  </Button>
                  
                  <Button
                    variant={activeTab === 'github' ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveTab('github')}
                  >
                    <GitBranch className="h-4 w-4 mr-2" />
                    GitHub
                  </Button>
                </div>

                <div className="border-t pt-6">
                  <div className="grid grid-cols-2 gap-4 px-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                      <div className="text-xs text-muted-foreground">Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
                      <div className="text-xs text-muted-foreground">In Progress</div>
                    </div>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold">
              {activeTab === 'tasks' && 'Tasks'}
              {activeTab === 'integrations' && 'Integrations'}
              {activeTab === 'calendar' && 'Calendar'}
              {activeTab === 'github' && 'GitHub'}
            </h1>
            <div className="text-xs text-muted-foreground">
              {stats.total} total, {stats.inProgress} active
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Mobile Tab Content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full">
          {activeTab === 'tasks' && (
            <div className="h-full">
              <TaskBoardEnhanced />
            </div>
          )}
          
          {activeTab === 'integrations' && (
            <div className="h-full p-4">
              <TabbedIntegrationPanel />
            </div>
          )}
          
          {activeTab === 'calendar' && (
            <div className="h-full p-4 overflow-auto">
              <CalendarIntegration selectedDate={new Date()} />
            </div>
          )}
          
          {activeTab === 'github' && (
            <div className="h-full p-4 overflow-auto">
              <GitHubIntegration />
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="grid grid-cols-4 h-16">
          <button
            onClick={() => setActiveTab('tasks')}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-xs transition-colors",
              activeTab === 'tasks'
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Home className="h-4 w-4" />
            <span>Tasks</span>
            {getTabBadge('tasks') && (
              <Badge variant="secondary" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
                {getTabBadge('tasks')}
              </Badge>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('integrations')}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-xs transition-colors relative",
              activeTab === 'integrations'
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <GitBranch className="h-4 w-4" />
            <span>Apps</span>
            {getTabBadge('integrations') && (
              <Badge variant="secondary" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
                {getTabBadge('integrations')}
              </Badge>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('calendar')}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-xs transition-colors",
              activeTab === 'calendar'
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Calendar className="h-4 w-4" />
            <span>Calendar</span>
          </button>
          
          <button
            onClick={() => setActiveTab('github')}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-xs transition-colors",
              activeTab === 'github'
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <GitBranch className="h-4 w-4" />
            <span>GitHub</span>
          </button>
        </div>
      </nav>

      {/* Floating Action Button for mobile */}
      <Button
        size="icon"
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-50 md:hidden"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  )
}