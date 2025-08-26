"use client"

import * as React from "react"
import { format } from "date-fns"
import { useDroppable } from "@dnd-kit/core"
import { TaskCard } from "./TaskCard"
import { cn } from "@/lib/utils"
import { Clock, Timer } from "lucide-react"

interface Task {
  id: string
  title: string
  description?: string
  priority?: "low" | "medium" | "high"
  dueTime?: string
  date: string
  status?: string
  estimatedMinutes?: number
  actualMinutes?: number
  hasActiveTimer?: boolean
  scheduledStart?: string
  scheduledEnd?: string
}

interface TaskColumnProps {
  date: Date
  tasks: Task[]
  isToday?: boolean
  onTimerToggle?: () => void
}

export function TaskColumn({ date, tasks, isToday, onTimerToggle }: TaskColumnProps) {
  const dateStr = format(date, 'yyyy-MM-dd')
  const { setNodeRef } = useDroppable({
    id: dateStr,
  })

  // Calculate total estimated time and timeboxed tasks
  const totalEstimatedMinutes = tasks.reduce((acc, task) => acc + (task.estimatedMinutes || 0), 0)
  const timeboxedTasks = tasks.filter(task => task.scheduledStart && task.scheduledEnd)
  const tasksInProgress = tasks.filter(task => task.status === 'IN_PROGRESS')

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
        <div className="flex items-center justify-between">
          {tasks.length > 0 ? (
            <span className="text-xs text-muted-foreground">
              {tasks.length} task{tasks.length === 1 ? '' : 's'}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              No tasks
            </span>
          )}
          <div className="flex items-center gap-2">
            {timeboxedTasks.length > 0 && (
              <div className="flex items-center" title={`${timeboxedTasks.length} timeboxed`}>
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground ml-1">
                  {timeboxedTasks.length}
                </span>
              </div>
            )}
            {tasksInProgress.length > 0 && (
              <div className="flex items-center" title={`${tasksInProgress.length} in progress`}>
                <Timer className="h-3 w-3 text-blue-500 animate-pulse" />
                <span className="text-xs text-blue-500 ml-1">
                  {tasksInProgress.length}
                </span>
              </div>
            )}
          </div>
        </div>
        {totalEstimatedMinutes > 0 && (
          <div className="text-xs text-muted-foreground">
            Est: {Math.floor(totalEstimatedMinutes / 60)}h {totalEstimatedMinutes % 60}m
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onTimerToggle={onTimerToggle}
          />
        ))}
      </div>
    </div>
  )
}
