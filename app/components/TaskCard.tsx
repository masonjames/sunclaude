"use client"

import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Play, Pause, Clock } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Task } from "@/types/task"

interface TaskCardProps {
  task: Task
  onTimerToggle?: () => void
  overlay?: boolean
}

export function TaskCard({ task, onTimerToggle, overlay }: TaskCardProps) {
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
  
  const { toast } = useToast()
  const [isTimerActive, setIsTimerActive] = useState(task.hasActiveTimer || false)
  const [isLoading, setIsLoading] = useState(false)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleTimerToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsLoading(true)
    
    try {
      if (isTimerActive) {
        // Stop timer
        const response = await fetch(`/api/tasks/${task.id}/timer/stop`, {
          method: 'POST',
        })
        
        if (response.ok) {
          setIsTimerActive(false)
          toast({
            title: "Timer stopped",
            description: `Timer stopped for "${task.title}"`,
          })
        }
      } else {
        // Start timer
        const response = await fetch(`/api/tasks/${task.id}/timer/start`, {
          method: 'POST',
        })
        
        if (response.ok) {
          setIsTimerActive(true)
          toast({
            title: "Timer started",
            description: `Timer started for "${task.title}"`,
          })
        }
      }
      
      if (onTimerToggle) {
        onTimerToggle()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle timer",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      ref={!overlay ? setNodeRef : undefined}
      style={!overlay ? style : undefined}
      className={cn(
        "group relative rounded-lg border p-4 shadow-sm transition-all",
        isDragging && "z-50 scale-105 shadow-lg",
        overlay && "rotate-3 scale-105 shadow-2xl",
        "hover:border-foreground/20 dark:hover:border-foreground/30",
        task.status === 'in_progress' && "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
      )}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 
              className="font-medium leading-none cursor-grab active:cursor-grabbing"
              {...(!overlay ? attributes : {})}
              {...(!overlay ? listeners : {})}
            >
              {task.title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {task.priority && (
              <Badge 
                variant={
                  task.priority === 'high' ? 'destructive' : 
                  task.priority === 'medium' ? 'secondary' : 
                  'outline'
                }
              >
                {task.priority}
              </Badge>
            )}
          </div>
        </div>
        
        {task.description && (
          <p className="text-sm text-muted-foreground">{task.description}</p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {task.dueTime && (
              <p className="text-xs text-muted-foreground">Due: {task.dueTime}</p>
            )}
            {(task.estimateMinutes !== undefined && task.estimateMinutes > 0) && (
              <p className="text-xs text-muted-foreground">
                Est: {task.estimateMinutes}m | Actual: {task.actualMinutes || 0}m
              </p>
            )}
          </div>
          
          <Button
            size="sm"
            variant={isTimerActive ? "secondary" : "outline"}
            onClick={handleTimerToggle}
            disabled={isLoading}
            className="ml-2"
          >
            {isTimerActive ? (
              <>
                <Pause className="h-3 w-3 mr-1" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-3 w-3 mr-1" />
                Start
              </>
            )}
          </Button>
        </div>
        
        {task.scheduledStart && task.scheduledEnd && (
          <div className="flex items-center text-xs text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            Scheduled: {new Date(task.scheduledStart).toLocaleTimeString()} - {new Date(task.scheduledEnd).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  )
}