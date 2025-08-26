import { create } from 'zustand'
import { subscribeWithSelector, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { Task, TaskStatus, TaskPriority } from '@/types/task'
import { addDays, subDays, format, parseISO } from 'date-fns'

// Toast notification interface (to be used when Toast context is available)
interface ToastNotification {
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  warning: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

// Global toast instance (will be set by provider)
let globalToast: ToastNotification | null = null

export function setGlobalToast(toast: ToastNotification) {
  globalToast = toast
}

// Retry mechanism helpers
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      
      if (attempt === maxRetries) {
        globalToast?.error('Operation failed', `Failed after ${maxRetries} attempts: ${lastError.message}`)
        throw lastError
      }
      
      // Exponential backoff
      const backoffDelay = delay * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, backoffDelay))
      
      if (attempt > 1) {
        globalToast?.info('Retrying...', `Attempt ${attempt} of ${maxRetries}`)
      }
    }
  }
  
  throw lastError!
}

interface TaskFilters {
  status?: TaskStatus[]
  priority?: TaskPriority[]
  search?: string
  dateRange?: { start: Date; end: Date }
}

interface TaskStore {
  // State
  tasks: Task[]
  loading: boolean
  error: string | null
  filters: TaskFilters
  visibleDateRange: { start: Date; end: Date }
  optimisticOperations: Set<string>
  lastSync: Date | null
  _taskStats: { total: number; completed: number; inProgress: number; planned: number } | null
  
  // Basic Actions
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Optimistic Actions
  addTaskOptimistic: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>, tempId?: string) => Promise<Task>
  updateTaskOptimistic: (id: string, updates: Partial<Task>) => Promise<Task>
  deleteTaskOptimistic: (id: string) => Promise<void>
  reorderTasksOptimistic: (taskIds: string[], targetDate: string, targetStatus: TaskStatus) => Promise<void>
  
  // Filtered Data Selectors
  getTasksByDate: (date: string) => Task[]
  getTasksByDateAndStatus: (date: string, status: TaskStatus) => Task[]
  getFilteredTasks: () => Task[]
  getTaskStats: () => { total: number; completed: number; inProgress: number; planned: number }
  
  // Date Range Management
  setVisibleDateRange: (range: { start: Date; end: Date }) => void
  expandDateRange: (direction: 'past' | 'future', days: number) => void
  
  // Filters
  setFilters: (filters: Partial<TaskFilters>) => void
  clearFilters: () => void
  
  // Sync Management
  markSynced: () => void
  isOperationPending: (id: string) => boolean
  
  // Utility Actions
  reset: () => void
  hydrate: (data: Partial<TaskStore>) => void
}

const DAYS_TO_LOAD = 30

