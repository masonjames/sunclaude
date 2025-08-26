"use client"

import { useEffect, useCallback } from 'react'
import { useToast } from '@/contexts/ToastContext'

interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  action: () => void
  description: string
  category: string
}

interface UseKeyboardShortcutsProps {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsProps) {
  const { addToast } = useToast()

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Don't trigger shortcuts when user is typing in input fields
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true' ||
      target.closest('[contenteditable="true"]')
    ) {
      return
    }

    const shortcut = shortcuts.find(s => {
      const keyMatch = s.key.toLowerCase() === event.key.toLowerCase()
      const ctrlMatch = !!s.ctrlKey === (event.ctrlKey || event.metaKey)
      const shiftMatch = !!s.shiftKey === event.shiftKey
      const altMatch = !!s.altKey === event.altKey

      return keyMatch && ctrlMatch && shiftMatch && altMatch
    })

    if (shortcut) {
      event.preventDefault()
      event.stopPropagation()
      
      try {
        shortcut.action()
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Shortcut Error',
          description: 'Failed to execute keyboard shortcut'
        })
      }
    }
  }, [shortcuts, enabled, addToast])

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, enabled])

  return {
    shortcuts
  }
}

// Global keyboard shortcuts
export function useGlobalKeyboardShortcuts() {
  const { addToast } = useToast()

  const showShortcutsHelp = useCallback(() => {
    addToast({
      type: 'info',
      title: 'Keyboard Shortcuts',
      description: 'Press ? to see all available shortcuts',
      duration: 3000
    })
  }, [addToast])

  const globalShortcuts: KeyboardShortcut[] = [
    {
      key: '?',
      action: showShortcutsHelp,
      description: 'Show keyboard shortcuts help',
      category: 'Navigation'
    },
    {
      key: 'n',
      ctrlKey: true,
      action: () => {
        // Will be implemented to open new task dialog
        addToast({
          type: 'info', 
          title: 'New Task',
          description: 'Opening new task dialog...'
        })
      },
      description: 'Create new task',
      category: 'Tasks'
    },
    {
      key: 's',
      ctrlKey: true,
      action: () => {
        // Will be implemented to trigger sync
        addToast({
          type: 'info',
          title: 'Sync',
          description: 'Syncing with integrations...'
        })
      },
      description: 'Sync all integrations',
      category: 'Integration'
    },
    {
      key: 'f',
      ctrlKey: true,
      action: () => {
        // Will be implemented to focus search
        const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        } else {
          addToast({
            type: 'info',
            title: 'Focus Search',
            description: 'Search input not found'
          })
        }
      },
      description: 'Focus search input',
      category: 'Navigation'
    },
    {
      key: 't',
      ctrlKey: true,
      action: () => {
        // Will be implemented to toggle theme
        addToast({
          type: 'info',
          title: 'Theme Toggle',
          description: 'Toggling dark/light theme...'
        })
      },
      description: 'Toggle dark/light theme',
      category: 'UI'
    },
    {
      key: 'Escape',
      action: () => {
        // Close any open dialogs or modals
        const closeButtons = document.querySelectorAll('[data-state="open"] button[aria-label*="close"], [data-state="open"] button[aria-label*="Close"]')
        if (closeButtons.length > 0) {
          (closeButtons[0] as HTMLButtonElement).click()
        }
      },
      description: 'Close open dialogs or modals',
      category: 'Navigation'
    },
    {
      key: '1',
      ctrlKey: true,
      action: () => {
        // Navigate to tasks view
        addToast({
          type: 'info',
          title: 'Tasks View',
          description: 'Switching to tasks view...'
        })
      },
      description: 'Switch to tasks view',
      category: 'Navigation'
    },
    {
      key: '2',
      ctrlKey: true,
      action: () => {
        // Navigate to calendar view
        addToast({
          type: 'info',
          title: 'Calendar View',
          description: 'Switching to calendar view...'
        })
      },
      description: 'Switch to calendar view',
      category: 'Navigation'
    },
    {
      key: '3',
      ctrlKey: true,
      action: () => {
        // Navigate to integrations
        addToast({
          type: 'info',
          title: 'Integrations',
          description: 'Opening integrations panel...'
        })
      },
      description: 'Open integrations panel',
      category: 'Navigation'
    }
  ]

  useKeyboardShortcuts({
    shortcuts: globalShortcuts,
    enabled: true
  })

  return globalShortcuts
}

