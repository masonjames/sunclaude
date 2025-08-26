"use client"

import * as React from "react"
import { Plus, Calendar, RefreshCw } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { TaskCard } from "@/components/TaskCard"
import { TaskColumn, STATUS_LANES } from "@/components/TaskColumn"
import { TaskStatus } from "@/types/task"
import { AddTaskDialog } from "@/components/AddTaskDialog"
import { PlanningWizard } from "@/components/planning/PlanningWizard"
import { TaskBoardSkeleton } from "@/components/skeletons/TaskCardSkeleton"
import { useTaskStore, useTasksByDate } from "@/stores/task-store"
import { useTaskApi } from "@/hooks/use-task-api"
import { useToastFeedback } from "@/hooks/use-toast-feedback"
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
import { addDays, subDays, format } from "date-fns"
import { Task } from "@/types/task"
import { cn } from "@/lib/utils"

const DAYS_TO_LOAD = 30
const COLUMN_WIDTH = 360

export const TaskBoardEnhanced = () => {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [activeTask, setActiveTask] = React.useState<Task | null>(null)
  const [planningWizardOpen, setPlanningWizardOpen] = React.useState(false)
  const [selectedPlanningDate, setSelectedPlanningDate] = React.useState(new Date())

  // Store and API hooks
  const { 
    tasks,
    visibleDateRange, 
    loading, 
    error,
    isOperationPending,
    setVisibleDateRange,
  } = useTaskStore()
  
  const { 
    fetchTasks, 
    reorderTasks, 
    expandDateRange,
    refreshTasks,
    createTask 
  } = useTaskApi()
  
  const { optimisticToast, error: showError, success: showSuccess } = useToastFeedback()

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  )

  // Helper functions for drag and drop
  const parseContainer = React.useCallback((containerId: string): { date: string; status?: string } => {
    const [date, status] = containerId.split('__')
    return { date, status }
  }, [])

  const getTargetContainerId = React.useCallback((over: DragEndEvent['over']) => {
    const sortable = over?.data?.current?.sortable as any | undefined
    if (sortable?.containerId) return String(sortable.containerId)
    return typeof over?.id === 'string' ? over.id : undefined
  }, [])

  // Initial load and scroll positioning
  React.useEffect(() => {
    fetchTasks()
    
    const timer = setTimeout(() => {
      if (scrollRef.current) {
        const today = new Date()
        const todayStr = format(today, 'yyyy-MM-dd')
        
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
  }, [fetchTasks, visibleDateRange])

  // Infinite scroll handler
  const handleScroll = React.useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget
    const scrollLeft = container.scrollLeft
    const containerWidth = container.clientWidth
    const scrollWidth = container.scrollWidth

    const loadThreshold = containerWidth * 0.2

    if (scrollLeft < loadThreshold && !loading) {
      expandDateRange('past', DAYS_TO_LOAD)
    } else if (scrollLeft + containerWidth > scrollWidth - loadThreshold && !loading) {
      expandDateRange('future', DAYS_TO_LOAD)
    }
  }, [expandDateRange, loading])

  // Generate visible dates
  const allDates = React.useMemo(() => {
    const dates: Date[] = []
    let currentDate = visibleDateRange.start
    while (currentDate <= visibleDateRange.end) {
      dates.push(currentDate)
      currentDate = addDays(currentDate, 1)
    }
    return dates
  }, [visibleDateRange])

  // Drag handlers
  const handleDragStart = React.useCallback((event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)

    if (active.data.current?.type === 'integration') {
      setActiveTask(active.data.current.item)
    } else {
      const tasks = useTaskStore.getState().tasks
      const draggedTask = tasks.find(task => task.id === active.id)
      setActiveTask(draggedTask || null)
    }
  }, [])

  const handleDragEnd = React.useCallback(async (event: DragEndEvent) => {
    const { active, over } = event

    setActiveId(null)
    setActiveTask(null)

    if (!over) return

    const containerId = getTargetContainerId(over)
    if (!containerId) return

    const { date: targetDate, status: maybeStatus } = parseContainer(containerId)
    const targetStatus = (maybeStatus || 'PLANNED') as TaskStatus

    try {
      if (active.data.current?.type === 'integration') {
        // Handle integration item drops
        const integrationItem = active.data.current.item
        
        await optimisticToast(
          () => createTask({
            title: integrationItem.title,
            description: integrationItem.description,
            priority: integrationItem.priority,
            date: targetDate,
            status: targetStatus,
            sortOrder: 0,
            dueTime: integrationItem.dueDate?.includes('T') 
              ? integrationItem.dueDate.split('T')[1].substring(0, 5)
              : undefined,
          }),
          {
            optimisticMessage: 'Task created',
            successMessage: `Task "${integrationItem.title}" added to ${targetStatus.toLowerCase()}`,
            errorMessage: 'Failed to create task',
            revertMessage: 'Task creation cancelled'
          }
        )
      } else {
        // Handle task reordering
        const tasks = useTaskStore.getState().tasks
        const activeTask = tasks.find(task => task.id === active.id)
        if (!activeTask) return

        const targetLaneTasks = tasks
          .filter(t => t.date === targetDate && (t.status || 'PLANNED') === targetStatus)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

        let targetIndex = targetLaneTasks.length
        if (over?.data?.current?.sortable?.index != null) {
          targetIndex = over.data.current.sortable.index
        }

        const dateChanged = activeTask.date !== targetDate
        const statusChanged = (activeTask.status || 'PLANNED') !== targetStatus
        const currentIndex = targetLaneTasks.findIndex(t => t.id === activeTask.id)
        const orderChanged = currentIndex >= 0 && currentIndex !== targetIndex

        if (dateChanged || statusChanged || orderChanged) {
          const taskIds = [...targetLaneTasks.map(t => t.id)]
          
          // Remove the active task from its current position
          const currentTaskIndex = taskIds.indexOf(activeTask.id)
          if (currentTaskIndex !== -1) {
            taskIds.splice(currentTaskIndex, 1)
          }
          
          // Insert at target position
          taskIds.splice(targetIndex, 0, activeTask.id)

          await optimisticToast(
            () => reorderTasks(taskIds, targetDate, targetStatus),
            {
              optimisticMessage: 'Task moved',
              successMessage: `Task moved to ${targetStatus.toLowerCase()}${dateChanged ? ` on ${format(new Date(targetDate), 'MMM d')}` : ''}`,
              errorMessage: 'Failed to move task',
              revertMessage: 'Task move cancelled'
            }
          )
        }
      }
    } catch (error) {
      // Error handling is done by optimisticToast
    }
  }, [getTargetContainerId, parseContainer, optimisticToast, createTask, reorderTasks])

  // Refresh handler
  const handleRefresh = React.useCallback(async () => {
    try {
      await optimisticToast(
        () => refreshTasks(),
        {
          optimisticMessage: 'Refreshing tasks...',
          successMessage: 'Tasks refreshed',
          errorMessage: 'Failed to refresh tasks'
        }
      )
    } catch (error) {
      // Error handled by toast
    }
  }, [optimisticToast, refreshTasks])

  // Show error toast for store errors
  React.useEffect(() => {
    if (error) {
      showError(error)
    }
  }, [error, showError])

  if (loading && useTaskStore.getState().tasks.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Task Board</h1>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                disabled
              >
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </Button>
            </div>
          </div>
        </div>
        <TaskBoardSkeleton columnCount={7} />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Task Board</h1>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button 
              size="sm"
              onClick={() => setPlanningWizardOpen(true)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Plan Day
            </Button>
          </div>
        </div>
      </div>

      {/* Task Board */}
      <div className="flex-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <ScrollArea 
            ref={scrollRef}
            className="h-full"
            onScroll={handleScroll}
          >
            <div className="flex gap-4 p-4" style={{ width: allDates.length * COLUMN_WIDTH }}>
              {allDates.map((date) => {
                const dateStr = format(date, 'yyyy-MM-dd')
                const isToday = dateStr === format(new Date(), 'yyyy-MM-dd')
                const dateTasks = tasks.filter(task => task.date === dateStr)
                
                return (
                  <div
                    key={dateStr}
                    className="flex-shrink-0"
                    style={{ width: COLUMN_WIDTH - 16 }}
                  >
                    <TaskColumn
                      date={date}
                      tasks={dateTasks}
                      isToday={isToday}
                    />
                  </div>
                )
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          
          <DragOverlay>
            {activeTask ? (
              <TaskCard task={activeTask} overlay />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Planning Wizard */}
      <PlanningWizard
        open={planningWizardOpen}
        onClose={() => setPlanningWizardOpen(false)}
        selectedDate={selectedPlanningDate}
        onPlanCommitted={() => {
          setPlanningWizardOpen(false)
          refreshTasks()
        }}
      />
    </div>
  )
}