export type TaskStatus = 'PLANNED' | 'SCHEDULED' | 'IN_PROGRESS' | 'DONE' | 'BACKLOG' | 'DEFERRED' | 'CANCELED'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface Task {
  id: string
  title: string
  description?: string
  priority?: TaskPriority
  dueTime?: string
  date: string // yyyy-MM-dd format for board filtering
  // Extended fields for planning workflow
  status: TaskStatus
  estimateMinutes?: number
  actualMinutes?: number
  scheduledStart?: string // ISO datetime
  scheduledEnd?: string   // ISO datetime
  sortOrder?: number
}

