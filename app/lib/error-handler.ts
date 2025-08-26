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

// Integration-specific error handling
export interface IntegrationError extends Error {
  provider: string
  context?: Record<string, any>
  originalError?: Error
}

export function captureIntegrationError(
  provider: string, 
  error: Error, 
  context?: Record<string, any>
): void {
  const integrationError: IntegrationError = {
    name: 'IntegrationError',
    message: `${provider} integration error: ${error.message}`,
    provider,
    context,
    originalError: error
  }

  // Log structured error data
  console.error('[Integration Error]', {
    provider,
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  })

  // In production, you might want to:
  // - Send to error tracking service (Sentry, DataDog, etc.)
  // - Store in database for analysis
  // - Send alerts for critical integrations
  
  // For now, we'll track common integration patterns
  trackIntegrationErrorMetrics(provider, error)
}

function trackIntegrationErrorMetrics(provider: string, error: Error): void {
  // Simple console-based metrics (replace with proper metrics in production)
  const errorType = getIntegrationErrorType(error)
  console.log(`[Metrics] Integration error: ${provider}.${errorType}`)
}

function getIntegrationErrorType(error: Error): string {
  const message = error.message.toLowerCase()
  
  if (message.includes('rate limit') || message.includes('quota')) {
    return 'rate_limit'
  }
  if (message.includes('unauthorized') || message.includes('auth')) {
    return 'auth_error'
  }
  if (message.includes('network') || message.includes('timeout')) {
    return 'network_error'
  }
  if (message.includes('not found') || message.includes('404')) {
    return 'not_found'
  }
  
  return 'unknown'
}

export class IntegrationConnectionError extends AppError {
  constructor(provider: string, originalError?: Error) {
    super(
      `Failed to connect to ${provider}. Please check your connection settings.`,
      'INTEGRATION_CONNECTION_ERROR',
      { provider, originalError: originalError?.message }
    )
  }
}

export class IntegrationRateLimitError extends AppError {
  constructor(provider: string, retryAfter?: number) {
    super(
      `Rate limit exceeded for ${provider}. Please try again later.`,
      'INTEGRATION_RATE_LIMIT_ERROR', 
      { provider, retryAfter }
    )
  }
}

export class IntegrationAuthError extends AppError {
  constructor(provider: string) {
    super(
      `Authentication failed for ${provider}. Please reconnect your account.`,
      'INTEGRATION_AUTH_ERROR',
      { provider }
    )
  }
}
