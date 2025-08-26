"use client"

import * as React from "react"
import { useGlobalKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode
}

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  // Initialize global keyboard shortcuts
  useGlobalKeyboardShortcuts()

  return <>{children}</>
}