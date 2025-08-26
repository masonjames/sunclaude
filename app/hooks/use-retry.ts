import { useState, useCallback, useRef } from 'react'

interface RetryConfig {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffFactor?: number
  retryCondition?: (error: Error) => boolean
}

interface RetryState {
  isRetrying: boolean
  retryCount: number
  error: Error | null
}

const defaultConfig: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  retryCondition: () => true,
}

export function useRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
) {
  const finalConfig = { ...defaultConfig, ...config }
  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    retryCount: 0,
    error: null,
  })
  
  const timeoutRef = useRef<NodeJS.Timeout>()
  const abortControllerRef = useRef<AbortController>()

  const calculateDelay = useCallback((attempt: number): number => {
    const delay = finalConfig.initialDelay * Math.pow(finalConfig.backoffFactor, attempt)
    return Math.min(delay, finalConfig.maxDelay)
  }, [finalConfig])

  const execute = useCallback(async (): Promise<T> => {
    // Cancel any ongoing retry
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setState({
      isRetrying: false,
      retryCount: 0,
      error: null,
    })

    let lastError: Error

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        setState(prev => ({
          ...prev,
          isRetrying: attempt > 0,
          retryCount: attempt,
        }))

        // Create new abort controller for this attempt
        abortControllerRef.current = new AbortController()

        const result = await operation()
        
        setState({
          isRetrying: false,
          retryCount: attempt,
          error: null,
        })

        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        // Don't retry if it's the last attempt or retry condition fails
        if (attempt === finalConfig.maxRetries || !finalConfig.retryCondition(lastError)) {
          setState({
            isRetrying: false,
            retryCount: attempt,
            error: lastError,
          })
          throw lastError
        }

        // Calculate delay for next attempt
        const delay = calculateDelay(attempt)
        
        setState(prev => ({
          ...prev,
          error: lastError,
        }))

        // Wait before retrying
        await new Promise<void>((resolve, reject) => {
          timeoutRef.current = setTimeout(() => {
            if (abortControllerRef.current?.signal.aborted) {
              reject(new Error('Retry aborted'))
            } else {
              resolve()
            }
          }, delay)
        })
      }
    }

    throw lastError!
  }, [operation, finalConfig, calculateDelay])

  const abort = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setState(prev => ({
      ...prev,
      isRetrying: false,
    }))
  }, [])

  const reset = useCallback(() => {
    abort()
    setState({
      isRetrying: false,
      retryCount: 0,
      error: null,
    })
  }, [abort])

  return {
    execute,
    abort,
    reset,
    ...state,
  }
}

// Specific retry hooks for common scenarios
export function useApiRetry<T>(
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>
) {
  return useRetry(operation, {
    maxRetries: 3,
    initialDelay: 1000,
    backoffFactor: 2,
    retryCondition: (error) => {
      // Retry on network errors and 5xx status codes
      if (error.message.includes('fetch')) return true
      if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) return true
      return false
    },
    ...config,
  })
}

export function useIntegrationRetry<T>(
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>
) {
  return useRetry(operation, {
    maxRetries: 5,
    initialDelay: 2000,
    backoffFactor: 1.5,
    maxDelay: 30000,
    retryCondition: (error) => {
      // Retry on rate limiting and temporary failures
      if (error.message.includes('rate limit')) return true
      if (error.message.includes('timeout')) return true
      if (error.message.includes('temporary')) return true
      return false
    },
    ...config,
  })
}