import { useEffect, useCallback, useRef, useState } from 'react'
import { useTaskStore } from '@/stores/task-store'
import { useTaskApi } from '@/hooks/use-task-api'
import { useToastFeedback } from '@/hooks/use-toast-feedback'

interface RealtimeSyncConfig {
  enabled?: boolean
  pollingInterval?: number
  websocketUrl?: string
  reconnectDelay?: number
  maxReconnectAttempts?: number
}

interface SyncStatus {
  isConnected: boolean
  lastSync: Date | null
  connectionType: 'websocket' | 'polling' | 'offline'
  error: string | null
}

const defaultConfig: Required<RealtimeSyncConfig> = {
  enabled: true,
  pollingInterval: 30000, // 30 seconds
  websocketUrl: typeof window !== 'undefined' 
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ws`
    : '',
  reconnectDelay: 5000,
  maxReconnectAttempts: 5,
}

export function useRealtimeSync(config: RealtimeSyncConfig = {}) {
  const finalConfig = { ...defaultConfig, ...config }
  const [status, setStatus] = useState<SyncStatus>({
    isConnected: false,
    lastSync: null,
    connectionType: 'offline',
    error: null,
  })

  const { refreshTasks } = useTaskApi()
  const { error: showError, success: showSuccess } = useToastFeedback()
  const { lastSync: storeLastSync } = useTaskStore()

  const wsRef = useRef<WebSocket | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout>()
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttemptsRef = useRef(0)
  const isActiveRef = useRef(true)

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    if (!finalConfig.enabled || wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      const ws = new WebSocket(finalConfig.websocketUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setStatus(prev => ({
          ...prev,
          isConnected: true,
          connectionType: 'websocket',
          error: null,
        }))
        reconnectAttemptsRef.current = 0
        
        // Send initial sync request
        ws.send(JSON.stringify({ type: 'sync_request' }))
      }

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data)
          
          switch (data.type) {
            case 'task_update':
            case 'tasks_changed':
              // Refresh tasks when changes are detected
              const { refreshTasks } = useTaskApi()
              await refreshTasks()
              setStatus(prev => ({ ...prev, lastSync: new Date() }))
              break
              
            case 'sync_complete':
              setStatus(prev => ({ ...prev, lastSync: new Date() }))
              break
              
            case 'error':
              setStatus(prev => ({ ...prev, error: data.message }))
              const { error: showError } = useToastFeedback()
              showError(`Sync error: ${data.message}`)
              break
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onclose = () => {
        setStatus(prev => ({
          ...prev,
          isConnected: false,
          connectionType: 'offline',
        }))

        // Attempt to reconnect if enabled and within retry limits
        if (finalConfig.enabled && 
            reconnectAttemptsRef.current < finalConfig.maxReconnectAttempts &&
            isActiveRef.current) {
          reconnectAttemptsRef.current++
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket()
          }, finalConfig.reconnectDelay * reconnectAttemptsRef.current)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setStatus(prev => ({
          ...prev,
          error: 'WebSocket connection failed',
        }))
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      // Fall back to polling
      startPolling()
    }
  }, [finalConfig.enabled, finalConfig.websocketUrl, finalConfig.maxReconnectAttempts, finalConfig.reconnectDelay])

  // Polling fallback
  const startPolling = useCallback(() => {
    if (!finalConfig.enabled || pollingIntervalRef.current) {
      return
    }

    setStatus(prev => ({
      ...prev,
      connectionType: 'polling',
      isConnected: true,
      error: null,
    }))

    const poll = async () => {
      if (!isActiveRef.current) return

      try {
        await refreshTasks()
        setStatus(prev => ({ ...prev, lastSync: new Date(), error: null }))
      } catch (error) {
        setStatus(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Polling failed',
        }))
      }
    }

    // Initial poll
    poll()

    // Set up recurring polling
    pollingIntervalRef.current = setInterval(poll, finalConfig.pollingInterval)
  }, [finalConfig, refreshTasks])

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = undefined
    }
  }, [])

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'sync_request' }))
      } else {
        await refreshTasks()
      }
      setStatus(prev => ({ ...prev, lastSync: new Date() }))
      showSuccess('Tasks synchronized')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed'
      setStatus(prev => ({ ...prev, error: message }))
      showError(message)
    }
  }, [refreshTasks, showSuccess, showError])

  // Connection management
  const connect = useCallback(() => {
    if (!finalConfig.enabled) return

    isActiveRef.current = true
    
    // Try WebSocket first, fall back to polling
    connectWebSocket()
    
    // If WebSocket doesn't connect within 5 seconds, start polling
    setTimeout(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        startPolling()
      }
    }, 5000)
  }, [finalConfig.enabled, connectWebSocket, startPolling])

  const disconnect = useCallback(() => {
    isActiveRef.current = false
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    stopPolling()
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    setStatus({
      isConnected: false,
      lastSync: null,
      connectionType: 'offline',
      error: null,
    })
  }, [stopPolling])

  // Page visibility handling
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      // Page is hidden, reduce sync frequency
      if (status.connectionType === 'polling') {
        stopPolling()
      }
    } else {
      // Page is visible, resume normal sync
      if (finalConfig.enabled && status.connectionType === 'polling') {
        startPolling()
      }
      // Trigger immediate sync when page becomes visible
      triggerSync()
    }
  }, [status.connectionType, stopPolling, startPolling, triggerSync, finalConfig.enabled])

  // Network status handling
  const handleOnline = useCallback(() => {
    if (finalConfig.enabled && !status.isConnected) {
      connect()
    }
  }, [finalConfig.enabled, status.isConnected, connect])

  const handleOffline = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isConnected: false,
      connectionType: 'offline',
      error: 'Network offline',
    }))
  }, [])

  // Setup and cleanup effects
  useEffect(() => {
    if (finalConfig.enabled) {
      connect()
    }

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      disconnect()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [finalConfig.enabled]) // Only depend on the config flag

  // Sync when store's lastSync changes (indicates local changes)
  useEffect(() => {
    if (storeLastSync && finalConfig.enabled) {
      // Small delay to batch rapid changes
      const timer = setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ 
            type: 'local_change',
            timestamp: storeLastSync.toISOString()
          }))
        }
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [storeLastSync, finalConfig.enabled])

  return {
    status,
    triggerSync,
    connect,
    disconnect,
    isConnected: status.isConnected,
    connectionType: status.connectionType,
    lastSync: status.lastSync,
    error: status.error,
  }
}