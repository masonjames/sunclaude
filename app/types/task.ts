export interface Task {
  id: string
  title: string
  description?: string
  priority?: "low" | "medium" | "high"
  dueTime?: string
  date: string
  // Extended fields for planning workflow
  status?: "backlog" | "planned" | "scheduled" | "in_progress" | "done" | "deferred"
  estimateMinutes?: number
  actualMinutes?: number
  scheduledStart?: string // ISO datetime
  scheduledEnd?: string   // ISO datetime
}

export type TaskStatus = Task["status"]
export type TaskPriority = Task["priority"]