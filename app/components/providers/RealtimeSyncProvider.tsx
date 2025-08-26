"use client"

import React, { createContext, useContext, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRealtimeSync } from '@/hooks/use-realtime-sync'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Wifi, WifiOff, RefreshCw, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RealtimeSyncContextType {
  isConnected: boolean
  connectionType: 'websocket' | 'polling' | 'offline'
  lastSync: Date | null
  triggerSync: () => Promise<void>
  error: string | null
}

const RealtimeSyncContext = createContext<RealtimeSyncContextType | null>(null)

export function useRealtimeSyncContext() {
  const context = useContext(RealtimeSyncContext)
  if (!context) {
    throw new Error('useRealtimeSyncContext must be used within RealtimeSyncProvider')
  }
  return context
}

interface RealtimeSyncProviderProps {
  children: React.ReactNode
}

export function RealtimeSyncProvider({ children }: RealtimeSyncProviderProps) {
  const { data: session } = useSession()
  
  const {
    status,
    triggerSync,
    isConnected,
    connectionType,
    lastSync,
    error
  } = useRealtimeSync({
    enabled: !!session?.user, // Only enable when authenticated
    pollingInterval: 30000, // 30 seconds
    reconnectDelay: 5000,
    maxReconnectAttempts: 5,
  })

  const contextValue: RealtimeSyncContextType = {
    isConnected,
    connectionType,
    lastSync,
    triggerSync,
    error
  }

  return (
    <RealtimeSyncContext.Provider value={contextValue}>
      {children}
      <SyncStatusIndicator />
    </RealtimeSyncContext.Provider>
  )
}

function SyncStatusIndicator() {
  const { isConnected, connectionType, lastSync, triggerSync, error } = useRealtimeSyncContext()
  const [showDetails, setShowDetails] = React.useState(false)
  const [isSyncing, setIsSyncing] = React.useState(false)

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await triggerSync()
    } finally {
      setIsSyncing(false)
    }
  }

  const getStatusIcon = () => {
    if (isSyncing) return <RefreshCw className="h-3 w-3 animate-spin" />
    if (!isConnected || connectionType === 'offline') return <WifiOff className="h-3 w-3" />
    return <Wifi className="h-3 w-3" />
  }

  const getStatusColor = () => {
    if (error) return 'destructive'
    if (!isConnected || connectionType === 'offline') return 'secondary'
    if (connectionType === 'websocket') return 'default'
    return 'outline' // polling
  }

  const getStatusText = () => {
    if (isSyncing) return 'Syncing...'
    if (error) return 'Sync error'
    if (!isConnected || connectionType === 'offline') return 'Offline'
    if (connectionType === 'websocket') return 'Real-time'
    return 'Polling'
  }

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never'
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    
    if (minutes > 0) return `${minutes}m ago`
    return `${seconds}s ago`
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="flex items-center gap-2">
        <Badge
          variant={getStatusColor()}
          className={cn(
            "cursor-pointer transition-all duration-200 hover:scale-105",
            showDetails && "rounded-b-none"
          )}
          onClick={() => setShowDetails(!showDetails)}
        >
          {getStatusIcon()}
          <span className="ml-1 text-xs">{getStatusText()}</span>
        </Badge>

        {showDetails && (
          <div className="absolute bottom-full left-0 mb-1 min-w-[200px] rounded-lg border bg-background p-3 shadow-lg">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Connection:</span>
                <span className="capitalize font-medium">{connectionType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last sync:</span>
                <span className="font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatLastSync(lastSync)}
                </span>
              </div>
              {error && (
                <div className="text-destructive text-xs break-words">
                  {error}
                </div>
              )}
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-xs"
                onClick={handleSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                Sync Now
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}