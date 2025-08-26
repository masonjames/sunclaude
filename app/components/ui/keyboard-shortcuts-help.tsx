"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Keyboard } from "lucide-react"
import { cn } from "@/lib/utils"

interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  description: string
  category: string
}

interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[]
  trigger?: React.ReactNode
}

function ShortcutKey({ children, variant = "default" }: { children: React.ReactNode, variant?: "default" | "modifier" }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-mono px-2 py-1 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100",
        variant === "modifier" && "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100"
      )}
    >
      {children}
    </Badge>
  )
}

function ShortcutRow({ shortcut }: { shortcut: KeyboardShortcut }) {
  const modifierKey = React.useMemo(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'
    }
    return 'Ctrl'
  }, [])

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
        {shortcut.description}
      </span>
      <div className="flex items-center gap-1">
        {shortcut.ctrlKey && (
          <ShortcutKey variant="modifier">{modifierKey}</ShortcutKey>
        )}
        {shortcut.shiftKey && (
          <ShortcutKey variant="modifier">⇧</ShortcutKey>
        )}
        {shortcut.altKey && (
          <ShortcutKey variant="modifier">Alt</ShortcutKey>
        )}
        <ShortcutKey>
          {shortcut.key === ' ' ? 'Space' : 
           shortcut.key === 'Escape' ? 'Esc' :
           shortcut.key === 'ArrowLeft' ? '←' :
           shortcut.key === 'ArrowRight' ? '→' :
           shortcut.key === 'ArrowUp' ? '↑' :
           shortcut.key === 'ArrowDown' ? '↓' :
           shortcut.key === 'Delete' ? 'Del' :
           shortcut.key === 'Enter' ? '↵' :
           shortcut.key === 'Home' ? 'Home' :
           shortcut.key.toUpperCase()}
        </ShortcutKey>
      </div>
    </div>
  )
}

export function KeyboardShortcutsHelp({ shortcuts, trigger }: KeyboardShortcutsHelpProps) {
  const [open, setOpen] = React.useState(false)

  // Group shortcuts by category
  const groupedShortcuts = React.useMemo(() => {
    const groups: Record<string, KeyboardShortcut[]> = {}
    shortcuts.forEach(shortcut => {
      if (!groups[shortcut.category]) {
        groups[shortcut.category] = []
      }
      groups[shortcut.category].push(shortcut)
    })
    return groups
  }, [shortcuts])

  // Listen for '?' key to open help
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
        const target = event.target as HTMLElement
        if (
          target.tagName !== 'INPUT' &&
          target.tagName !== 'TEXTAREA' &&
          target.contentEditable !== 'true'
        ) {
          event.preventDefault()
          setOpen(true)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-2">
            <Keyboard className="h-4 w-4" />
            Shortcuts
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate and interact with the application more efficiently.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                {category}
              </h3>
              <div className="space-y-1">
                {categoryShortcuts.map((shortcut, index) => (
                  <ShortcutRow key={index} shortcut={shortcut} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 pt-4 mt-4">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Press <ShortcutKey>?</ShortcutKey> anytime to open this help</span>
            <span>Press <ShortcutKey>Esc</ShortcutKey> to close</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Standalone help component that can be used anywhere
export function KeyboardShortcutsHelpStandalone() {
  // Default shortcuts to show when no specific shortcuts are provided
  const defaultShortcuts: KeyboardShortcut[] = [
    { key: 'n', ctrlKey: true, description: 'Create new task', category: 'Tasks' },
    { key: 's', ctrlKey: true, description: 'Sync all integrations', category: 'Integration' },
    { key: 'f', ctrlKey: true, description: 'Focus search input', category: 'Navigation' },
    { key: 't', ctrlKey: true, description: 'Toggle dark/light theme', category: 'UI' },
    { key: '1', ctrlKey: true, description: 'Switch to tasks view', category: 'Navigation' },
    { key: '2', ctrlKey: true, description: 'Switch to calendar view', category: 'Navigation' },
    { key: '3', ctrlKey: true, description: 'Open integrations panel', category: 'Navigation' },
    { key: 'Escape', description: 'Close open dialogs or modals', category: 'Navigation' },
    { key: '?', description: 'Show keyboard shortcuts help', category: 'Navigation' }
  ]

  return <KeyboardShortcutsHelp shortcuts={defaultShortcuts} />
}