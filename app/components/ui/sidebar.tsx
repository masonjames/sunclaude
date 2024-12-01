'use client'

import React, { createContext, useContext, useState } from 'react'

interface SidebarContextType {
  isMainOpen: boolean
  isIntegrationsOpen: boolean
  toggleMain: () => void
  toggleIntegrations: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
  const [isMainOpen, setIsMainOpen] = useState(true)
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(true)

  return (
    <SidebarContext.Provider value={{
      isMainOpen,
      isIntegrationsOpen,
      toggleMain: () => setIsMainOpen(prev => !prev),
      toggleIntegrations: () => setIsIntegrationsOpen(prev => !prev)
    }}>
      {children}
    </SidebarContext.Provider>
  )
}

export const useSidebar = () => {
  const context = useContext(SidebarContext)
  if (!context) throw new Error('useSidebar must be used within SidebarProvider')
  return context
} 