// Helper function to generate optimistic task
const createOptimisticTask = (
  data: Omit<Task, 'id'>,
  tempId?: string
): Task => ({
  ...data,
  id: tempId || `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  sortOrder: data.sortOrder ?? 0,
  status: data.status || 'PLANNED',
  priority: data.priority || 'MEDIUM',
})

export const useTaskStore = create<TaskStore>()(
  persist(
    subscribeWithSelector(
      immer((set, get) => ({
      // Initial State
      tasks: [],
      loading: false,
      error: null,
      filters: {},
      visibleDateRange: {
        start: subDays(new Date(), DAYS_TO_LOAD),
        end: addDays(new Date(), DAYS_TO_LOAD)
      },
      optimisticOperations: new Set(),
      lastSync: null,

      // Basic Actions
      setTasks: (tasks) => set((state) => {
        state.tasks = tasks
        state.lastSync = new Date()
        state._taskStats = null // Clear cache
      }),

      addTask: (task) => set((state) => {
        state.tasks.push(task)
        state._taskStats = null // Clear cache
      }),

      updateTask: (id, updates) => set((state) => {
        const index = state.tasks.findIndex(t => t.id === id)
        if (index !== -1) {
          state.tasks[index] = { ...state.tasks[index], ...updates }
          state._taskStats = null // Clear cache
        }
      }),

      deleteTask: (id) => set((state) => {
        state.tasks = state.tasks.filter(t => t.id !== id)
        state._taskStats = null // Clear cache
      }),

      setLoading: (loading) => set((state) => {
        state.loading = loading
      }),

      setError: (error) => set((state) => {
        state.error = error
      }),

      // Optimistic Actions
      addTaskOptimistic: async (taskData, tempId) => {
        const optimisticTask = createOptimisticTask(taskData, tempId)
        const opId = `add_${optimisticTask.id}`
        
        // Add optimistically
        set((state) => {
          state.tasks.push(optimisticTask)
          state.optimisticOperations.add(opId)
        })

        try {
          const serverTask = await withRetry(async () => {
            const response = await fetch('/api/tasks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: taskData.title,
                description: taskData.description,
                priority: taskData.priority,
                status: taskData.status,
                plannedDate: taskData.date,
                scheduledStart: taskData.scheduledStart,
                scheduledEnd: taskData.scheduledEnd,
                estimateMinutes: taskData.estimateMinutes,
                sortOrder: taskData.sortOrder,
              }),
            })

            if (!response.ok) throw new Error(`Failed to create task: ${response.status}`)
            return await response.json()
          })

          // Replace optimistic task with server task
          set((state) => {
            const index = state.tasks.findIndex(t => t.id === optimisticTask.id)
            if (index !== -1) {
              state.tasks[index] = serverTask
            }
            state.optimisticOperations.delete(opId)
          })

          globalToast?.success('Task created', `"${taskData.title}" has been added to your tasks`)
          return serverTask
        } catch (error) {
          // Revert optimistic update
          set((state) => {
            state.tasks = state.tasks.filter(t => t.id !== optimisticTask.id)
            state.optimisticOperations.delete(opId)
            state.error = error instanceof Error ? error.message : 'Failed to create task'
          })
          throw error
        }
      },

      updateTaskOptimistic: async (id, updates) => {
        const opId = `update_${id}`
        const originalTask = get().tasks.find(t => t.id === id)
        if (!originalTask) throw new Error('Task not found')

        // Apply optimistically
        set((state) => {
          const index = state.tasks.findIndex(t => t.id === id)
          if (index !== -1) {
            state.tasks[index] = { ...state.tasks[index], ...updates }
          }
          state.optimisticOperations.add(opId)
        })

        try {
          const serverTask = await withRetry(async () => {
            const response = await fetch('/api/tasks', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, ...updates }),
            })

            if (!response.ok) throw new Error(`Failed to update task: ${response.status}`)
            return await response.json()
          })

          // Update with server response
          set((state) => {
            const index = state.tasks.findIndex(t => t.id === id)
            if (index !== -1) {
              state.tasks[index] = serverTask
            }
            state.optimisticOperations.delete(opId)
          })

          globalToast?.success('Task updated', `"${originalTask.title}" has been updated`)
          return serverTask
        } catch (error) {
          // Revert optimistic update
          set((state) => {
            const index = state.tasks.findIndex(t => t.id === id)
            if (index !== -1) {
              state.tasks[index] = originalTask
            }
            state.optimisticOperations.delete(opId)
            state.error = error instanceof Error ? error.message : 'Failed to update task'
          })
          throw error
        }
      },

      deleteTaskOptimistic: async (id) => {
        const opId = `delete_${id}`
        const originalTask = get().tasks.find(t => t.id === id)
        if (!originalTask) throw new Error('Task not found')

        // Remove optimistically
        set((state) => {
          state.tasks = state.tasks.filter(t => t.id !== id)
          state.optimisticOperations.add(opId)
        })

        try {
          await withRetry(async () => {
            const response = await fetch(`/api/tasks?id=${id}`, {
              method: 'DELETE',
            })

            if (!response.ok) throw new Error(`Failed to delete task: ${response.status}`)
          })

          set((state) => {
            state.optimisticOperations.delete(opId)
          })

          globalToast?.success('Task deleted', `"${originalTask.title}" has been removed`)
        } catch (error) {
          // Revert optimistic update
          set((state) => {
            state.tasks.push(originalTask)
            state.optimisticOperations.delete(opId)
            state.error = error instanceof Error ? error.message : 'Failed to delete task'
          })
          throw error
        }
      },

      reorderTasksOptimistic: async (taskIds, targetDate, targetStatus) => {
        const opId = `reorder_${targetDate}_${targetStatus}`
        const originalTasks = [...get().tasks]

        // Apply optimistic reordering
        set((state) => {
          const tasksToReorder = taskIds.map(id => state.tasks.find(t => t.id === id)!).filter(Boolean)
          
          // Update the tasks with new order, date, and status
          tasksToReorder.forEach((task, index) => {
            const taskIndex = state.tasks.findIndex(t => t.id === task.id)
            if (taskIndex !== -1) {
              state.tasks[taskIndex] = {
                ...state.tasks[taskIndex],
                date: targetDate,
                status: targetStatus,
                sortOrder: index
              }
            }
          })
          
          state.optimisticOperations.add(opId)
        })

        try {
          await withRetry(async () => {
            const response = await fetch('/api/tasks/reorder', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                taskIds,
                date: targetDate,
                status: targetStatus,
              }),
            })

            if (!response.ok) throw new Error(`Failed to reorder tasks: ${response.status}`)
          })

          set((state) => {
            state.optimisticOperations.delete(opId)
          })

          const taskCount = taskIds.length
          globalToast?.success('Tasks reordered', `${taskCount} task${taskCount > 1 ? 's' : ''} moved to ${targetStatus}`)
        } catch (error) {
          // Revert optimistic update
          set((state) => {
            state.tasks = originalTasks
            state.optimisticOperations.delete(opId)
            state.error = error instanceof Error ? error.message : 'Failed to reorder tasks'
          })
          throw error
        }
      },

      // Selectors
      getTasksByDate: (date) => {
        return get().tasks
          .filter(task => task.date === date)
          .sort((a, b) => {
            // Sort by status, then by sortOrder, then by creation time
            const statusOrder: Record<TaskStatus, number> = {
              BACKLOG: -1, PLANNED: 0, SCHEDULED: 1, IN_PROGRESS: 2, DONE: 3, DEFERRED: 4, CANCELED: 5
            }
            const statusDiff = statusOrder[a.status || 'PLANNED'] - statusOrder[b.status || 'PLANNED']
            if (statusDiff !== 0) return statusDiff
            
            const orderDiff = (a.sortOrder || 0) - (b.sortOrder || 0)
            if (orderDiff !== 0) return orderDiff
            
            return a.id.localeCompare(b.id) // Fallback to ID-based sorting
          })
      },

      getTasksByDateAndStatus: (date, status) => {
        return get().tasks
          .filter(task => task.date === date && task.status === status)
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      },

      getFilteredTasks: () => {
        const { tasks, filters } = get()
        let filtered = [...tasks]

        if (filters.status && filters.status.length > 0) {
          filtered = filtered.filter(task => filters.status!.includes(task.status || 'PLANNED'))
        }

        if (filters.priority && filters.priority.length > 0) {
          filtered = filtered.filter(task => filters.priority!.includes(task.priority || 'MEDIUM'))
        }

        if (filters.search) {
          const search = filters.search.toLowerCase()
          filtered = filtered.filter(task => 
            task.title.toLowerCase().includes(search) ||
            task.description?.toLowerCase().includes(search)
          )
        }

        if (filters.dateRange) {
          const { start, end } = filters.dateRange
          filtered = filtered.filter(task => {
            const taskDate = parseISO(task.date)
            return taskDate >= start && taskDate <= end
          })
        }

        return filtered
      },

      // Cached task stats to prevent infinite loops
      _taskStats: null as { total: number; completed: number; inProgress: number; planned: number } | null,
      
      getTaskStats: () => {
        const state = get()
        // Return cached stats if available and tasks haven't changed
        if (state._taskStats) {
          return state._taskStats
        }
        
        // Calculate fresh stats
        const tasks = state.tasks
        const stats = {
          total: tasks.length,
          completed: tasks.filter(t => t.status === 'DONE').length,
          inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
          planned: tasks.filter(t => t.status === 'PLANNED').length,
        }
        
        // Cache the stats
        set((state) => { state._taskStats = stats })
        return stats
      },

      // Clear cached stats when tasks change
      _clearStatsCache: () => set((state) => { state._taskStats = null }),

      // Date Range Management
      setVisibleDateRange: (range) => set((state) => {
        state.visibleDateRange = range
      }),

      expandDateRange: (direction, days) => set((state) => {
        if (direction === 'past') {
          state.visibleDateRange.start = subDays(state.visibleDateRange.start, days)
        } else {
          state.visibleDateRange.end = addDays(state.visibleDateRange.end, days)
        }
      }),

      // Filters
      setFilters: (newFilters) => set((state) => {
        state.filters = { ...state.filters, ...newFilters }
      }),

      clearFilters: () => set((state) => {
        state.filters = {}
      }),

      // Sync Management
      markSynced: () => set((state) => {
        state.lastSync = new Date()
        state.error = null
      }),

      isOperationPending: (id) => {
        const ops = get().optimisticOperations
        return Array.from(ops).some(op => op.includes(id))
      },

      // Utility Actions
      reset: () => set(() => ({
        tasks: [],
        loading: false,
        error: null,
        filters: {},
        optimisticOperations: new Set(),
        lastSync: null,
      })),

      hydrate: (data) => set((state) => {
        Object.assign(state, data)
      }),
    }))
    ),
    {
      name: 'task-store',
      // Only persist essential state, not transient data
      partialize: (state) => ({
        tasks: state.tasks,
        filters: state.filters,
        visibleDateRange: state.visibleDateRange,
        lastSync: state.lastSync,
        // Don't persist: loading, error, optimisticOperations, _taskStats
      }),
    }
  )
)

// Selector hooks for common use cases
export const useTasksByDate = (date: string) => useTaskStore(state => state.getTasksByDate(date))
export const useTasksByDateAndStatus = (date: string, status: TaskStatus) => 
  useTaskStore(state => state.getTasksByDateAndStatus(date, status))
export const useTaskStats = () => useTaskStore(state => state.getTaskStats())
export const useFilteredTasks = () => useTaskStore(state => state.getFilteredTasks())