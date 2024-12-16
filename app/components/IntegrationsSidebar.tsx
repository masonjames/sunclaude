"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Mail, ListTodo, Calendar, FileText, LineChart } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSidebar } from "@/components/ui/sidebar"
import { useApi } from "@/hooks/use-api"
import { cn } from "@/lib/utils"
import { IntegrationPanel } from "./integrations/IntegrationPanel"

type Integration = "gmail" | "asana" | "calendar" | "notion" | "linear"

interface IntegrationItem {
  id: string
  title: string
  description?: string
  dueDate?: string
  priority?: "low" | "medium" | "high"
}

interface IntegrationState {
  items: IntegrationItem[]
  loading: boolean
  error?: string
  unreadCount?: number
}

interface IntegrationApiResponse {
  items: IntegrationItem[]
}

export const IntegrationsSidebar = () => {
  const { isIntegrationsOpen, setIsIntegrationsOpen } = useSidebar()
  const { execute } = useApi<IntegrationApiResponse>()
  const [activeIntegration, setActiveIntegration] = React.useState<Integration | null>(null)
  const [integrations, setIntegrations] = React.useState<Record<Integration, IntegrationState>>({
    gmail: { items: [], loading: false },
    asana: { items: [], loading: false },
    calendar: { items: [], loading: false },
    notion: { items: [], loading: false },
    linear: { items: [], loading: false }
  })

  const fetchIntegrationItems = React.useCallback(async (integration: Integration) => {
    setIntegrations(prev => ({
      ...prev,
      [integration]: { ...prev[integration], loading: true, error: undefined }
    }))

    const data = await execute(
      fetch(`/api/integrations/${integration}`),
      {
        showSuccessToast: false,
        showErrorToast: true
      }
    )

    setIntegrations(prev => ({
      ...prev,
      [integration]: {
        items: data?.items || [],
        loading: false,
        unreadCount: data?.items.length || 0
      }
    }))
  }, [execute])

  React.useEffect(() => {
    if (activeIntegration) {
      fetchIntegrationItems(activeIntegration)
    }
  }, [activeIntegration, fetchIntegrationItems])

  const handleAddToBoard = async (item: IntegrationItem) => {
    const success = await execute(
      fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: item.title,
          description: item.description,
          priority: item.priority,
          date: item.dueDate?.split("T")[0],
          dueTime: item.dueDate?.includes("T") 
            ? item.dueDate.split("T")[1].substring(0, 5)
            : undefined,
        }),
      }),
      {
        successMessage: "Task added to board successfully"
      }
    )
  }

  return (
    <div className={cn(
      "fixed top-0 right-0 z-10 flex h-screen flex-col border-l bg-background transition-all duration-300",
      isIntegrationsOpen ? "w-[320px]" : "w-[60px]"
    )}>
      <div className="flex h-14 items-center justify-between border-b px-4">
        {isIntegrationsOpen ? (
          <>
            <h2 className="text-lg font-semibold">Integrations</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsIntegrationsOpen(false)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="mx-auto"
            onClick={() => setIsIntegrationsOpen(true)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex flex-1">
        <div className="flex w-[60px] flex-col border-r">
          <Button
            variant={activeIntegration === "gmail" ? "secondary" : "ghost"}
            size="icon"
            className="relative h-[60px] w-[60px] rounded-none"
            onClick={() => setActiveIntegration("gmail")}
          >
            <Mail className="h-5 w-5" />
            {integrations.gmail.unreadCount ? (
              <Badge variant="secondary" className="absolute -right-1 -top-1">
                {integrations.gmail.unreadCount}
              </Badge>
            ) : null}
          </Button>

          <Button
            variant={activeIntegration === "asana" ? "secondary" : "ghost"}
            size="icon"
            className="relative h-[60px] w-[60px] rounded-none"
            onClick={() => setActiveIntegration("asana")}
          >
            <ListTodo className="h-5 w-5" />
            {integrations.asana.unreadCount ? (
              <Badge variant="secondary" className="absolute -right-1 -top-1">
                {integrations.asana.unreadCount}
              </Badge>
            ) : null}
          </Button>

          <Button
            variant={activeIntegration === "calendar" ? "secondary" : "ghost"}
            size="icon"
            className="relative h-[60px] w-[60px] rounded-none"
            onClick={() => setActiveIntegration("calendar")}
          >
            <Calendar className="h-5 w-5" />
            {integrations.calendar.unreadCount ? (
              <Badge variant="secondary" className="absolute -right-1 -top-1">
                {integrations.calendar.unreadCount}
              </Badge>
            ) : null}
          </Button>

          <Button
            variant={activeIntegration === "notion" ? "secondary" : "ghost"}
            size="icon"
            className="relative h-[60px] w-[60px] rounded-none"
            onClick={() => setActiveIntegration("notion")}
          >
            <FileText className="h-5 w-5" />
            {integrations.notion.unreadCount ? (
              <Badge variant="secondary" className="absolute -right-1 -top-1">
                {integrations.notion.unreadCount}
              </Badge>
            ) : null}
          </Button>

          <Button
            variant={activeIntegration === "linear" ? "secondary" : "ghost"}
            size="icon"
            className="relative h-[60px] w-[60px] rounded-none"
            onClick={() => setActiveIntegration("linear")}
          >
            <LineChart className="h-5 w-5" />
            {integrations.linear.unreadCount ? (
              <Badge variant="secondary" className="absolute -right-1 -top-1">
                {integrations.linear.unreadCount}
              </Badge>
            ) : null}
          </Button>
        </div>

        {isIntegrationsOpen && activeIntegration && (
          <div className="flex-1">
            <IntegrationPanel
              title={activeIntegration.charAt(0).toUpperCase() + activeIntegration.slice(1)}
              items={integrations[activeIntegration].items}
              loading={integrations[activeIntegration].loading}
              error={integrations[activeIntegration].error}
              onAddToBoard={handleAddToBoard}
            />
          </div>
        )}
      </div>
    </div>
  )
}