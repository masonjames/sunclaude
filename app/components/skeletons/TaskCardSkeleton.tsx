import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface TaskCardSkeletonProps {
  className?: string
  showPriority?: boolean
  compact?: boolean
}

export function TaskCardSkeleton({ 
  className, 
  showPriority = true, 
  compact = false 
}: TaskCardSkeletonProps) {
  return (
    <div className={cn(
      "rounded-lg border bg-card p-4 shadow-sm",
      compact && "p-3",
      className
    )}>
      <div className="space-y-3">
        {/* Title */}
        <Skeleton className={cn(
          "h-4 w-3/4",
          compact && "h-3"
        )} />
        
        {/* Description */}
        {!compact && (
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        )}
        
        {/* Footer with priority and time */}
        <div className="flex items-center justify-between">
          {showPriority && (
            <Skeleton className={cn(
              "h-5 w-16 rounded-full",
              compact && "h-4 w-12"
            )} />
          )}
          <Skeleton className={cn(
            "h-4 w-20",
            compact && "h-3 w-16"
          )} />
        </div>
      </div>
    </div>
  )
}

interface TaskColumnSkeletonProps {
  className?: string
  itemCount?: number
  title?: string
}

export function TaskColumnSkeleton({ 
  className, 
  itemCount = 3,
  title 
}: TaskColumnSkeletonProps) {
  return (
    <div className={cn("w-full min-h-[500px] rounded-lg border bg-muted/30 p-4", className)}>
      {/* Column Header */}
      <div className="mb-4 space-y-2">
        {title ? (
          <h3 className="font-semibold text-sm text-muted-foreground">{title}</h3>
        ) : (
          <Skeleton className="h-5 w-24" />
        )}
        <Skeleton className="h-px w-full" />
      </div>
      
      {/* Status Lanes */}
      <div className="space-y-6">
        {['Planned', 'Scheduled', 'In Progress', 'Done'].map((status, statusIndex) => (
          <div key={status} className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-6 rounded-full" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: Math.max(0, itemCount - statusIndex) }).map((_, i) => (
                <TaskCardSkeleton 
                  key={`${status}-${i}`} 
                  compact={i > 1} 
                  showPriority={i === 0}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TaskBoardSkeleton({ columnCount = 7 }: { columnCount?: number }) {
  return (
    <div className="flex gap-4 p-4 overflow-x-auto">
      {Array.from({ length: columnCount }).map((_, i) => {
        const isToday = i === Math.floor(columnCount / 2)
        return (
          <TaskColumnSkeleton
            key={i}
            className={cn(
              "flex-shrink-0 w-[360px]",
              isToday && "ring-2 ring-primary/20"
            )}
            itemCount={Math.floor(Math.random() * 4) + 1}
            title={isToday ? "Today" : undefined}
          />
        )
      })}
    </div>
  )
}