// Task-specific keyboard shortcuts
export function useTaskKeyboardShortcuts() {
  const { addToast } = useToast()

  const taskShortcuts: KeyboardShortcut[] = [
    {
      key: 'Enter',
      ctrlKey: true,
      action: () => {
        // Quick create task from anywhere
        addToast({
          type: 'info',
          title: 'Quick Task',
          description: 'Opening quick task creator...'
        })
      },
      description: 'Quick create task',
      category: 'Tasks'
    },
    {
      key: 'd',
      ctrlKey: true,
      action: () => {
        // Duplicate selected task
        addToast({
          type: 'info',
          title: 'Duplicate Task',
          description: 'Duplicating selected task...'
        })
      },
      description: 'Duplicate selected task',
      category: 'Tasks'
    },
    {
      key: 'Delete',
      action: () => {
        // Delete selected task
        addToast({
          type: 'warning',
          title: 'Delete Task',
          description: 'Deleting selected task...'
        })
      },
      description: 'Delete selected task',
      category: 'Tasks'
    },
    {
      key: 'm',
      ctrlKey: true,
      action: () => {
        // Move task to different status
        addToast({
          type: 'info',
          title: 'Move Task',
          description: 'Opening move task dialog...'
        })
      },
      description: 'Move task to different status',
      category: 'Tasks'
    },
    {
      key: 'p',
      ctrlKey: true,
      action: () => {
        // Set task priority
        addToast({
          type: 'info',
          title: 'Task Priority',
          description: 'Opening priority selector...'
        })
      },
      description: 'Set task priority',
      category: 'Tasks'
    },
    {
      key: 'space',
      action: () => {
        // Toggle task timer
        addToast({
          type: 'info',
          title: 'Toggle Timer',
          description: 'Toggling task timer...'
        })
      },
      description: 'Toggle task timer',
      category: 'Tasks'
    }
  ]

  return taskShortcuts
}

// Calendar-specific keyboard shortcuts
export function useCalendarKeyboardShortcuts() {
  const { addToast } = useToast()

  const calendarShortcuts: KeyboardShortcut[] = [
    {
      key: 'c',
      ctrlKey: true,
      action: () => {
        // Create calendar event
        addToast({
          type: 'info',
          title: 'New Event',
          description: 'Opening event creation dialog...'
        })
      },
      description: 'Create new calendar event',
      category: 'Calendar'
    },
    {
      key: 'b',
      ctrlKey: true,
      action: () => {
        // Block time
        addToast({
          type: 'info',
          title: 'Block Time',
          description: 'Opening time blocking dialog...'
        })
      },
      description: 'Block focus time',
      category: 'Calendar'
    },
    {
      key: 'ArrowLeft',
      action: () => {
        // Previous day/week
        addToast({
          type: 'info',
          title: 'Previous Period',
          description: 'Navigating to previous period...'
        })
      },
      description: 'Navigate to previous day/week',
      category: 'Calendar'
    },
    {
      key: 'ArrowRight',
      action: () => {
        // Next day/week
        addToast({
          type: 'info',
          title: 'Next Period',
          description: 'Navigating to next period...'
        })
      },
      description: 'Navigate to next day/week',
      category: 'Calendar'
    },
    {
      key: 'Home',
      action: () => {
        // Go to today
        addToast({
          type: 'info',
          title: 'Today',
          description: 'Navigating to today...'
        })
      },
      description: 'Go to today',
      category: 'Calendar'
    }
  ]

  return calendarShortcuts
}