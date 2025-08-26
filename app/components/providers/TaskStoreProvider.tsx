'use client'

import { useEffect } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { setGlobalToast } from '@/stores/task-store'

interface TaskStoreProviderProps {
  children: React.ReactNode
}

export function TaskStoreProvider({ children }: TaskStoreProviderProps) {
  const toast = useToast()

  useEffect(() => {
    // Initialize global toast for task store
    setGlobalToast(toast)
  }, [toast])

  return <>{children}</>
}