"use client"

import * as React from "react"
import { ChevronRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface Integration {
  id: number
  name: string
  color: string
}

const integrations: Integration[] = [
  { id: 1, name: "Gmail", color: "bg-red-500" },
  { id: 2, name: "Asana", color: "bg-orange-500" },
  { id: 3, name: "Notion", color: "bg-gray-500" },
  { id: 4, name: "Linear", color: "bg-blue-500" },
]

export const IntegrationsSidebar = () => {
  const [selectedIntegration, setSelectedIntegration] = React.useState<string | null>(null)

  return (
    <aside className="w-64 border-l">
      <div className="flex h-14 items-center justify-between border-b px-4">
        <h3 className="font-medium">Integrations</h3>
      </div>
      <div className="p-4">
        {integrations.map((integration) => (
          <Sheet key={integration.id}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                className="mb-2 w-full justify-between"
                onClick={() => setSelectedIntegration(integration.name)}
              >
                <div className="flex items-center">
                  <div className={`mr-2 h-2 w-2 rounded-full ${integration.color}`} />
                  {integration.name}
                </div>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">{integration.name} Tasks</h3>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-lg border p-3"
                    draggable="true"
                  >
                    <div className="text-sm font-medium">
                      {integration.name} Task {i + 1}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">Due today</div>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        ))}
      </div>
    </aside>
  )
} 