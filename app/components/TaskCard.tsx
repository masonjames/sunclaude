"use client"

import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play, Pause, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Task } from "@/types/task"
import { useToast } from "@/hooks/use-toast"

interface TaskCardProps {
  task: Task & { hasActiveTimer?: boolean }
  overlay?: boolean
  onTimerToggle?: () => void
}

export function TaskCard({ task, overlay, onTimerToggle }: TaskCardProps) {
  const { toast } = useToast()
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
    transition,
    opacity: overlay ? 0.9 : isDragging ? 0.7 : 1,
    cursor: overlay ? 'default' : 'grab',
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
          toast({
            title: "Timer stopped",
            description: `Timer stopped for "${task.title}"`,
          })
        }
      } else {
        const response = await fetch(`/api/tasks/${task.id}/timer/start`, {
          method: 'POST',
        })
        
        if (response.ok) {
          toast({
            title: "Timer started",
            description: `Timer started for "${task.title}"`,
          })
        }
      }
      
      onTimerToggle?.()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle timer",
        variant: "destructive",
      })
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      className={cn(
        "group relative rounded-lg border p-4 shadow-sm transition-all",
        isDragging && "z-50 scale-105 shadow-lg",
        "hover:border-foreground/20 dark:hover:border-foreground/30",
        !overlay && "cursor-grab active:cursor-grabbing",
        task.hasActiveTimer && "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
      )}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h3 className="font-medium leading-none">{task.title}</h3>
          {task.priority && (
            <Badge variant={task.priority === "HIGH" ? "destructive" : task.priority === "MEDIUM" ? "secondary" : "outline"}>
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
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {task.status && (
              <Badge variant="outline" className="text-xs">
                {task.status.replace('_', ' ')}
              </Badge>
            )}
            {task.hasActiveTimer && (
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <Clock className="h-3 w-3 animate-pulse" />
                <span className="text-xs font-medium">Active</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {(task.estimateMinutes || task.actualMinutes) && (
              <div className="flex items-center gap-1 text-xs">
                {task.actualMinutes ? (
                  <span>{task.actualMinutes}m</span>
                ) : null}
                {task.estimateMinutes && (
                  <span className="text-muted-foreground">/{task.estimateMinutes}m</span>
                )}
              </div>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 hover:bg-transparent"
              onClick={handleTimerToggle}
            >
              {task.hasActiveTimer ? (
                <Pause className="h-3 w-3 text-blue-600" />
              ) : (
                <Play className="h-3 w-3 text-green-600" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
