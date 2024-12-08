export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'todo' | 'in-progress' | 'done'

export interface Task {
  id: string
  title: string
  description?: string
  priority: TaskPriority
  status: TaskStatus
  dueDate?: Date
  createdAt: Date
  updatedAt: Date
  assignedTo?: string
  labels?: string[]
}

export interface TaskColumn {
  id: TaskStatus
  title: string
  tasks: Task[]
}

export interface TaskContextType {
  tasks: Task[]
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateTask: (id: string, task: Partial<Task>) => void
  deleteTask: (id: string) => void
  moveTask: (taskId: string, sourceStatus: TaskStatus, targetStatus: TaskStatus) => void
}