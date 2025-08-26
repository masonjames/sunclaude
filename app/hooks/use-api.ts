import { useState, useCallback } from 'react'
import { useToast } from "@/contexts/ToastContext"
import { handleApiResponse, createErrorToast, createSuccessToast } from '@/lib/error-handler'

interface UseApiOptions {
  showSuccessToast?: boolean
  showErrorToast?: boolean
  successMessage?: string
}

export function useApi<T>() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const { success, error: showError } = useToast()

  const execute = useCallback(async <R = T>(
    promise: Promise<Response>,
    options: UseApiOptions = {}
  ): Promise<R | null> => {
    const {
      showSuccessToast = true,
      showErrorToast = true,
      successMessage
    } = options

    try {
      setLoading(true)
      setError(null)
      
      const response = await promise
      const data = await handleApiResponse<R>(response)

      if (showSuccessToast && successMessage) {
        success(successMessage)
      }

      return data
    } catch (err) {
      setError(err as Error)
      
      if (showErrorToast) {
        showError('Error', err instanceof Error ? err.message : 'An error occurred')
      }
      
      return null
    } finally {
      setLoading(false)
    }
  }, [success, showError])

  return {
    loading,
    error,
    execute
  }
}
