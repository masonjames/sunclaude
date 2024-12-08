'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { Task, TaskContextType, TaskStatus } from '@/types/task'
import { v4 as uuidv4 } from 'uuid'

const TaskContext = createContext<TaskContextType | undefined>(undefined)

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([])

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