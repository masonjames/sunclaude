'use client'

import React, { createContext, useContext, useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'

interface SidebarContextType {
  isMainOpen: boolean
  isIntegrationsOpen: boolean
  isMobile: boolean
  state: 'expanded' | 'collapsed'
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  toggleSidebar: () => void
  toggleMain: () => void
  toggleIntegrations: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
  const [isMainOpen, setIsMainOpen] = useState(true)
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(true)
  const [state, setState] = useState<'expanded' | 'collapsed'>('expanded')
  const [openMobile, setOpenMobile] = useState(false)
  const isMobile = useIsMobile()

  return (
    <SidebarContext.Provider value={{
      isMainOpen,
      isIntegrationsOpen,
      isMobile,
      state,
      openMobile,
      setOpenMobile,
      toggleSidebar: () => setState(prev => prev === 'expanded' ? 'collapsed' : 'expanded'),
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