"use client"

import { useTaskContext } from '@/context/task-context'
import { TaskColumn as TaskColumnComponent } from './TaskColumn'
import { CreateTaskDialog } from './CreateTaskDialog'
import { TaskColumn, TaskStatus } from '@/types/task'
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd'
import { Plus } from 'lucide-react'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'todo', title: 'To Do' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'done', title: 'Done' },
]

export const TaskBoard = () => {
  const { tasks, moveTask } = useTaskContext()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const sourceColumn = result.source.droppableId as TaskStatus
    const destinationColumn = result.destination.droppableId as TaskStatus
    const taskId = result.draggableId

    if (sourceColumn !== destinationColumn) {
      moveTask(taskId, destinationColumn)
    }
  }

  const getColumnTasks = (columnId: TaskStatus): TaskColumn => {
    return {
      id: columnId,
      tasks: tasks.filter(task => task.status === columnId)
    }
  }

  return (
    <main className="flex flex-col overflow-hidden bg-muted/10">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <h2 className="text-lg font-semibold">Today's Plan</h2>
        <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </header>
      <DragDropContext onDragEnd={handleDragEnd}>
        <ScrollArea className="flex-1">
          <div className="grid h-full grid-cols-3 divide-x">
            {COLUMNS.map((column) => (
              <Droppable key={column.id} droppableId={column.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="h-full p-4"
                  >
                    <TaskColumnComponent
                      title={column.title}
                      column={getColumnTasks(column.id)}
                    />
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </ScrollArea>
      </DragDropContext>
    </main>
    <CreateTaskDialog
      open={isCreateDialogOpen}
      onOpenChange={setIsCreateDialogOpen}
    />
  )
} 