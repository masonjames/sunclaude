"use client"

import * as React from "react"
import { format, addDays, isSameDay, parseISO } from "date-fns"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Task } from "@/types/task"

interface WeekViewProps {
  weekStartDate: Date
  tasks: Task[]
  onTaskUpdate?: (taskId: string, updates: any) => Promise<void>
}

interface TimeSlot {
  hour: number
  minute: number
  time: string
  displayTime: string
}

export function WeekView({ weekStartDate, tasks, onTaskUpdate }: WeekViewProps) {
  // Generate time slots from 6 AM to 10 PM
  const timeSlots = React.useMemo(() => {
    const slots: TimeSlot[] = []
    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 60) { // Hourly slots for week view
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const displayTime = new Date(2000, 0, 1, hour, minute).toLocaleTimeString('en-US', {
          hour: 'numeric',
          hour12: true
        })
        slots.push({ hour, minute, time, displayTime })
      }
    }
    return slots
  }, [])

  // Generate week days
  const weekDays = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i))
  }, [weekStartDate])

  // Group tasks by date
  const tasksByDate = React.useMemo(() => {
    const grouped: Record<string, Task[]> = {}
    
    weekDays.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd')
      grouped[dateKey] = tasks.filter(task => {
        if (!task.date) return false
        try {
          const taskDate = parseISO(task.date)
          return isSameDay(taskDate, day)
        } catch {
          return task.date === dateKey
        }
      })
    })
    
    return grouped
  }, [tasks, weekDays])

  // Group tasks by time and date
  const tasksByTimeAndDate = React.useMemo(() => {
    const grouped: Record<string, Record<string, Task[]>> = {}
    
    timeSlots.forEach(slot => {
      grouped[slot.time] = {}
      weekDays.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd')
        const dayTasks = tasksByDate[dateKey] || []
        grouped[slot.time][dateKey] = dayTasks.filter(task => 
          task.scheduledStart && task.scheduledStart.startsWith(slot.time.substring(0, 2))
        )
      })
    })
    
    return grouped
  }, [timeSlots, weekDays, tasksByDate])

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

  const isToday = (date: Date) => {
    return isSameDay(date, new Date())
  }

  return (
    <div className="h-full overflow-auto">
      <div className="min-w-[800px]">
        {/* Header with days */}
        <div className="sticky top-0 z-10 bg-white border-b">
          <div className="flex">
            {/* Time column header */}
            <div className="w-20 border-r bg-gray-50 p-2"></div>
            
            {/* Day headers */}
            {weekDays.map((day) => (
              <div
                key={format(day, 'yyyy-MM-dd')}
                className={cn(
                  "flex-1 min-w-[100px] border-r p-2 text-center",
                  isToday(day) && "bg-primary/5"
                )}
              >
                <div className={cn(
                  "text-sm font-medium",
                  isToday(day) && "text-primary"
                )}>
                  {format(day, 'EEE')}
                </div>
                <div className={cn(
                  "text-lg font-semibold",
                  isToday(day) && "text-primary"
                )}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Time slots grid */}
        <div className="relative">
          {timeSlots.map((slot) => (
            <div
              key={slot.time}
              className="flex border-b border-gray-200 min-h-[60px]"
            >
              {/* Time label */}
              <div className="w-20 px-3 py-2 text-xs text-muted-foreground border-r bg-gray-50/50">
                {slot.displayTime}
              </div>
              
              {/* Day columns */}
              {weekDays.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd')
                const slotTasks = tasksByTimeAndDate[slot.time]?.[dateKey] || []
                
                return (
                  <div
                    key={dateKey}
                    className={cn(
                      "flex-1 min-w-[100px] border-r p-1 relative",
                      isToday(day) && "bg-primary/5"
                    )}
                  >
                    {slotTasks.map((task) => (
                      <Card
                        key={task.id}
                        className={cn(
                          "mb-1 p-1 cursor-pointer hover:shadow-sm transition-shadow text-xs",
                          getPriorityColor(task.priority),
                          task.status === 'DONE' && "opacity-60"
                        )}
                      >
                        <p className={cn(
                          "font-medium truncate text-xs",
                          task.status === 'DONE' && "line-through"
                        )}>
                          {task.title}
                        </p>
                        {task.scheduledEnd && (
                          <p className="text-xs text-muted-foreground">
                            {task.scheduledStart?.substring(0, 5)} - {task.scheduledEnd.substring(0, 5)}
                          </p>
                        )}
                      </Card>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* All-day / unscheduled tasks section */}
        <div className="border-t bg-gray-50/50">
          <div className="flex">
            <div className="w-20 px-3 py-2 text-xs text-muted-foreground border-r">
              All day
            </div>
            {weekDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const allDayTasks = (tasksByDate[dateKey] || []).filter(task => !task.scheduledStart)
              
              return (
                <div
                  key={dateKey}
                  className={cn(
                    "flex-1 min-w-[100px] border-r p-1",
                    isToday(day) && "bg-primary/10"
                  )}
                >
                  {allDayTasks.map((task) => (
                    <Card
                      key={task.id}
                      className={cn(
                        "mb-1 p-1 cursor-pointer hover:shadow-sm transition-shadow text-xs",
                        getPriorityColor(task.priority),
                        task.status === 'DONE' && "opacity-60"
                      )}
                    >
                      <p className={cn(
                        "font-medium truncate text-xs",
                        task.status === 'DONE' && "line-through"
                      )}>
                        {task.title}
                      </p>
                    </Card>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}