"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Mail, Calendar, Github, Briefcase, CheckSquare } from "lucide-react"
import { IntegrationPanel } from "./IntegrationPanel"
import { useApi } from "@/hooks/use-api"
import { cn } from "@/lib/utils"

interface IntegrationItem {
  id: string
  title: string
  description?: string
  dueDate?: string
  priority?: "LOW" | "MEDIUM" | "HIGH"
  provider?: string
  metadata?: Record<string, any>
}

interface IntegrationTabProps {
  id: string
  label: string
  icon: React.ReactNode
  color: string
  items: IntegrationItem[]
  loading: boolean
  error?: string
  onSync: () => void
  onAddToBoard: (item: IntegrationItem) => void
}

function IntegrationTab({ id, label, icon, color, items, loading, error, onSync, onAddToBoard }: IntegrationTabProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("flex items-center gap-2", color)}>
              {icon}
              <h3 className="text-lg font-semibold">{label}</h3>
            </div>
            <Badge variant="secondary" className="text-xs">
              {items.length}
            </Badge>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onSync}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Sync
          </Button>
        </div>
      </div>
      <div className="flex-1">
        <IntegrationPanel
          title=""
          items={items}
          loading={loading}
          error={error}
          onAddToBoard={onAddToBoard}
        />
      </div>
    </div>
  )
}

