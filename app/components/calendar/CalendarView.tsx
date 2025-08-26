"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { addDays, startOfWeek, format } from "date-fns"
import { DayView } from "./DayView"
import { WeekView } from "./WeekView"
import { cn } from "@/lib/utils"

type ViewType = "day" | "week"

interface CalendarViewProps {
  tasks: any[]
  onTaskUpdate?: (taskId: string, updates: any) => Promise<void>
}

export function CalendarView({ tasks, onTaskUpdate }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = React.useState(new Date())
  const [view, setView] = React.useState<ViewType>("week")

  const navigateDate = (direction: "prev" | "next") => {
    const increment = view === "day" ? 1 : 7
    setCurrentDate(prev => 
      direction === "prev" 
        ? addDays(prev, -increment)
        : addDays(prev, increment)
    )
  }

  const getDateRangeText = () => {
    if (view === "day") {
      return format(currentDate, "EEEE, MMMM d, yyyy")
    } else {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
      const weekEnd = addDays(weekStart, 6)
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
    }
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Calendar</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {getDateRangeText()}
          </span>
        </div>

        {/* View Toggle */}
        <div className="flex items-center rounded-md border p-1">
          <Button
            variant={view === "day" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("day")}
            className={cn(
              "h-7 px-3 text-xs",
              view === "day" && "bg-primary text-primary-foreground"
            )}
          >
            Day
          </Button>
          <Button
            variant={view === "week" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("week")}
            className={cn(
              "h-7 px-3 text-xs",
              view === "week" && "bg-primary text-primary-foreground"
            )}
          >
            Week
          </Button>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-hidden">
        {view === "day" ? (
          <DayView 
            date={currentDate} 
            tasks={tasks}
            onTaskUpdate={onTaskUpdate}
          />
        ) : (
          <WeekView 
            weekStartDate={startOfWeek(currentDate, { weekStartsOn: 0 })}
            tasks={tasks}
            onTaskUpdate={onTaskUpdate}
          />
        )}
      </div>
    </div>
  )
}