"use client"

import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { useDraggable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"

interface IntegrationItem {
  id: string
  title: string
  description?: string
  dueDate?: string
  priority?: "low" | "medium" | "high"
}

interface IntegrationPanelProps {
  title: string
  items: IntegrationItem[]
  onAddToBoard: (item: IntegrationItem) => void
}

function IntegrationItemCard({ item, onAddToBoard }: { item: IntegrationItem; onAddToBoard: (item: IntegrationItem) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `integration-${item.id}`,
    data: {
      type: 'integration',
      item: item
    }
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "group relative rounded-lg border p-4 shadow-sm transition-all",
        "hover:border-foreground/20 dark:hover:border-foreground/30",
        "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
    >
      <div className="space-y-2">
        <h3 className="font-medium leading-none">{item.title}</h3>
        {item.description && (
          <p className="text-sm text-muted-foreground">{item.description}</p>
        )}
        {item.dueDate && (
          <p className="text-xs text-muted-foreground">Due: {item.dueDate}</p>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="w-full"
          onClick={() => onAddToBoard(item)}
        >
          Add to Board
        </Button>
      </div>
    </div>
  )
}

export function IntegrationPanel({ title, items, onAddToBoard }: IntegrationPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {items.map((item) => (
            <IntegrationItemCard
              key={item.id}
              item={item}
              onAddToBoard={onAddToBoard}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
