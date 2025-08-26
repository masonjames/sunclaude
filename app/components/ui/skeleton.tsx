'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'default' | 'shimmer' | 'wave'
}

export function Skeleton({ className, variant = 'shimmer' }: SkeletonProps) {
  const baseClasses = "bg-gray-200/60 dark:bg-gray-800/60 rounded-md"
  
  const variantClasses = {
    default: "animate-pulse",
    shimmer: "animate-pulse relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:animate-shimmer",
    wave: "animate-pulse relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:animate-wave"
  }

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      aria-label="Loading..."
    />
  )
}

// Enhanced prebuilt skeleton components with better spacing and typography
export function TaskSkeleton({ variant = 'shimmer' }: { variant?: 'default' | 'shimmer' | 'wave' }) {
  return (
    <div className="group rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm p-5 space-y-4 transition-all duration-200 hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2.5">
          <Skeleton variant={variant} className="h-4 w-4/5" />
          <Skeleton variant={variant} className="h-3.5 w-3/5" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton variant={variant} className="h-6 w-14 rounded-full" />
          <Skeleton variant={variant} className="h-5 w-5 rounded-full" />
        </div>
      </div>
      
      {/* Metadata */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <Skeleton variant={variant} className="h-4 w-4 rounded-full" />
          <Skeleton variant={variant} className="h-4 w-16" />
        </div>
        <Skeleton variant={variant} className="h-4 w-10" />
      </div>
    </div>
  )
}

export function TaskBoardSkeleton({ variant = 'shimmer' }: { variant?: 'default' | 'shimmer' | 'wave' } = {}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, columnIndex) => (
        <div key={columnIndex} className="space-y-5">
          {/* Column header */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Skeleton variant={variant} className="h-2 w-2 rounded-full" />
              <Skeleton variant={variant} className="h-5 w-20" />
            </div>
            <Skeleton variant={variant} className="h-5 w-6 rounded-full" />
          </div>
          
          {/* Task cards */}
          <div className="space-y-4">
            {Array.from({ length: Math.floor(Math.random() * 4) + 2 }).map((_, taskIndex) => (
              <TaskSkeleton key={taskIndex} variant={variant} />
            ))}
          </div>
          
          {/* Add task button skeleton */}
          <div className="pt-2">
            <Skeleton variant={variant} className="h-10 w-full rounded-lg border-2 border-dashed" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function IntegrationSkeleton({ variant = 'shimmer' }: { variant?: 'default' | 'shimmer' | 'wave' } = {}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <Skeleton variant={variant} className="h-6 w-6 rounded" />
          <Skeleton variant={variant} className="h-6 w-28" />
        </div>
        <Skeleton variant={variant} className="h-8 w-20 rounded-lg" />
      </div>
      
      {/* Items list */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div 
            key={index} 
            className="flex items-center gap-4 p-3 rounded-lg bg-gray-50/50 dark:bg-gray-900/50"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <Skeleton variant={variant} className="h-4 w-4 rounded-sm flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton variant={variant} className="h-4 w-3/4" />
              <Skeleton variant={variant} className="h-3 w-1/2" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton variant={variant} className="h-5 w-5 rounded-full" />
              <Skeleton variant={variant} className="h-3 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CalendarSkeleton({ variant = 'shimmer' }: { variant?: 'default' | 'shimmer' | 'wave' } = {}) {
  return (
    <div className="space-y-6">
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton variant={variant} className="h-8 w-8 rounded-lg" />
          <Skeleton variant={variant} className="h-7 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton variant={variant} className="h-8 w-8 rounded-lg" />
          <Skeleton variant={variant} className="h-8 w-8 rounded-lg" />
        </div>
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day headers */}
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={`header-${index}`} className="p-2 text-center">
            <Skeleton variant={variant} className="h-4 w-8 mx-auto" />
          </div>
        ))}
        
        {/* Calendar days */}
        {Array.from({ length: 35 }).map((_, index) => (
          <div key={`day-${index}`} className="aspect-square p-2">
            <div className="h-full w-full rounded-lg border border-gray-100 dark:border-gray-800 p-2 space-y-1">
              <Skeleton variant={variant} className="h-3 w-4" />
              {Math.random() > 0.7 && (
                <Skeleton variant={variant} className="h-2 w-full rounded-full" />
              )}
              {Math.random() > 0.8 && (
                <Skeleton variant={variant} className="h-2 w-3/4 rounded-full" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}