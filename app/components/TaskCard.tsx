"use client"

import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Task {
  id: string
  title: string
  description?: string
  priority?: "low" | "medium" | "high"
  dueTime?: string
}

interface TaskCardProps {
  task: Task
  overlay?: boolean
}

export function TaskCard({ task, overlay }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task
    }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative rounded-lg border p-4 shadow-sm transition-all",
        isDragging && "z-50 scale-105 shadow-lg",
        "hover:border-foreground/20 dark:hover:border-foreground/30",
        "cursor-grab active:cursor-grabbing"
      )}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h3 className="font-medium leading-none">{task.title}</h3>
          {task.priority && (
            <Badge variant={task.priority === "high" ? "destructive" : task.priority === "medium" ? "secondary" : "outline"}>
              {task.priority}
            </Badge>
          )}
        </div>
        {task.description && (
          <p className="text-sm text-muted-foreground">{task.description}</p>
        )}
        {task.dueTime && (
          <p className="text-xs text-muted-foreground">Due: {task.dueTime}</p>
        )}
      </div>
    </div>
  )
}
