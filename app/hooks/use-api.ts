import { useState, useCallback } from 'react'
import { useToast } from "@/components/ui/use-toast"
import { handleApiResponse, createErrorToast, createSuccessToast } from '@/lib/error-handler'

interface UseApiOptions {
  showSuccessToast?: boolean
  showErrorToast?: boolean
  successMessage?: string
}

export function useApi<T>() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const { toast } = useToast()

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
        toast(createSuccessToast(successMessage))
      }

      return data
    } catch (err) {
      setError(err as Error)
      
      if (showErrorToast) {
        toast(createErrorToast(err))
      }
      
      return null
    } finally {
      setLoading(false)
    }
  }, [toast])

  return {
    loading,
    error,
    execute
  }
}
