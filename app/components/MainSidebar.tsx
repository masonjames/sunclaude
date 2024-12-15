"use client"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { useSidebar } from "@/components/ui/sidebar"
import { Calendar, Focus, ChevronLeft, ChevronRight, Sun } from "lucide-react"
import { cn } from "@/lib/utils"

export function MainSidebar() {
  const { isOpen, setIsOpen } = useSidebar()

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
      {isOpen && (
        <div className="border-t p-4">
          <ThemeToggle />
        </div>
      )}
    </div>
  )
}
