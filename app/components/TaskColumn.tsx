'use client'

import { Task, TaskStatus } from '@/types/task'
import { Droppable, Draggable } from '@hello-pangea/dnd'
import { TaskCard } from './TaskCard'
import { ScrollArea } from './ui/scroll-area'

interface TaskColumnProps {
  id: TaskStatus
  title: string
  tasks: Task[]
}

export function TaskColumn({ id, title, tasks }: TaskColumnProps) {
  return (
    <div className="flex h-full w-full flex-col rounded-lg bg-muted/50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-medium">{title}</h3>
        <span className="rounded-full bg-background px-2 py-1 text-xs">
          {tasks.length}
        </span>
      </div>
      
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <ScrollArea className="h-full">
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex flex-col gap-2"
            >
              {tasks.map((task, index) => (
                <Draggable key={task.id} draggableId={task.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <TaskCard task={task} />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          </ScrollArea>
        )}
      </Droppable>
    </div>
  )
}