"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Mail, ListTodo, FileText, LineChart } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

interface Integration {
  id: number
  name: string
  icon: React.ElementType
  color: string
  unread?: number
}

const integrations: Integration[] = [
  {
    id: 1,
    name: "Gmail",
    icon: Mail,
    color: "bg-red-500",
    unread: 3
  },
  {
    id: 2,
    name: "Asana",
    icon: ListTodo,
    color: "bg-orange-500"
  },
  {
    id: 3,
    name: "Notion",
    icon: FileText,
    color: "bg-gray-500",
    unread: 1
  },
  {
    id: 4,
    name: "Linear",
    icon: LineChart,
    color: "bg-blue-500"
  },
]

export const IntegrationsSidebar = () => {
  const { isOpen: isMainOpen } = useSidebar()
  const [isOpen, setIsOpen] = React.useState(true)

  return (
    <div
      className={cn(
        "flex h-screen flex-col border-l bg-background transition-all duration-300",
        isOpen ? "w-[240px]" : "w-[60px]"
      )}
    >
      <div className="flex h-14 items-center justify-between border-b px-4">
        {isOpen ? (
          <>
            <h2 className="text-lg font-semibold">Integrations</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="mx-auto"
            onClick={() => setIsOpen(true)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex-1 space-y-2 p-2">
        {integrations.map((integration) => {
          const Icon = integration.icon
          return (
            <Button
              key={integration.id}
              variant="ghost"
              className={cn(
                "relative w-full",
                isOpen ? "justify-start px-4" : "justify-center px-0"
              )}
            >
              <div className="relative">
                <Icon className={cn(
                  "h-4 w-4",
                  !isOpen && "text-foreground"
                )} />
                <div className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full",
                  integration.color
                )} />
              </div>
              {isOpen && <span className="ml-2">{integration.name}</span>}
              {integration.unread && (
                <Badge
                  variant="notification"
                  className="flex items-center justify-center"
                >
                  {integration.unread}
                </Badge>
              )}
            </Button>
          )
        })}
      </div>
    </div>
  )
}