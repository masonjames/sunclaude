import { useCallback } from 'react'
import { useTaskStore } from '@/stores/task-store'
import { Task, TaskStatus } from '@/types/task'
import { format, addDays, subDays } from 'date-fns'

export function useTaskApi() {
  // Get store actions and data, but don't use them as dependencies
  const store = useTaskStore()

  const fetchTasks = useCallback(async (startDate?: Date, endDate?: Date) => {
    const currentStore = useTaskStore.getState()
    const start = startDate || currentStore.visibleDateRange.start
    const end = endDate || currentStore.visibleDateRange.end

    try {
      currentStore.setLoading(true)
      currentStore.setError(null)

      const params = new URLSearchParams({
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd'),
      })

      const response = await fetch(`/api/tasks?${params}`)
      if (!response.ok) throw new Error('Failed to fetch tasks')

      const serverTasks = await response.json()
      
      // Merge with existing tasks to avoid overwriting optimistic updates
      const existingTasks = currentStore.tasks.filter(t => currentStore.isOperationPending(t.id))
      const filteredServerTasks = serverTasks.filter((t: Task) => !currentStore.isOperationPending(t.id))
      
      currentStore.setTasks([...existingTasks, ...filteredServerTasks])
      currentStore.markSynced()
    } catch (error) {
      currentStore.setError(error instanceof Error ? error.message : 'Failed to fetch tasks')
    } finally {
      currentStore.setLoading(false)
    }
  }, [])

  const createTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const currentStore = useTaskStore.getState()
    return currentStore.addTaskOptimistic(taskData)
  }, [])

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    const currentStore = useTaskStore.getState()
    return currentStore.updateTaskOptimistic(id, updates)
  }, [])

  const deleteTask = useCallback(async (id: string) => {
    const currentStore = useTaskStore.getState()
    return currentStore.deleteTaskOptimistic(id)
  }, [])

  const reorderTasks = useCallback(async (taskIds: string[], targetDate: string, targetStatus: TaskStatus) => {
    const currentStore = useTaskStore.getState()
    return currentStore.reorderTasksOptimistic(taskIds, targetDate, targetStatus)
  }, [])

  const expandDateRange = useCallback(async (direction: 'past' | 'future', days = 30) => {
    const currentStore = useTaskStore.getState()
    const currentRange = currentStore.visibleDateRange
    
    if (direction === 'past') {
      const newStart = subDays(currentRange.start, days)
      await fetchTasks(newStart, currentRange.start)
      currentStore.expandDateRange('past', days)
    } else {
      const newEnd = addDays(currentRange.end, days)
      await fetchTasks(currentRange.end, newEnd)
      currentStore.expandDateRange('future', days)
    }
  }, [fetchTasks])

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