"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Mail, ListTodo, Calendar, FileText, LineChart } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { IntegrationPanel } from "./integrations/IntegrationPanel"

type Integration = "gmail" | "asana" | "calendar" | "notion" | "linear"

const mockData = {
  gmail: [
    {
      id: "email1",
      title: "Project Update Meeting",
      description: "Team sync on Q4 goals",
      dueDate: "2024-12-15",
      priority: "high" as const,
    },
    {
      id: "email2",
      title: "Client Presentation Review",
      description: "Please review before tomorrow",
      dueDate: "2024-12-16",
      priority: "medium" as const,
    },
  ],
  asana: [
    {
      id: "task1",
      title: "Update Documentation",
      description: "Add new API endpoints",
      dueDate: "2024-12-15",
      priority: "low" as const,
    },
    {
      id: "task2",
      title: "Design Review",
      description: "Review homepage mockups",
      dueDate: "2024-12-16",
      priority: "medium" as const,
    },
  ],
  calendar: [
    {
      id: "event1",
      title: "Team Standup",
      description: "Daily team sync",
      dueDate: "2024-12-15T10:00:00",
      priority: "medium" as const,
    },
    {
      id: "event2",
      title: "Client Meeting",
      description: "Quarterly review",
      dueDate: "2024-12-15T14:00:00",
      priority: "high" as const,
    },
  ],
  notion: [
    {
      id: "note1",
      title: "Product Roadmap",
      description: "Q1 2024 planning document",
      dueDate: "2024-12-15",
      priority: "high" as const,
    },
    {
      id: "note2",
      title: "Meeting Notes",
      description: "Weekly team sync notes",
      dueDate: "2024-12-16",
      priority: "low" as const,
    },
  ],
  linear: [
    {
      id: "issue1",
      title: "Fix Navigation Bug",
      description: "Mobile navigation not working",
      dueDate: "2024-12-15",
      priority: "high" as const,
    },
    {
      id: "issue2",
      title: "Add Dark Mode",
      description: "Implement system-wide dark mode",
      dueDate: "2024-12-16",
      priority: "medium" as const,
    },
  ],
}

export const IntegrationsSidebar = () => {
  const { isOpen: isMainOpen, setIsOpen: setIsMainOpen } = useSidebar()
  const [activeIntegration, setActiveIntegration] = React.useState<Integration | null>(null)

  const handleAddToBoard = async (item: any) => {
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: item.title,
          description: item.description,
          priority: item.priority,
          date: item.dueDate.split("T")[0],
          dueTime: item.dueDate.includes("T") 
            ? item.dueDate.split("T")[1].substring(0, 5)
            : undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create task")
      }

      // You might want to trigger a refresh of the main board here
    } catch (error) {
      console.error("Error creating task:", error)
    }
  }

  return (
    <div
      className={cn(
        "flex h-screen flex-col border-l bg-background transition-all duration-300",
        isMainOpen ? "w-[400px]" : "w-[60px]"
      )}
    >
      <div className="flex h-14 items-center justify-between border-b px-4">
        {isMainOpen ? (
          <>
            <h2 className="text-lg font-semibold">Integrations</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMainOpen(false)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="mx-auto"
            onClick={() => setIsMainOpen(true)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex-1">
        {isMainOpen ? (
          activeIntegration ? (
            <IntegrationPanel
              title={activeIntegration.charAt(0).toUpperCase() + activeIntegration.slice(1)}
              items={mockData[activeIntegration]}
              onAddToBoard={handleAddToBoard}
            />
          ) : (
            <div className="grid grid-cols-1 gap-2 p-4">
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => setActiveIntegration("gmail")}
              >
                <Mail className="mr-2 h-4 w-4" />
                Gmail
                <Badge variant="notification" className="ml-auto">3</Badge>
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => setActiveIntegration("asana")}
              >
                <ListTodo className="mr-2 h-4 w-4" />
                Asana
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => setActiveIntegration("calendar")}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Calendar
                <Badge variant="notification" className="ml-auto">2</Badge>
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => setActiveIntegration("notion")}
              >
                <FileText className="mr-2 h-4 w-4" />
                Notion
                <Badge variant="notification" className="ml-auto">1</Badge>
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => setActiveIntegration("linear")}
              >
                <LineChart className="mr-2 h-4 w-4" />
                Linear
              </Button>
            </div>
          )
        ) : (
          <div className="space-y-4 py-4">
            <Button
              variant="ghost"
              size="icon"
              className="relative mx-auto block"
              onClick={() => {
                setIsMainOpen(true)
                setActiveIntegration("gmail")
              }}
            >
              <Mail className="h-4 w-4" />
              <Badge variant="notification" className="absolute -right-1 -top-1">3</Badge>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="mx-auto block"
              onClick={() => {
                setIsMainOpen(true)
                setActiveIntegration("asana")
              }}
            >
              <ListTodo className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative mx-auto block"
              onClick={() => {
                setIsMainOpen(true)
                setActiveIntegration("calendar")
              }}
            >
              <Calendar className="h-4 w-4" />
              <Badge variant="notification" className="absolute -right-1 -top-1">2</Badge>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative mx-auto block"
              onClick={() => {
                setIsMainOpen(true)
                setActiveIntegration("notion")
              }}
            >
              <FileText className="h-4 w-4" />
              <Badge variant="notification" className="absolute -right-1 -top-1">1</Badge>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="mx-auto block"
              onClick={() => {
                setIsMainOpen(true)
                setActiveIntegration("linear")
              }}
            >
              <LineChart className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      {activeIntegration && isMainOpen && (
        <div className="border-t p-2">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setActiveIntegration(null)}
          >
            Back to Integrations
          </Button>
        </div>
      )}
    </div>
  )
}