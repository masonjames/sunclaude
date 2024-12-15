"use client"

import * as React from "react"

interface SidebarContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  isIntegrationsOpen: boolean
  setIsIntegrationsOpen: (open: boolean) => void
}

const SidebarContext = React.createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(true)
  const [isIntegrationsOpen, setIsIntegrationsOpen] = React.useState(true)

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen, isIntegrationsOpen, setIsIntegrationsOpen }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}
