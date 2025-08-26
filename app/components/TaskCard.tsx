"use client"

import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play, Pause, Clock, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { Task } from "@/types/task"
import { useToast } from "@/contexts/ToastContext"

interface TaskCardProps {
  task: Task & { hasActiveTimer?: boolean }
  overlay?: boolean
  onTimerToggle?: () => void
}

export function TaskCard({ task, overlay, onTimerToggle }: TaskCardProps) {
  const { addToast } = useToast()
  const [isHovered, setIsHovered] = React.useState(false)
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
      task,
      date: task.date,
      status: task.status
    },
    disabled: overlay
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? transition : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: overlay ? 0.9 : isDragging ? 0.7 : 1,
    cursor: overlay ? 'default' : 'grab',
    zIndex: isDragging ? 50 : 1,
  }

  const handleTimerToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      if (task.hasActiveTimer) {
        const response = await fetch(`/api/tasks/${task.id}/timer/stop`, {
          method: 'POST',
        })
        
        if (response.ok) {
          addToast({
            type: 'info',
            title: "Timer stopped",
            description: `Timer stopped for "${task.title}"`,
          })
        }
      } else {
        const response = await fetch(`/api/tasks/${task.id}/timer/start`, {
          method: 'POST',
        })
        
        if (response.ok) {
          addToast({
            type: 'success',
            title: "Timer started",
            description: `Timer started for "${task.title}"`,
          })
        }
      }
      
      onTimerToggle?.()
    } catch (error) {
      addToast({
        type: 'error',
        title: "Error",
        description: "Failed to toggle timer",
      })
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative rounded-xl border-2 p-5 shadow-sm backdrop-blur-sm transition-all duration-300 ease-out",
        "bg-white/80 dark:bg-gray-950/80",
        isDragging && "z-50 scale-105 shadow-xl ring-2 ring-blue-500/20",
        isHovered && !isDragging && "scale-[1.02] shadow-lg border-gray-300/60 dark:border-gray-600/60 bg-white/90 dark:bg-gray-950/90",
        !overlay && "cursor-grab active:cursor-grabbing active:scale-95",
        task.hasActiveTimer ? "border-blue-400/60 bg-blue-50/80 dark:bg-blue-950/40 shadow-blue-100/50 dark:shadow-blue-900/20" : "border-gray-200/50 dark:border-gray-800/50",
        "hover:border-opacity-80 dark:hover:border-opacity-80"
      )}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold leading-tight text-gray-900 dark:text-gray-100 mb-1 tracking-tight">{task.title}</h3>
            {task.description && (
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 line-clamp-2">{task.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {task.priority && (
              <Badge 
                variant={task.priority === "HIGH" ? "destructive" : task.priority === "MEDIUM" ? "secondary" : "outline"}
                className="text-xs font-medium"
              >
                {task.priority}
              </Badge>
            )}
            {/* Options menu - visible on hover */}
            <Button
              size="sm"
              variant="ghost"
              className={cn(
                "h-7 w-7 p-0 transition-all duration-200",
                isHovered ? "opacity-100 scale-100" : "opacity-0 scale-95",
                "hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        
        {task.dueTime && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/30 px-2.5 py-1.5 rounded-lg border border-amber-200/30 dark:border-amber-800/30">
            <Clock className="h-3 w-3" />
            <span className="font-medium">Due: {task.dueTime}</span>
          </div>
        )}
        
        <div className="flex items-center justify-between pt-1 border-t border-gray-100/50 dark:border-gray-800/50">
          <div className="flex items-center gap-2.5">
            {task.status && (
              <Badge variant="outline" className="text-xs font-medium px-2 py-0.5 bg-gray-50/50 dark:bg-gray-900/50">
                {task.status.replace('_', ' ')}
              </Badge>
            )}
            {task.hasActiveTimer && (
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30 px-2 py-1 rounded-md border border-blue-200/30 dark:border-blue-800/30">
                <Clock className="h-3 w-3 animate-pulse" />
                <span className="text-xs font-semibold">Active</span>
              </div>
            )}
            
            {(task.estimateMinutes || task.actualMinutes) && (
              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-900/50 px-2 py-1 rounded-md">
                {task.actualMinutes ? (
                  <span className="font-medium text-gray-900 dark:text-gray-100">{task.actualMinutes}m</span>
                ) : null}
                {task.estimateMinutes && (
                  <span className="text-gray-500 dark:text-gray-500">/{task.estimateMinutes}m</span>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className={cn(
                "h-8 w-8 p-0 transition-all duration-200 rounded-lg",
                task.hasActiveTimer 
                  ? "hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400" 
                  : "hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400",
                "hover:scale-110 active:scale-95"
              )}
              onClick={handleTimerToggle}
            >
              {task.hasActiveTimer ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
