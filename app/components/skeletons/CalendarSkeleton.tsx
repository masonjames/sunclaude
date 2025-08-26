'use client'

export default function CalendarSkeleton() {
  return (
    <div className="p-3 space-y-3">
      <div className="h-6 w-40 rounded-md bg-muted animate-pulse" aria-hidden />
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="rounded-md border p-2 space-y-2">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" aria-hidden />
            <div className="h-16 w-full bg-muted/60 rounded animate-pulse" aria-hidden />
            <div className="h-12 w-full bg-muted/60 rounded animate-pulse" aria-hidden />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading calendar</span>
    </div>
  )
}