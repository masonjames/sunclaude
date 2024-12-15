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
      "flex h-screen flex-col border-r bg-background transition-all duration-300",
      isOpen ? "w-[240px]" : "w-[60px]"
    )}>
      <div className="flex h-14 items-center justify-between border-b px-4">
        {isOpen ? (
          <>
            <h1 className="text-lg font-semibold">Sunclaude</h1>
            <ThemeToggle />
          </>
        ) : (
          <Button variant="ghost" size="icon" className="mx-auto" onClick={() => setIsOpen(true)}>
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
          <Badge variant="notification" className="flex items-center justify-center">
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
          {isOpen && <span className="ml-2">This Week</span>}
        </Button>
        <Button
          variant="ghost"
          className={cn(
            "relative w-full",
            isOpen ? "justify-start px-4" : "justify-center px-0"
          )}
        >
          <Focus className="h-4 w-4" />
          {isOpen && <span className="ml-2">Focus Mode</span>}
        </Button>
      </nav>
      {isOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="mb-4 ml-auto mr-2"
          onClick={() => setIsOpen(false)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
