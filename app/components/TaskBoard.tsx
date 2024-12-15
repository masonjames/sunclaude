"use client"

import * as React from "react"
import { Plus } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { TaskCard } from "@/components/TaskCard"
import { TaskColumn } from "@/components/TaskColumn"
import { AddTaskDialog } from "@/components/AddTaskDialog"
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
import { addDays, parseISO } from "date-fns"

interface Task {
  id: string
  title: string
  description?: string
  priority?: "low" | "medium" | "high"
  dueTime?: string
  date: string
}

export const TaskBoard = () => {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [loading, setLoading] = React.useState(true)
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [activeTask, setActiveTask] = React.useState<Task | null>(null)
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  )

  // Fetch tasks on mount
  React.useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch('/api/tasks')
        const data = await response.json()
        setTasks(data)
      } catch (error) {
        console.error('Error fetching tasks:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchTasks()
  }, [])

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)

    if (active.data.current?.type === 'integration') {
      setActiveTask(active.data.current.item)
    } else {
      const draggedTask = tasks.find(task => task.id === active.id)
      setActiveTask(draggedTask || null)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      setActiveTask(null)
      return
    }

    const overDate = over.id as string // This will be the ISO date string

    if (active.data.current?.type === 'integration') {
      // Handle dropping an integration item
      const integrationItem = active.data.current.item
      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: integrationItem.title,
            description: integrationItem.description,
            priority: integrationItem.priority,
            date: overDate,
            dueTime: integrationItem.dueDate?.includes('T') 
              ? integrationItem.dueDate.split('T')[1].substring(0, 5)
              : undefined,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to create task')
        }

        const newTask = await response.json()
        setTasks([...tasks, newTask])
      } catch (error) {
        console.error('Error creating task:', error)
      }
    } else {
      // Handle moving an existing task
      const activeTask = tasks.find(task => task.id === active.id)

      if (activeTask && activeTask.date !== overDate) {
        // Optimistically update the UI
        const updatedTasks = tasks.map(task =>
          task.id === activeTask.id
            ? { ...task, date: overDate }
            : task
        )
        setTasks(updatedTasks)

        // Update the server
        try {
          const response = await fetch('/api/tasks', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: activeTask.id,
              date: overDate,
            }),
          })

          if (!response.ok) {
            // If the server update fails, revert the UI
            setTasks(tasks)
            console.error('Failed to update task')
          }
        } catch (error) {
          // If there's a network error, revert the UI
          setTasks(tasks)
          console.error('Error updating task:', error)
        }
      }
    }

    setActiveId(null)
    setActiveTask(null)
  }

  const dates = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i))

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading tasks...</p>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full flex-col overflow-hidden bg-background">
        <header className="flex h-14 items-center justify-between border-b px-6">
          <h2 className="text-lg font-semibold">Task Board</h2>
          <AddTaskDialog onTaskAdded={() => {
            const fetchTasks = async () => {
              try {
                const response = await fetch('/api/tasks')
                const data = await response.json()
                setTasks(data)
              } catch (error) {
                console.error('Error fetching tasks:', error)
              } finally {
                setLoading(false)
              }
            }
            fetchTasks()
          }} />
        </header>
        <ScrollArea className="h-[calc(100vh-3.5rem)]" orientation="horizontal">
          <div className="flex min-h-full">
            {dates.map(date => {
              const dateStr = date.toISOString().split('T')[0]
              const dayTasks = tasks.filter(task => task.date === dateStr)
              
              return (
                <TaskColumn key={dateStr} date={date} tasks={dayTasks}>
                  {dayTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </TaskColumn>
              )
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
      <DragOverlay>
        {activeTask && (
          <TaskCard task={activeTask} />
        )}
      </DragOverlay>
    </DndContext>
  )
}