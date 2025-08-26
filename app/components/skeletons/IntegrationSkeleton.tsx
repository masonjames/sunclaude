import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface IntegrationItemSkeletonProps {
  className?: string
  withAction?: boolean
}

export function IntegrationItemSkeleton({ 
  className, 
  withAction = true 
}: IntegrationItemSkeletonProps) {
  return (
    <div className={cn(
      "rounded-lg border p-4 space-y-3",
      className
    )}>
      {/* Title */}
      <Skeleton className="h-4 w-3/4" />
      
      {/* Description */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      
      {/* Due date */}
      <Skeleton className="h-3 w-24" />
      
      {/* Action button */}
      {withAction && (
        <Skeleton className="h-8 w-full rounded-md" />
      )}
    </div>
  )
}

export function IntegrationTabSkeleton({ itemCount = 5 }: { itemCount?: number }) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>
      
      {/* Items */}
      <div className="flex-1 p-4 space-y-4">
        {Array.from({ length: itemCount }).map((_, i) => (
          <IntegrationItemSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export function TabbedIntegrationSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Tab headers */}
      <div className="border-b">
        <div className="grid w-full grid-cols-4 p-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-center gap-2 p-3">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-12 hidden sm:block" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Tab content */}
      <div className="flex-1">
        <IntegrationTabSkeleton />
      </div>
    </div>
  )
}