export function TabbedIntegrationPanel() {
  const { execute: executeSync } = useApi()
  const { execute: executeImport } = useApi()

  // State for each integration
  const [gmailItems, setGmailItems] = React.useState<IntegrationItem[]>([])
  const [gmailLoading, setGmailLoading] = React.useState(false)
  const [gmailError, setGmailError] = React.useState<string>()

  const [calendarItems, setCalendarItems] = React.useState<IntegrationItem[]>([])
  const [calendarLoading, setCalendarLoading] = React.useState(false)
  const [calendarError, setCalendarError] = React.useState<string>()

  const [githubItems, setGithubItems] = React.useState<IntegrationItem[]>([])
  const [githubLoading, setGithubLoading] = React.useState(false)
  const [githubError, setGithubError] = React.useState<string>()

  const [asanaItems, setAsanaItems] = React.useState<IntegrationItem[]>([])
  const [asanaLoading, setAsanaLoading] = React.useState(false)
  const [asanaError, setAsanaError] = React.useState<string>()

  // Load Gmail items
  const loadGmailItems = React.useCallback(async () => {
    setGmailLoading(true)
    setGmailError(undefined)
    try {
      const items = await executeSync(
        fetch('/api/integrations/gmail'),
        { showSuccessToast: false }
      )
      if (items && Array.isArray(items)) {
        setGmailItems(items.map((item: any) => ({
          id: item.id,
          title: item.subject || item.title,
          description: item.snippet || item.description,
          provider: 'gmail',
          priority: item.priority || 'MEDIUM',
          metadata: item
        })))
      }
    } catch (error) {
      setGmailError('Failed to load Gmail items')
    } finally {
      setGmailLoading(false)
    }
  }, [executeSync])

  // Load Calendar items
  const loadCalendarItems = React.useCallback(async () => {
    setCalendarLoading(true)
    setCalendarError(undefined)
    try {
      const items = await executeSync(
        fetch('/api/integrations/google/calendar'),
        { showSuccessToast: false }
      )
      if (items && Array.isArray(items)) {
        setCalendarItems(items.map((item: any) => ({
          id: item.id,
          title: item.summary || item.title,
          description: item.description,
          dueDate: item.start?.dateTime || item.start?.date,
          provider: 'calendar',
          priority: 'MEDIUM',
          metadata: item
        })))
      }
    } catch (error) {
      setCalendarError('Failed to load Calendar events')
    } finally {
      setCalendarLoading(false)
    }
  }, [executeSync])

  // Load GitHub items
  const loadGithubItems = React.useCallback(async () => {
    setGithubLoading(true)
    setGithubError(undefined)
    try {
      const items = await executeSync(
        fetch('/api/integrations/github'),
        { showSuccessToast: false }
      )
      if (items && Array.isArray(items)) {
        setGithubItems(items.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.body || item.description,
          dueDate: item.due_on || item.updated_at,
          provider: 'github',
          priority: item.priority || 'MEDIUM',
          metadata: item
        })))
      }
    } catch (error) {
      setGithubError('Failed to load GitHub issues')
    } finally {
      setGithubLoading(false)
    }
  }, [executeSync])

  // Load Asana items
  const loadAsanaItems = React.useCallback(async () => {
    setAsanaLoading(true)
    setAsanaError(undefined)
    try {
      const items = await executeSync(
        fetch('/api/integrations/asana'),
        { showSuccessToast: false }
      )
      if (items && Array.isArray(items)) {
        setAsanaItems(items.map((item: any) => ({
          id: item.gid || item.id,
          title: item.name || item.title,
          description: item.notes || item.description,
          dueDate: item.due_on || item.due_at,
          provider: 'asana',
          priority: item.priority || 'MEDIUM',
          metadata: item
        })))
      }
    } catch (error) {
      setAsanaError('Failed to load Asana tasks')
    } finally {
      setAsanaLoading(false)
    }
  }, [executeSync])

  // Sync functions for each provider
  const syncGmail = React.useCallback(async () => {
    try {
      await executeSync(
        fetch('/api/integrations/gmail', { method: 'GET' }),
        { successMessage: 'Gmail synced successfully' }
      )
      loadGmailItems()
    } catch (error) {
      setGmailError('Sync failed. Please try again.')
    }
  }, [loadGmailItems, executeSync])

  const syncCalendar = React.useCallback(async () => {
    try {
      // Trigger background sync first
      await executeSync(
        fetch('/api/integrations/google/calendar/sync', { method: 'POST' }),
        { successMessage: 'Calendar sync started' }
      )
      loadCalendarItems()
    } catch (error) {
      setCalendarError('Sync failed. Please try again.')
    }
  }, [loadCalendarItems, executeSync])

  const syncGithub = React.useCallback(async () => {
    try {
      await executeSync(
        fetch('/api/integrations/github', { method: 'GET' }),
        { successMessage: 'GitHub synced successfully' }
      )
      loadGithubItems()
    } catch (error) {
      setGithubError('Sync failed. Please try again.')
    }
  }, [loadGithubItems, executeSync])

  const syncAsana = React.useCallback(async () => {
    try {
      await executeSync(
        fetch('/api/integrations/asana', { method: 'GET' }),
        { successMessage: 'Asana synced successfully' }
      )
      loadAsanaItems()
    } catch (error) {
      setAsanaError('Sync failed. Please try again.')
    }
  }, [loadAsanaItems, executeSync])

  // Handle adding items to board
  const handleAddToBoard = React.useCallback(async (item: IntegrationItem) => {
    try {
      await executeImport(
        fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: item.title,
            description: item.description,
            priority: item.priority,
            date: new Date().toISOString().split('T')[0], // Today
            status: 'PLANNED',
            dueTime: item.dueDate ? new Date(item.dueDate).toLocaleTimeString('en-US', { 
              hour12: false, 
              hour: '2-digit', 
              minute: '2-digit' 
            }) : undefined,
          }),
        }),
        {
          successMessage: 'Task added to board'
        }
      )
      
      // Refresh the board (this would be handled by parent component)
      window.dispatchEvent(new CustomEvent('taskAdded'))
    } catch (error) {
      console.error('Failed to add item to board:', error)
    }
  }, [executeImport])

  // Initial load
  React.useEffect(() => {
    loadGmailItems()
    loadCalendarItems()
    loadGithubItems()
    loadAsanaItems()
  }, [loadGmailItems, loadCalendarItems, loadGithubItems, loadAsanaItems])

  const tabs = [
    {
      id: "gmail",
      label: "Gmail",
      icon: <Mail className="h-4 w-4" />,
      color: "text-red-600 dark:text-red-400",
      items: gmailItems,
      loading: gmailLoading,
      error: gmailError,
      onSync: syncGmail,
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: <Calendar className="h-4 w-4" />,
      color: "text-blue-600 dark:text-blue-400",
      items: calendarItems,
      loading: calendarLoading,
      error: calendarError,
      onSync: syncCalendar,
    },
    {
      id: "github",
      label: "GitHub",
      icon: <Github className="h-4 w-4" />,
      color: "text-gray-800 dark:text-gray-200",
      items: githubItems,
      loading: githubLoading,
      error: githubError,
      onSync: syncGithub,
    },
    {
      id: "asana",
      label: "Asana",
      icon: <CheckSquare className="h-4 w-4" />,
      color: "text-purple-600 dark:text-purple-400",
      items: asanaItems,
      loading: asanaLoading,
      error: asanaError,
      onSync: syncAsana,
    },
  ]

  return (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="gmail" className="flex h-full flex-col">
        <TabsList className="grid w-full grid-cols-4">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <Badge variant="secondary" className="ml-1 text-xs">
                {tab.items.length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
        
        <div className="flex-1 overflow-hidden">
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="h-full mt-0">
              <IntegrationTab
                id={tab.id}
                label={tab.label}
                icon={tab.icon}
                color={tab.color}
                items={tab.items}
                loading={tab.loading}
                error={tab.error}
                onSync={tab.onSync}
                onAddToBoard={handleAddToBoard}
              />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  )
}