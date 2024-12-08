'use client'

import { Task, TaskPriority } from '@/types/task'
import { cn } from '@/lib/utils'
import { Calendar, Flag } from 'lucide-react'
import { format } from 'date-fns'
import { useTaskContext } from '@/context/task-context'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from './ui/context-menu'

const priorityStyles: Record<TaskPriority, string> = {
  low: 'bg-[hsl(var(--priority-low))]',
  medium: 'bg-[hsl(var(--priority-medium))]',
  high: 'bg-[hsl(var(--priority-high))]',
}

interface TaskCardProps {
  task: Task
}

export function TaskCard({ task }: TaskCardProps) {
  const { deleteTask } = useTaskContext()

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div className="rounded-lg border bg-[hsl(var(--task-card-background))] hover:bg-[hsl(var(--task-card-hover))] border-[hsl(var(--task-card-border))] p-3 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{task.title}</span>
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                priorityStyles[task.priority]
              )}
            />
          </div>
          
          {task.description && (
            <p className="mt-2 text-xs text-muted-foreground">
              {task.description}
            </p>
          )}
          
          {task.dueDate && (
            <div className="mt-2 flex items-center text-xs text-muted-foreground">
              <Calendar className="mr-1 h-3 w-3" />
              <span>{format(task.dueDate, 'MMM d')}</span>
            </div>
          )}
          
          {task.labels?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {task.labels.map(label => (
                <span
                  key={label}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-xs"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      </ContextMenuTrigger>
      
      <ContextMenuContent>
        <ContextMenuItem onClick={() => deleteTask(task.id)}>
          Delete Task
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}