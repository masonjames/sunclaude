"use client"

import * as React from "react"
import { Plus, Calendar } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { TaskCard } from "@/components/TaskCard"
import { TaskColumn, STATUS_LANES } from "@/components/TaskColumn"
import { AddTaskDialog } from "@/components/AddTaskDialog"
import { PlanningWizard } from "@/components/planning/PlanningWizard"
import { useApi } from "@/hooks/use-api"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { addDays, subDays, format, parseISO, isEqual } from "date-fns"
import { Task } from "@/types/task"

const DAYS_TO_LOAD = 30 // Number of days to load in each direction
const COLUMN_WIDTH = 360 // Width of each column in pixels (increased for lanes)

export const TaskBoard = () => {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [activeTask, setActiveTask] = React.useState<Task | null>(null)
  const [planningWizardOpen, setPlanningWizardOpen] = React.useState(false)
  const [selectedPlanningDate, setSelectedPlanningDate] = React.useState(new Date())
  const [visibleDateRange, setVisibleDateRange] = React.useState({
    start: subDays(new Date(), DAYS_TO_LOAD),
    end: addDays(new Date(), DAYS_TO_LOAD)
  })
  const { execute, loading } = useApi<Task[]>()
  
  // Helper functions for drag and drop
  const parseContainer = (containerId: string): { date: string; status?: string } => {
    const [date, status] = containerId.split('__')
    return { date, status }
  }

  const getTargetContainerId = (over: DragEndEvent['over']) => {
    // If over is a sortable item, containerId is in data.current.sortable.containerId
    const sortable = over?.data?.current?.sortable as any | undefined
    if (sortable?.containerId) return String(sortable.containerId)
    return typeof over?.id === 'string' ? over.id : undefined
  }

  const reindexLane = (items: Task[], insertAt: number, movedId: string, targetDate: string, targetStatus: string): { updated: Task[], orderedIds: string[] } => {
    const remaining = items.filter(t => t.id !== movedId)
    const before = remaining.slice(0, insertAt)
    const after = remaining.slice(insertAt)
    const newOrder = [...before.map(t => t.id), movedId, ...after.map(t => t.id)]
    const updated = newOrder.map((id, idx) => {
      const t = (id === movedId ? tasks.find(x => x.id === movedId)! : items.find(x => x.id === id)!)
      return { ...t, date: targetDate, status: targetStatus as any, sortOrder: idx }
    })
    return { updated, orderedIds: newOrder }
  }
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const fetchTasks = React.useCallback(async (start: Date, end: Date) => {
    const data = await execute(
      fetch('/api/tasks?' + new URLSearchParams({
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd')
      })),
      { 
        showSuccessToast: false,
        successMessage: 'Tasks loaded successfully'
      }
    )
    if (data) {
      setTasks(prevTasks => {
        // Merge new tasks with existing ones, removing duplicates
        const newTasks = [...prevTasks]
        data.forEach(task => {
          const existingIndex = newTasks.findIndex(t => t.id === task.id)
          if (existingIndex >= 0) {
            newTasks[existingIndex] = task
          } else {
            newTasks.push(task)
          }
        })
        return newTasks
      })
    }
  }, [execute])

  // Initial load and scroll to center
  React.useEffect(() => {
    fetchTasks(visibleDateRange.start, visibleDateRange.end)
    
    // Scroll to today's date after a brief delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (scrollRef.current) {
        const today = new Date()
        const todayStr = format(today, 'yyyy-MM-dd')
        
        // Find today's index in the allDates array
        let todayIndex = 0
        let currentDate = visibleDateRange.start
        while (currentDate <= visibleDateRange.end) {
          if (format(currentDate, 'yyyy-MM-dd') === todayStr) {
            break
          }
          todayIndex++
          currentDate = addDays(currentDate, 1)
        }
        
        const todayOffset = todayIndex * COLUMN_WIDTH
        scrollRef.current.scrollLeft = todayOffset
      }
    }, 100)
    
    return () => clearTimeout(timer)
  }, []) // Empty dependency array for initial load only

  // Handle scroll
  const handleScroll = React.useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget
    const scrollLeft = container.scrollLeft
    const containerWidth = container.clientWidth
    const scrollWidth = container.scrollWidth

    // Load more dates when approaching edges (within 20% of total width)
    const loadThreshold = containerWidth * 0.2

    if (scrollLeft < loadThreshold) {
      // Load more past dates
      const newStart = subDays(visibleDateRange.start, DAYS_TO_LOAD)
      const newEnd = visibleDateRange.start
      setVisibleDateRange(prev => ({
        start: newStart,
        end: prev.end
      }))
      fetchTasks(newStart, newEnd)
    } else if (scrollLeft + containerWidth > scrollWidth - loadThreshold) {
      // Load more future dates
      const newStart = visibleDateRange.end
      const newEnd = addDays(visibleDateRange.end, DAYS_TO_LOAD)
      setVisibleDateRange(prev => ({
        start: prev.start,
        end: newEnd
      }))
      fetchTasks(newStart, newEnd)
    }
  }, [visibleDateRange, fetchTasks])

  // Generate all dates in the visible range
  const allDates = React.useMemo(() => {
    const dates: Date[] = []
    let currentDate = visibleDateRange.start
    while (currentDate <= visibleDateRange.end) {
      dates.push(new Date(currentDate)) // Create new Date object each time
      currentDate = addDays(currentDate, 1)
    }
    return dates
  }, [visibleDateRange])

  const handleDragStart = React.useCallback((event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)

    if (active.data.current?.type === 'integration') {
      setActiveTask(active.data.current.item)
    } else {
      const draggedTask = tasks.find(task => task.id === active.id)
      setActiveTask(draggedTask || null)
    }
  }, [tasks])

  const handleDragEnd = React.useCallback(async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      setActiveTask(null)
      return
    }

    const containerId = getTargetContainerId(over)
    if (!containerId) {
      setActiveId(null)
      setActiveTask(null)
      return
    }

    const { date: targetDate, status: maybeStatus } = parseContainer(containerId)
    const targetStatus = maybeStatus || 'PLANNED'

    if (active.data.current?.type === 'integration') {
      // Handle integration item drops
      const integrationItem = active.data.current.item
      
      // Determine target index for proper ordering
      const targetLaneTasks = tasks
        .filter(t => t.date === targetDate && (t.status || 'PLANNED') === targetStatus)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      
      let targetIndex = targetLaneTasks.length // Default: append to end
      if (over?.data?.current?.sortable?.index != null) {
        targetIndex = over.data.current.sortable.index
      }

      const newTask = await execute<Task>(
        fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: integrationItem.title,
            description: integrationItem.description,
            priority: integrationItem.priority,
            date: targetDate,
            status: targetStatus,
            sortOrder: targetIndex,
            dueTime: integrationItem.dueDate?.includes('T') 
              ? integrationItem.dueDate.split('T')[1].substring(0, 5)
              : undefined,
          }),
        }),
        {
          successMessage: 'Task created successfully'
        }
      )

      if (newTask) {
        setTasks(prev => [...prev, newTask])
      }
    } else {
      // Handle task moves
      const activeTask = tasks.find(task => task.id === active.id)
      if (!activeTask) return

      // Determine target index
      const targetLaneTasks = tasks
        .filter(t => t.date === targetDate && (t.status || 'PLANNED') === targetStatus)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

      let targetIndex: number
      if (over?.data?.current?.sortable?.index != null) {
        // Dropped over a task; place before it
        targetIndex = over.data.current.sortable.index
      } else {
        // Dropped on lane or column; append to end
        targetIndex = targetLaneTasks.length
      }

      // Check if anything actually changed
      const dateChanged = activeTask.date !== targetDate
      const statusChanged = (activeTask.status || 'PLANNED') !== targetStatus
      const currentIndex = targetLaneTasks.findIndex(t => t.id === activeTask.id)
      const orderChanged = currentIndex >= 0 && currentIndex !== targetIndex

      if (dateChanged || statusChanged || orderChanged) {
        // Compute new ordering
        const { updated, orderedIds } = reindexLane(
          targetLaneTasks,
          targetIndex,
          activeTask.id,
          targetDate,
          targetStatus
        )

        // 1) Optimistic local state update
        setTasks(prev => {
          const mapped = prev.map(t => {
            const upd = updated.find(u => u.id === t.id)
            if (upd) return upd
            if (t.id === activeTask.id) return updated.find(u => u.id === t.id)! // ensure moved task is updated
            return t
          })
          return mapped
        })

        // 2) Persist via batch reorder endpoint
        try {
          const success = await execute(
            fetch('/api/tasks/reorder', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                date: targetDate,
                status: targetStatus,
                orderedIds
              })
            }),
            {
              successMessage: 'Tasks reordered'
            }
          )

          // Rollback on failure
          if (!success) {
            setTasks(prev => prev.map(task =>
              task.id === activeTask.id
                ? { 
                    ...task, 
                    date: activeTask.date,
                    status: activeTask.status,
                    sortOrder: activeTask.sortOrder
                  }
                : task
            ))
          }
        } catch (error) {
          // Fallback: individual task update if batch endpoint doesn't exist
          const success = await execute(
            fetch('/api/tasks', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                id: activeTask.id,
                date: targetDate,
                status: targetStatus,
                sortOrder: targetIndex,
              }),
            }),
            {
              successMessage: `Task moved to ${targetStatus.toLowerCase()}`
            }
          )

          if (!success) {
            // Rollback
            setTasks(prev => prev.map(task =>
              task.id === activeTask.id
                ? { 
                    ...task, 
                    date: activeTask.date,
                    status: activeTask.status,
                    sortOrder: activeTask.sortOrder
                  }
                : task
            ))
          }
        }
      }
    }

    setActiveId(null)
    setActiveTask(null)
  }, [execute, tasks, parseContainer, getTargetContainerId, reindexLane])

  const handleTaskAdded = React.useCallback(() => {
    fetchTasks(visibleDateRange.start, visibleDateRange.end)
  }, [fetchTasks, visibleDateRange])

  const handleOpenPlanningWizard = React.useCallback((date?: Date) => {
    if (date) {
      setSelectedPlanningDate(date)
    }
    setPlanningWizardOpen(true)
  }, [])

  const handlePlanCommitted = React.useCallback(() => {
    fetchTasks(visibleDateRange.start, visibleDateRange.end)
  }, [fetchTasks, visibleDateRange])

  const handleTimerToggle = React.useCallback(() => {
    // Refresh tasks to update timer status
    fetchTasks(visibleDateRange.start, visibleDateRange.end)
  }, [fetchTasks, visibleDateRange])

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-lg font-semibold">Task Board</h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleOpenPlanningWizard(new Date())}
            variant="outline"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Plan Day
          </Button>
          <AddTaskDialog onTaskAdded={handleTaskAdded} />
        </div>
      </div>
      <div className="h-full">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          collisionDetection={closestCorners}
        >
          <ScrollArea 
            className="h-[calc(100vh-10rem)] rounded-md border"
            onScroll={handleScroll}
          >
            <div 
              ref={scrollRef}
              className="flex gap-4 p-4"
              style={{ 
                width: `${allDates.length * COLUMN_WIDTH}px`,
                minWidth: '100%'
              }}
            >
              {allDates.map(date => {
                const dateStr = format(date, 'yyyy-MM-dd')
                const dayTasks = tasks.filter(task => task.date === dateStr)
                const isToday = isEqual(
                  new Date(dateStr),
                  new Date(new Date().toISOString().split('T')[0])
                )

                return (
                  <TaskColumn
                    key={dateStr}
                    date={date}
                    tasks={dayTasks}
                    isToday={isToday}
                    onTimerToggle={handleTimerToggle}
                  />
                )
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          <DragOverlay>
            {activeId && activeTask ? (
              <TaskCard
                task={activeTask}
                overlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
      
      <PlanningWizard
        open={planningWizardOpen}
        onClose={() => setPlanningWizardOpen(false)}
        selectedDate={selectedPlanningDate}
        onPlanCommitted={handlePlanCommitted}
      />
    </div>
  )
}