"use client"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { useSidebar } from "@/components/ui/sidebar"
import { Calendar, Focus, ChevronLeft, ChevronRight, Sun, LogOut, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSession, signOut } from "next-auth/react"

export function MainSidebar() {
  const { isOpen, setIsOpen } = useSidebar()
  const { data: session } = useSession()

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
      <div className="mt-auto">
        {isOpen && session && (
          <div className="border-t p-4 space-y-2">
            <div className="flex items-center space-x-2 text-sm">
              <User className="h-4 w-4" />
              <span className="truncate">{session.user?.email}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
            <ThemeToggle />
          </div>
        )}
        {!isOpen && session && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
