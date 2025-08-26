import { useCallback } from 'react'
import { useTaskStore } from '@/stores/task-store'
import { Task, TaskStatus } from '@/types/task'
import { format, addDays, subDays } from 'date-fns'

export function useTaskApi() {
  const store = useTaskStore()

  const fetchTasks = useCallback(async (startDate?: Date, endDate?: Date) => {
    const start = startDate || store.visibleDateRange.start
    const end = endDate || store.visibleDateRange.end

    try {
      store.setLoading(true)
      store.setError(null)

      const params = new URLSearchParams({
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd'),
      })

      const response = await fetch(`/api/tasks?${params}`)
      if (!response.ok) throw new Error('Failed to fetch tasks')

      const tasks = await response.json()
      
      // Merge with existing tasks to avoid overwriting optimistic updates
      const existingTasks = store.tasks.filter(t => store.isOperationPending(t.id))
      const serverTasks = tasks.filter((t: Task) => !store.isOperationPending(t.id))
      
      store.setTasks([...existingTasks, ...serverTasks])
      store.markSynced()
    } catch (error) {
      store.setError(error instanceof Error ? error.message : 'Failed to fetch tasks')
    } finally {
      store.setLoading(false)
    }
  }, [store])

  const createTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    return store.addTaskOptimistic(taskData)
  }, [store])

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    return store.updateTaskOptimistic(id, updates)
  }, [store])

  const deleteTask = useCallback(async (id: string) => {
    return store.deleteTaskOptimistic(id)
  }, [store])

  const reorderTasks = useCallback(async (taskIds: string[], targetDate: string, targetStatus: TaskStatus) => {
    return store.reorderTasksOptimistic(taskIds, targetDate, targetStatus)
  }, [store])

  const expandDateRange = useCallback(async (direction: 'past' | 'future', days = 30) => {
    const currentRange = store.visibleDateRange
    
    if (direction === 'past') {
      const newStart = subDays(currentRange.start, days)
      await fetchTasks(newStart, currentRange.start)
      store.expandDateRange('past', days)
    } else {
      const newEnd = addDays(currentRange.end, days)
      await fetchTasks(currentRange.end, newEnd)
      store.expandDateRange('future', days)
    }
  }, [store, fetchTasks])

  const refreshTasks = useCallback(async () => {
    await fetchTasks()
  }, [fetchTasks])

  return {
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    reorderTasks,
    expandDateRange,
    refreshTasks,
    loading: store.loading,
    error: store.error,
  }
}