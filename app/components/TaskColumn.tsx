"use client"

import * as React from "react"
import { format } from "date-fns"
import { useDroppable } from "@dnd-kit/core"
import { TaskCard } from "./TaskCard"
import { cn } from "@/lib/utils"

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
  isToday?: boolean
}

export function TaskColumn({ date, tasks, isToday }: TaskColumnProps) {
  const dateStr = format(date, 'yyyy-MM-dd')
  const { setNodeRef } = useDroppable({
    id: dateStr,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full w-[300px] shrink-0 flex-col gap-4 rounded-lg border p-4",
        isToday && "border-primary bg-primary/5"
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {format(date, 'EEEE')}
          </span>
          <span className={cn(
            "text-sm",
            isToday && "font-semibold text-primary"
          )}>
            {format(date, 'MMM d')}
          </span>
        </div>
        {tasks.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            {tasks.length} task{tasks.length === 1 ? '' : 's'}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            No tasks
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
          />
        ))}
      </div>
    </div>
  )
}
