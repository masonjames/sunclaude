"use client"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { useSidebar } from "@/components/ui/sidebar"
import { Calendar, Focus, ChevronLeft, ChevronRight, Sun, LogOut, User, Clock, Pause } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSession, signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"

interface ActiveTimer {
  id: string
  taskId: string
  startedAt: string
  currentDuration: number
  task: {
    title: string
  }
}

export function MainSidebar() {
  const { isOpen, setIsOpen } = useSidebar()
  const { data: session } = useSession()
  const { toast } = useToast()
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [dailyTotal, setDailyTotal] = useState(0)

  // Fetch active timer on mount and periodically
  useEffect(() => {
    if (!session?.user) return

    const fetchActiveTimer = async () => {
      try {
        const response = await fetch('/api/timer/active')
        if (response.ok) {
          const data = await response.json()
          setActiveTimer(data)
          if (data) {
            setElapsedTime(data.currentDuration)
          }
        }
      } catch (error) {
        console.error('Error fetching active timer:', error)
      }
    }

    fetchActiveTimer()
    const interval = setInterval(fetchActiveTimer, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [session])

  // Update elapsed time every second when timer is active
  useEffect(() => {
    if (!activeTimer) {
      setElapsedTime(0)
      return
    }

    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1/60) // Add 1 second (in minutes)
    }, 1000)

    return () => clearInterval(interval)
  }, [activeTimer])

  const handleStopTimer = async () => {
    if (!activeTimer) return

    try {
      const response = await fetch(`/api/tasks/${activeTimer.taskId}/timer/stop`, {
        method: 'POST',
      })

      if (response.ok) {
        setActiveTimer(null)
        setElapsedTime(0)
        toast({
          title: "Timer stopped",
          description: "Timer has been stopped",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to stop timer",
        variant: "destructive",
      })
    }
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.floor(minutes % 60)
    const secs = Math.floor((minutes * 60) % 60)
    
    if (hours > 0) {
      return `${hours}h ${mins}m`
    } else if (mins > 0) {
      return `${mins}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  return (
    <div className={cn(
      "fixed top-0 left-0 z-10 flex h-screen flex-col border-r bg-background transition-all duration-300",
      isOpen ? "w-[240px]" : "w-[60px]"
    )}>
      <div className="flex h-14 items-center justify-between border-b px-4">
        {isOpen ? (
          <>
            <h1 className="text-lg font-semibold">Sunclaude</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="mx-auto"
            onClick={() => setIsOpen(true)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <nav className="flex-1 space-y-2 p-2">
        <Button
          variant="ghost"
          className={cn(
            "relative w-full",
            isOpen ? "justify-start px-4" : "justify-center px-0"
          )}
        >
          <Sun className="h-4 w-4" />
          {isOpen && <span className="ml-2">Today</span>}
          <Badge variant="notification" className="absolute -right-1 -top-1">
            2
          </Badge>
        </Button>
        <Button
          variant="ghost"
          className={cn(
            "relative w-full",
            isOpen ? "justify-start px-4" : "justify-center px-0"
          )}
        >
          <Calendar className="h-4 w-4" />
          {isOpen && <span className="ml-2">Calendar</span>}
          <Badge variant="notification" className="absolute -right-1 -top-1">
            5
          </Badge>
        </Button>
        <Button
          variant="ghost"
          className={cn(
            "relative w-full",
            isOpen ? "justify-start px-4" : "justify-center px-0"
          )}
        >
          <Focus className="h-4 w-4" />
          {isOpen && <span className="ml-2">Focus</span>}
        </Button>
      </nav>

      {/* Active Timer Widget */}
      {activeTimer && (
        <div className={cn(
          "border-t",
          isOpen ? "p-4" : "p-2"
        )}>
          {isOpen ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-500 animate-pulse" />
                  <span className="text-sm font-medium">Active Timer</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleStopTimer}
                >
                  <Pause className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {activeTimer.task.title}
              </div>
              <div className="text-lg font-mono font-semibold text-blue-500">
                {formatTime(elapsedTime)}
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="w-full animate-pulse"
              onClick={handleStopTimer}
              title="Stop active timer"
            >
              <Clock className="h-4 w-4 text-blue-500" />
            </Button>
          )}
        </div>
      )}
      
      {/* Daily Summary */}
      {isOpen && dailyTotal > 0 && (
        <div className="border-t p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Today's Total</p>
          <p className="text-sm font-semibold">{formatTime(dailyTotal)}</p>
        </div>
      )}

      {/* User Section */}
      {session && isOpen && (
        <div className="border-t p-4 space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="text-sm truncate">{session.user?.email}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      )}
      
      {isOpen && (
        <div className="border-t p-4">
          <ThemeToggle />
        </div>
      )}
    </div>
  )
}