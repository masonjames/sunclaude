'use client'

export default function TaskBoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto p-4">
      {Array.from({ length: 5 }).map((_, colIdx) => (
        <div key={colIdx} className="w-[320px] shrink-0 space-y-3">
          <div className="h-6 w-32 bg-muted rounded animate-pulse" aria-hidden />
          {Array.from({ length: 4 }).map((__, i) => (
            <div key={i} className="h-20 w-full bg-muted/60 rounded-md animate-pulse" aria-hidden />
          ))}
        </div>
      ))}
      <span className="sr-only">Loading tasks</span>
    </div>
  )
}