import { useCallback } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'

interface ToastOptions {
  duration?: number
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
}

interface OperationToastOptions extends ToastOptions {
  loadingMessage: string
  successMessage: string
  errorMessage?: string
}

export function useToastFeedback() {
  const success = useCallback((message: string, options?: ToastOptions) => {
    return toast.success(message, {
      duration: 4000,
      position: 'bottom-right',
      ...options,
      icon: '✅',
      style: {
        background: '#10B981',
        color: '#FFFFFF',
        fontWeight: '500',
      },
    })
  }, [])

  const error = useCallback((message: string, options?: ToastOptions) => {
    return toast.error(message, {
      duration: 6000,
      position: 'bottom-right',
      ...options,
      icon: '❌',
      style: {
        background: '#EF4444',
        color: '#FFFFFF',
        fontWeight: '500',
      },
    })
  }, [])

  const loading = useCallback((message: string, options?: ToastOptions) => {
    return toast.loading(message, {
      position: 'bottom-right',
      ...options,
      style: {
        background: '#3B82F6',
        color: '#FFFFFF',
        fontWeight: '500',
      },
    })
  }, [])

  const dismiss = useCallback((toastId: string) => {
    toast.dismiss(toastId)
  }, [])

  const dismissAll = useCallback(() => {
    toast.dismiss()
  }, [])

  // Higher-level operation toast that handles loading -> success/error flow
  const operationToast = useCallback(async <T>(
    operation: () => Promise<T>,
    options: OperationToastOptions
  ): Promise<T> => {
    const toastId = loading(options.loadingMessage, options)

    try {
      const result = await operation()
      toast.dismiss(toastId)
      success(options.successMessage, options)
      return result
    } catch (err) {
      toast.dismiss(toastId)
      const errorMsg = options.errorMessage || 
        (err instanceof Error ? err.message : 'Operation failed')
      error(errorMsg, options)
      throw err
    }
  }, [loading, success, error])

  // Optimistic operation toast - shows immediate success, reverts on error
  const optimisticToast = useCallback(async <T>(
    operation: () => Promise<T>,
    options: {
      optimisticMessage: string
      successMessage: string
      errorMessage?: string
      revertMessage?: string
    } & ToastOptions
  ): Promise<T> => {
    // Show optimistic success immediately
    const optimisticToastId = success(options.optimisticMessage, {
      ...options,
      duration: 1000, // Short duration
    })

    try {
      const result = await operation()
      // Operation succeeded, show final success message
      setTimeout(() => {
        success(options.successMessage, options)
      }, 500)
      return result
    } catch (err) {
      // Operation failed, show revert message and error
      toast.dismiss(optimisticToastId)
      if (options.revertMessage) {
        error(options.revertMessage, { ...options, duration: 2000 })
        setTimeout(() => {
          const errorMsg = options.errorMessage || 
            (err instanceof Error ? err.message : 'Operation failed')
          error(errorMsg, options)
        }, 1000)
      } else {
        const errorMsg = options.errorMessage || 
          (err instanceof Error ? err.message : 'Operation failed')
        error(errorMsg, options)
      }
      throw err
    }
  }, [success, error])

  // Batch operation toast for multiple operations
  const batchToast = useCallback(async <T>(
    operations: Array<() => Promise<T>>,
    options: {
      loadingMessage: string
      successMessage: string
      partialSuccessMessage?: string
      errorMessage?: string
    } & ToastOptions
  ): Promise<T[]> => {
    const toastId = loading(options.loadingMessage, options)
    const results: T[] = []
    const errors: Error[] = []

    for (const operation of operations) {
      try {
        const result = await operation()
        results.push(result)
      } catch (err) {
        if (err instanceof Error) {
          errors.push(err)
        }
      }
    }

    toast.dismiss(toastId)

    if (errors.length === 0) {
      success(options.successMessage, options)
    } else if (results.length > 0) {
      const message = options.partialSuccessMessage || 
        `${results.length} succeeded, ${errors.length} failed`
      error(message, options)
    } else {
      const errorMsg = options.errorMessage || 
        `All operations failed: ${errors[0]?.message || 'Unknown error'}`
      error(errorMsg, options)
    }

    return results
  }, [loading, success, error])

  // Retry operation toast with exponential backoff
  const retryToast = useCallback(async <T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number
      retryMessage?: string
      successMessage: string
      finalErrorMessage?: string
    } & ToastOptions
  ): Promise<T> => {
    const maxRetries = options.maxRetries || 3
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation()
        if (attempt > 1) {
          success(options.successMessage, options)
        }
        return result
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Unknown error')
        
        if (attempt < maxRetries) {
          const retryMsg = options.retryMessage || 
            `Attempt ${attempt} failed, retrying... (${maxRetries - attempt} retries left)`
          loading(retryMsg, { ...options, duration: 2000 })
          
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        }
      }
    }

    const finalError = options.finalErrorMessage || 
      `Operation failed after ${maxRetries} attempts: ${lastError?.message}`
    error(finalError, options)
    throw lastError
  }, [success, loading, error])

  return {
    success,
    error,
    loading,
    dismiss,
    dismissAll,
    operationToast,
    optimisticToast,
    batchToast,
    retryToast,
  }
}