"use client"

import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Clock, Timer, RotateCw, Calendar } from "lucide-react"

interface Task {
  id: string
  title: string
  description?: string
  priority?: "low" | "medium" | "high"
  dueTime?: string
  status?: string
  estimateMinutes?: number
  actualMinutes?: number
  scheduledStart?: string
  scheduledEnd?: string
  rolloverCount?: number
  source?: string
}

interface TaskCardProps {
  task: Task
  overlay?: boolean
}

export function TaskCard({ task, overlay = false }: TaskCardProps) {
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

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'PLANNED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'COMPLETED': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'DEFERRED': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const formatTimeRange = (start?: string, end?: string) => {
    if (!start || !end) return null
    const startTime = new Date(start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const endTime = new Date(end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    return `${startTime} - ${endTime}`
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
        overlay && "shadow-2xl",
        "hover:border-foreground/20 dark:hover:border-foreground/30",
        "cursor-grab active:cursor-grabbing"
      )}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium leading-none flex-1">{task.title}</h3>
          <div className="flex items-center gap-1">
            {task.rolloverCount && task.rolloverCount > 0 && (
              <Badge variant="outline" className="text-xs px-1">
                <RotateCw className="h-3 w-3 mr-1" />
                {task.rolloverCount}
              </Badge>
            )}
            {task.priority && (
              <Badge 
                variant={
                  task.priority === 'high' ? 'destructive' :
                  task.priority === 'medium' ? 'default' :
                  'secondary'
                }
              >
                {task.priority}
              </Badge>
            )}
          </div>
        </div>
        
        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
        )}
        
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {task.estimateMinutes && (
            <div className="flex items-center gap-1">
              <Timer className="h-3 w-3" />
              <span>{Math.floor(task.estimateMinutes / 60)}h {task.estimateMinutes % 60}m</span>
            </div>
          )}
          
          {task.scheduledStart && task.scheduledEnd && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatTimeRange(task.scheduledStart, task.scheduledEnd)}</span>
            </div>
          )}
          
          {task.dueTime && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Due: {task.dueTime}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {task.status && (
            <Badge 
              variant="outline" 
              className={cn("text-xs", getStatusColor(task.status))}
            >
              {task.status.toLowerCase().replace('_', ' ')}
            </Badge>
          )}
          
          {task.source && task.source !== 'manual' && (
            <Badge variant="outline" className="text-xs">
              {task.source}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}
