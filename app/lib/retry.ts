interface RetryOptions {
  maxAttempts?: number
  baseDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  jitter?: boolean
  onRetry?: (error: Error, attempt: number) => void | Promise<void>
  shouldRetry?: (error: Error) => boolean
}

interface RetryableError extends Error {
  shouldRetry?: boolean
  retryAfter?: number
}

export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    jitter = true,
    onRetry,
    shouldRetry = (error) => isRetryableError(error)
  } = opts

  let lastError: Error
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      // Don't retry if this is the last attempt or error is not retryable
      if (attempt === maxAttempts || !shouldRetry(lastError)) {
        throw lastError
      }
      
      // Calculate delay with exponential backoff
      let delay = Math.min(baseDelay * Math.pow(backoffMultiplier, attempt - 1), maxDelay)
      
      // Add jitter to prevent thundering herd
      if (jitter) {
        delay = delay * (0.5 + Math.random() * 0.5)
      }
      
      // Use custom retry delay if provided in error
      const retryableError = lastError as RetryableError
      if (retryableError.retryAfter) {
        delay = retryableError.retryAfter * 1000 // Convert to ms
      }
      
      console.log(`[Retry] Attempt ${attempt}/${maxAttempts} failed: ${lastError.message}. Retrying in ${Math.round(delay)}ms...`)
      
      // Call onRetry callback if provided
      if (onRetry) {
        await onRetry(lastError, attempt)
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  return withExponentialBackoff(fn, { maxAttempts, baseDelay })
}

export function isRetryableError(error: Error): boolean {
  // Network errors
  if (error.message.includes('ECONNRESET') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('fetch failed')) {
    return true
  }
  
  // HTTP status codes that are typically retryable
  const retryableError = error as any
  if (retryableError.status || retryableError.statusCode) {
    const status = retryableError.status || retryableError.statusCode
    return [408, 409, 429, 500, 502, 503, 504].includes(status)
  }
  
  // Rate limiting errors
  if (error.message.includes('rate limit') || 
      error.message.includes('too many requests') ||
      error.message.includes('quota exceeded')) {
    return true
  }
  
  // Integration-specific errors
  if (error.message.includes('Google API') && 
      (error.message.includes('quota') || error.message.includes('limit'))) {
    return true
  }
  
  // Check if error explicitly indicates it should be retried
  const retryableErr = error as RetryableError
  if (retryableErr.shouldRetry !== undefined) {
    return retryableErr.shouldRetry
  }
  
  return false
}

export function createRetryableError(message: string, shouldRetry: boolean = true, retryAfter?: number): RetryableError {
  const error = new Error(message) as RetryableError
  error.shouldRetry = shouldRetry
  error.retryAfter = retryAfter
  return error
}

// Specific retry patterns for different integration types
export async function withGoogleAPIRetry<T>(fn: () => Promise<T>): Promise<T> {
  return withExponentialBackoff(fn, {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 60000,
    shouldRetry: (error) => {
      const anyError = error as any
      // Google API specific retry logic
      if (anyError.code === 403 && anyError.message?.includes('quotaExceeded')) {
        return true
      }
      if (anyError.code === 429) { // Rate limit
        return true
      }
      if (anyError.code >= 500) { // Server errors
        return true
      }
      return isRetryableError(error)
    },
    onRetry: async (error, attempt) => {
      console.log(`[GoogleAPI] Retry attempt ${attempt}: ${error.message}`)
    }
  })
}

export async function withSlackAPIRetry<T>(fn: () => Promise<T>): Promise<T> {
  return withExponentialBackoff(fn, {
    maxAttempts: 3,
    baseDelay: 2000,
    shouldRetry: (error) => {
      const anyError = error as any
      // Slack API specific retry logic
      if (anyError.data?.error === 'rate_limited') {
        return true
      }
      return isRetryableError(error)
    },
    onRetry: async (error, attempt) => {
      console.log(`[SlackAPI] Retry attempt ${attempt}: ${error.message}`)
    }
  })
}

export async function withNotionAPIRetry<T>(fn: () => Promise<T>): Promise<T> {
  return withExponentialBackoff(fn, {
    maxAttempts: 4,
    baseDelay: 1500,
    shouldRetry: (error) => {
      const anyError = error as any
      // Notion API specific retry logic
      if (anyError.code === 'rate_limited') {
        return true
      }
      if (anyError.status === 503) { // Service unavailable
        return true
      }
      return isRetryableError(error)
    },
    onRetry: async (error, attempt) => {
      console.log(`[NotionAPI] Retry attempt ${attempt}: ${error.message}`)
    }
  })
}

export async function withGitHubAPIRetry<T>(fn: () => Promise<T>): Promise<T> {
  return withExponentialBackoff(fn, {
    maxAttempts: 3,
    baseDelay: 1000,
    shouldRetry: (error) => {
      const anyError = error as any
      // GitHub API specific retry logic
      if (anyError.status === 403 && anyError.message?.includes('rate limit')) {
        return true
      }
      if (anyError.status === 502) { // Bad gateway
        return true
      }
      return isRetryableError(error)
    },
    onRetry: async (error, attempt) => {
      console.log(`[GitHubAPI] Retry attempt ${attempt}: ${error.message}`)
    }
  })
}