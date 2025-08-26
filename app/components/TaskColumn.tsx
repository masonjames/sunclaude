"use client"

import * as React from "react"
import { format } from "date-fns"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { TaskCard } from "./TaskCard"
import { cn } from "@/lib/utils"
import { Task } from "@/types/task"


interface TaskColumnProps {
  date: Date
  tasks: Task[]
  isToday?: boolean
  onTimerToggle?: () => void
}

export const STATUS_LANES = [
  { key: 'PLANNED', label: 'Planned', color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
  { key: 'SCHEDULED', label: 'Scheduled', color: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800' },
  { key: 'DONE', label: 'Done', color: 'bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-800' },
] as const

function StatusLane({ status, tasks, dateStr, onTimerToggle }: {
  status: typeof STATUS_LANES[number]
  tasks: Task[]
  dateStr: string
  onTimerToggle?: () => void
}) {
  const laneId = `${dateStr}__${status.key}`
  const { setNodeRef, isOver } = useDroppable({
    id: laneId,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[120px] rounded-md border-2 border-dashed p-3 transition-colors",
        status.color,
        isOver && "border-solid border-primary bg-primary/10"
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground">
          {status.label}
        </h4>
        <span className="text-xs text-muted-foreground">
          {tasks.length}
        </span>
      </div>
      <SortableContext 
        id={laneId} 
        items={tasks.map(t => t.id)} 
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onTimerToggle={onTimerToggle}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

export function TaskColumn({ date, tasks, isToday, onTimerToggle }: TaskColumnProps) {
  const dateStr = format(date, 'yyyy-MM-dd')
  
  // Column-level droppable as fallback
  const { setNodeRef: setColumnRef, isOver: isOverColumn } = useDroppable({ 
    id: dateStr 
  })
  
  // Group tasks by status (fallback to PLANNED if no status, treat BACKLOG as PLANNED)
  const tasksByStatus = STATUS_LANES.reduce((acc, lane) => {
    acc[lane.key] = tasks.filter(task => {
      const taskStatus = task.status || 'PLANNED'
      // Show BACKLOG tasks in PLANNED lane for now
      if (taskStatus === 'BACKLOG' && lane.key === 'PLANNED') return true
      return taskStatus === lane.key
    })
    return acc
  }, {} as Record<string, Task[]>)

  // Calculate total estimated minutes
  const totalEstimatedMinutes = tasks.reduce((sum, task) => sum + (task.estimateMinutes || 0), 0)

  return (
    <div 
      ref={setColumnRef}
      className={cn(
        "flex h-full w-[360px] shrink-0 flex-col gap-3 rounded-lg border p-4",
        isToday && "border-primary bg-primary/5",
        isOverColumn && "bg-primary/5 border-primary"
      )}>
      {/* Column Header */}
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
          <span className="text-xs text-muted-foreground">
            {tasks.length} task{tasks.length === 1 ? '' : 's'}
          </span>
          {totalEstimatedMinutes > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              🕐 {Math.round(totalEstimatedMinutes / 60 * 10) / 10}h
            </span>
          )}
        </div>
      </div>

      {/* Status Lanes */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {STATUS_LANES.map((lane) => (
          <StatusLane
            key={lane.key}
            status={lane}
            tasks={tasksByStatus[lane.key]}
            dateStr={dateStr}
            onTimerToggle={onTimerToggle}
          />
        ))}
      </div>
    </div>
  )
}
