"use client"

import * as React from "react"
import { format, isSameDay, parseISO, addMinutes } from "date-fns"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Task } from "@/types/task"

interface DayViewProps {
  date: Date
  tasks: Task[]
  onTaskUpdate?: (taskId: string, updates: any) => Promise<void>
}

interface TimeSlot {
  hour: number
  minute: number
  time: string
  displayTime: string
}

export function DayView({ date, tasks, onTaskUpdate }: DayViewProps) {
  // Generate time slots from 6 AM to 10 PM
  const timeSlots = React.useMemo(() => {
    const slots: TimeSlot[] = []
    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const displayTime = new Date(2000, 0, 1, hour, minute).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
        slots.push({ hour, minute, time, displayTime })
      }
    }
    return slots
  }, [])

  // Filter tasks for this date
  const dayTasks = React.useMemo(() => {
    return tasks.filter(task => {
      if (!task.date) return false
      try {
        const taskDate = parseISO(task.date)
        return isSameDay(taskDate, date)
      } catch {
        return task.date === format(date, 'yyyy-MM-dd')
      }
    })
  }, [tasks, date])

  // Group tasks by time slot
  const tasksByTime = React.useMemo(() => {
    const grouped: Record<string, Task[]> = {}
    
    dayTasks.forEach(task => {
      if (task.scheduledStart) {
        const timeStr = task.scheduledStart.substring(0, 5) // HH:MM format
        if (!grouped[timeStr]) {
          grouped[timeStr] = []
        }
        grouped[timeStr].push(task)
      }
    })
    
    return grouped
  }, [dayTasks])

  // Unscheduled tasks (no specific time)
  const unscheduledTasks = dayTasks.filter(task => !task.scheduledStart)

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 border-red-300 text-red-800'
      case 'medium':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      case 'low':
        return 'bg-green-100 border-green-300 text-green-800'
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  const formatDuration = (minutes?: number) => {
    if (!minutes) return ''
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    }
    return `${mins}m`
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main Calendar Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative">
          {/* Time slots */}
          {timeSlots.map((slot) => {
            const slotTasks = tasksByTime[slot.time] || []
            const isHourMark = slot.minute === 0
            
            return (
              <div
                key={slot.time}
                className={cn(
                  "flex border-r",
                  isHourMark ? "border-b border-gray-200" : "border-b border-gray-100",
                  "min-h-[50px]"
                )}
              >
                {/* Time label */}
                <div className={cn(
                  "w-20 px-3 py-2 text-xs text-muted-foreground border-r bg-gray-50/50",
                  !isHourMark && "text-gray-400"
                )}>
                  {isHourMark && slot.displayTime}
                </div>
                
                {/* Task area */}
                <div className="flex-1 p-2 relative">
                  {slotTasks.map((task) => (
                    <Card
                      key={task.id}
                      className={cn(
                        "mb-1 p-2 cursor-pointer hover:shadow-sm transition-shadow",
                        getPriorityColor(task.priority),
                        task.status === 'DONE' && "opacity-60"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            task.status === 'DONE' && "line-through"
                          )}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {task.estimateMinutes && (
                              <span className="text-xs px-1.5 py-0.5 bg-white/50 rounded">
                                {formatDuration(task.estimateMinutes)}
                              </span>
                            )}
                            {task.scheduledEnd && (
                              <span className="text-xs text-muted-foreground">
                                - {task.scheduledEnd.substring(0, 5)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Unscheduled Tasks Sidebar */}
      {unscheduledTasks.length > 0 && (
        <div className="w-64 border-l bg-gray-50/50 p-4 overflow-y-auto">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Unscheduled Tasks
          </h3>
          <div className="space-y-2">
            {unscheduledTasks.map((task) => (
              <Card
                key={task.id}
                className={cn(
                  "p-3 cursor-pointer hover:shadow-sm transition-shadow",
                  getPriorityColor(task.priority),
                  task.status === 'DONE' && "opacity-60"
                )}
              >
                <p className={cn(
                  "text-sm font-medium",
                  task.status === 'DONE' && "line-through"
                )}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {task.description}
                  </p>
                )}
                {task.estimateMinutes && (
                  <div className="mt-2">
                    <span className="text-xs px-1.5 py-0.5 bg-white/50 rounded">
                      {formatDuration(task.estimateMinutes)}
                    </span>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}