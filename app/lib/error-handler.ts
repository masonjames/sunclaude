import * as React from "react"

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

export function createErrorToast(error: unknown) {
  const message = getErrorMessage(error)
  let description = message

  if (isAppError(error)) {
    // Add specific handling for different error codes
    switch (error.code) {
      case 'NETWORK_ERROR':
        description = 'Unable to connect to the server. Please check your internet connection.'
        break
      case 'VALIDATION_ERROR':
        description = 'Please check your input and try again.'
        break
      case 'UNAUTHORIZED':
        description = 'Please sign in to continue.'
        break
      case 'NOT_FOUND':
        description = 'The requested resource was not found.'
        break
      default:
        // Use the original message if no specific handling
        break
    }
  }

  return {
    variant: "destructive" as const,
    description,
  }
}

export function createSuccessToast(message: string) {
  return {
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
