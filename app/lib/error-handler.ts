import { type ToastProps } from "@/components/ui/toast"

export type ErrorResponse = {
  message: string
  code?: string
  details?: Record<string, any>
}

export class AppError extends Error {
  code?: string
  details?: Record<string, any>

  constructor(message: string, code?: string, details?: Record<string, any>) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.details = details
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

export function createErrorToast(error: unknown): ToastProps {
  const message = getErrorMessage(error)
  const toast: ToastProps = {
    variant: "destructive",
    title: "Error",
    description: message,
  }

  if (isAppError(error)) {
    // Add specific handling for different error codes
    switch (error.code) {
      case 'NETWORK_ERROR':
        toast.description = 'Unable to connect to the server. Please check your internet connection.'
        break
      case 'VALIDATION_ERROR':
        toast.description = 'Please check your input and try again.'
        break
      case 'UNAUTHORIZED':
        toast.description = 'Please sign in to continue.'
        break
      case 'NOT_FOUND':
        toast.description = 'The requested resource was not found.'
        break
      default:
        // Use the original message if no specific handling
        break
    }
  }

  return toast
}

export function createSuccessToast(message: string): ToastProps {
  return {
    title: "Success",
    description: message,
  }
}

export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new AppError(
      errorData.message || 'An unexpected error occurred',
      errorData.code || String(response.status),
      errorData.details
    )
  }
  return response.json()
}
