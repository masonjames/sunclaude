"use client"

import * as React from "react"
import { format } from "date-fns"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { cn } from "@/lib/utils"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Task {
  id: string
  title: string
  description?: string
  priority?: "low" | "medium" | "high"
  dueTime?: string
  date: string
}

interface TaskColumnProps {
  date: Date
  tasks: Task[]
  children: React.ReactNode
}

export function TaskColumn({ date, tasks, children }: TaskColumnProps) {
  const dateStr = date.toISOString().split('T')[0]
  const { setNodeRef, isOver } = useDroppable({
    id: dateStr
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full w-[350px] shrink-0 flex-col border-r bg-background",
        isOver && "bg-muted/50"
      )}
    >
      <div className="flex items-center justify-between p-4">
        <div>
          <h2 className="text-lg font-semibold">{format(date, "EEEE")}</h2>
          <p className="text-sm text-muted-foreground">
            {format(date, "MMM d, yyyy")}
          </p>
        </div>
        <Button variant="ghost" size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 p-4">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {children}
            {tasks.length === 0 && (
              <div className="flex h-20 items-center justify-center text-sm text-muted-foreground">
                Drop tasks here
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}
