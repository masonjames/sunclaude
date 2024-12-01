"use client"

import * as React from "react"
import { Plus } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Task {
  id: string
  title: string
  duration: string
}

export const TaskBoard = () => {
  return (
    <main className="flex flex-col overflow-hidden bg-muted/10">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <h2 className="text-lg font-semibold">Today's Plan</h2>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </header>
      <ScrollArea className="flex-1">
        <div className="grid h-full grid-cols-3 divide-x">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-medium">
                    {new Date(Date.now() + i * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })}
                  </h3>
                  <Button variant="ghost" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div
                      key={j}
                      className="rounded-lg bg-background p-3 shadow-sm"
                      draggable="true"
                    >
                      <div className="text-sm font-medium">Task {j + 1}</div>
                      <div className="mt-1 text-xs text-muted-foreground">2 hours</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </main>
  )
} 