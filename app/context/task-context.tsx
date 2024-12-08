'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { Task, TaskContextType, TaskStatus } from '@/types/task'
import { v4 as uuidv4 } from 'uuid'

const TaskContext = createContext<TaskContextType | undefined>(undefined)
const STORAGE_KEY = 'sunclaude:tasks'

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isHydrated, setIsHydrated] = useState(false)

  // Load tasks from localStorage on mount
  useEffect(() => {
    const storedTasks = localStorage.getItem(STORAGE_KEY)
    if (storedTasks) {
      try {
        const parsedTasks = JSON.parse(storedTasks)
        setTasks(parsedTasks.map((task: any) => ({
          ...task,
          dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt),
        })))
      } catch (error) {
        console.error('Error parsing stored tasks:', error)
      }
    }
    setIsHydrated(true)
  }, [])

  // Update localStorage when tasks change
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
    }
  }, [tasks, isHydrated])

  const addTask = useCallback((taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTask: Task = {
      ...taskData,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setTasks(prev => [...prev, newTask])
  }, [])

  const updateTask = useCallback((id: string, updatedFields: Partial<Task>) => {
    setTasks(prev => prev.map(task =>
      task.id === id
        ? { ...task, ...updatedFields, updatedAt: new Date() }
        : task
    ))
  }, [])

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id))
  }, [])

  const moveTask = useCallback((
    taskId: string,
    sourceStatus: TaskStatus,
    targetStatus: TaskStatus
  ) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId
        ? { ...task, status: targetStatus, updatedAt: new Date() }
        : task
    ))
  }, [])

  return (
    <TaskContext.Provider value={{
      tasks,
      addTask,
      updateTask,
      deleteTask,
      moveTask,
      isHydrated,
    }}>
      {children}
    </TaskContext.Provider>
  )
}

export function useTaskContext() {
  const context = useContext(TaskContext)
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider')
  }
  return context
}