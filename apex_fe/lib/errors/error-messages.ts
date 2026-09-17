/**
 * User-Friendly Error Messages
 *
 * Centralized error message library providing context-aware, actionable
 * feedback to users. Maps system errors to clear, supportive messages that
 * guide recovery.
 *
 * Principles:
 * - Avoid technical jargon; use plain language
 * - Always suggest next steps or workarounds
 * - Include retry/refresh options where appropriate
 * - Categorize errors: authentication, validation, network, server, permission
 */

export type ErrorCategory =
  | 'auth'
  | 'validation'
  | 'network'
  | 'server'
  | 'permission'
  | 'notfound'
  | 'ratelimit'
  | 'unknown'

export interface ErrorMessage {
  title: string
  message: string
  action?: string // Text for primary action button
  actionFn?: () => void | Promise<void> // Handler for action button
  supportText?: string // Additional hint or contact info
  retryable: boolean // Can user retry?
  category: ErrorCategory
  statusCode?: number // HTTP status or error code
}

/**
 * Main error message resolver
 * Maps various error types to user-friendly messages
 */
export function resolveErrorMessage(
  error: unknown,
  context?: string, // e.g., "uploading resume", "saving lead"
): ErrorMessage {
  // Handle ErrorMessage objects (already processed)
  if (isErrorMessage(error)) {
    return error
  }

  // Handle Error objects
  if (error instanceof Error) {
    return resolveErrorFromError(error, context)
  }

  // Handle error strings
  if (typeof error === 'string') {
    return resolveErrorFromString(error, context)
  }

  // Handle Supabase error objects
  if (isSupabaseError(error)) {
    return resolveSupabaseError(error, context)
  }

  // Fallback for unknown error type
  return {
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    action: 'Retry',
    retryable: true,
    category: 'unknown',
  }
}

/**
 * Error-specific resolvers
 */

function resolveErrorFromError(error: Error, context?: string): ErrorMessage {
  const message = error.message.toLowerCase()

  // Network errors
  if (message.includes('network') || message.includes('fetch')) {
    return {
      title: 'Network connection issue',
      message:
        'We lost connection to the server. Check your internet and try again.',
      action: 'Retry',
      retryable: true,
      category: 'network',
    }
  }

  // Timeout
  if (message.includes('timeout')) {
    return {
      title: 'Request took too long',
      message:
        'The request timed out. Your internet might be slow. Please try again.',
      action: 'Retry',
      retryable: true,
      category: 'network',
    }
  }

  // Validation errors
  if (message.includes('validation') || message.includes('invalid')) {
    return {
      title: 'Please check your information',
      message:
        'One or more fields have issues. Review the highlighted fields and try again.',
      retryable: true,
      category: 'validation',
    }
  }

  // Authentication errors
  if (message.includes('unauthorized') || message.includes('auth')) {
    return {
      title: 'Session expired',
      message: 'Your session expired for security. Please log in again.',
      action: 'Log in',
      retryable: false,
      category: 'auth',
    }
  }

  // Default
  return {
    title: 'Error',
    message: error.message || 'Something went wrong. Please try again.',
    action: 'Retry',
    retryable: true,
    category: 'unknown',
  }
}

function resolveErrorFromString(error: string, context?: string): ErrorMessage {
  const msg = error.toLowerCase()

  // Try to infer category
  if (msg.includes('password')) {
    return {
      title: 'Password issue',
      message: 'Your password must be at least 12 characters with uppercase, lowercase, numbers, and symbols.',
      retryable: true,
      category: 'validation',
    }
  }

  if (msg.includes('email')) {
    return {
      title: 'Invalid email',
      message: 'Please enter a valid email address.',
      retryable: true,
      category: 'validation',
    }
  }

  if (msg.includes('phone')) {
    return {
      title: 'Invalid phone number',
      message: 'Please enter a valid phone number in the format: +1 (555) 123-4567',
      retryable: true,
      category: 'validation',
    }
  }

  return {
    title: 'Error',
    message: error,
    retryable: true,
    category: 'unknown',
  }
}

function resolveSupabaseError(error: Record<string, unknown>, context?: string): ErrorMessage {
  const code = error.code as string | undefined
  const msg = (error.message as string | undefined)?.toLowerCase() ?? ''

  // Authentication errors
  if (code === 'invalid_credentials') {
    return {
      title: 'Invalid email or password',
      message: 'Please check your email and password and try again.',
      retryable: true,
      category: 'auth',
    }
  }

  if (code === 'user_already_exists') {
    return {
      title: 'Email already registered',
      message: 'This email is already in use. Try logging in or using a different email.',
      action: 'Log in',
      retryable: false,
      category: 'auth',
    }
  }

  // Database constraint errors
  if (code === '23505') {
    // Unique constraint violation
    return {
      title: 'Duplicate entry',
      message: `${context ?? 'This entry'} already exists. Please check and try again with a different value.`,
      retryable: true,
      category: 'validation',
    }
  }

  if (code === '23503') {
    // Foreign key violation
    return {
      title: 'Invalid reference',
      message:
        'The resource you are trying to reference no longer exists or has been deleted.',
      retryable: false,
      category: 'notfound',
    }
  }

  // Permission errors (403)
  if (code === '403' || msg.includes('permission')) {
    return {
      title: 'You do not have permission',
      message:
        'You do not have access to perform this action. If you believe this is a mistake, contact your administrator.',
      retryable: false,
      category: 'permission',
    }
  }

  // Not found (404)
  if (code === '404' || msg.includes('not found')) {
    return {
      title: 'Not found',
      message:
        'The resource you are looking for does not exist or has been deleted.',
      retryable: false,
      category: 'notfound',
    }
  }

  // Rate limit (429)
  if (code === '429' || msg.includes('rate limit')) {
    return {
      title: 'Too many requests',
      message:
        'You have made too many requests in a short time. Please wait a moment and try again.',
      action: 'Retry in 10 seconds',
      retryable: true,
      category: 'ratelimit',
    }
  }

  // Server errors (5xx)
  if (code?.startsWith('5')) {
    return {
      title: 'Server error',
      message:
        'The server encountered an error. Our team has been notified. Please try again in a few moments.',
      action: 'Retry',
      retryable: true,
      category: 'server',
      statusCode: parseInt(code),
    }
  }

  // Default
  return {
    title: 'Error',
    message: (error.message as string) || 'Something went wrong. Please try again.',
    action: 'Retry',
    retryable: true,
    category: 'unknown',
  }
}

/**
 * Type guards
 */

function isErrorMessage(obj: unknown): obj is ErrorMessage {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'title' in obj &&
    'message' in obj &&
    'retryable' in obj
  )
}

function isSupabaseError(obj: unknown): obj is Record<string, unknown> {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    ('code' in obj || 'message' in obj)
  )
}

/**
 * Specialized error messages for common flows
 */

export const ErrorMessages = {
  // Authentication flow
  auth: {
    invalidCredentials: (): ErrorMessage => ({
      title: 'Invalid email or password',
      message: 'Please check your credentials and try again.',
      retryable: true,
      category: 'auth',
    }),

    sessionExpired: (): ErrorMessage => ({
      title: 'Session expired',
      message: 'Your session expired for security. Please log in again.',
      action: 'Log in',
      retryable: false,
      category: 'auth',
    }),

    notAuthorized: (): ErrorMessage => ({
      title: 'Not authorized',
      message:
        'You do not have permission to access this. Contact an administrator if you believe this is a mistake.',
      retryable: false,
      category: 'permission',
    }),
  },

  // Form validation
  validation: {
    passwordTooWeak: (): ErrorMessage => ({
      title: 'Password too weak',
      message:
        'Password must be at least 12 characters with uppercase, lowercase, numbers, and symbols.',
      retryable: true,
      category: 'validation',
    }),

    invalidEmail: (): ErrorMessage => ({
      title: 'Invalid email',
      message: 'Please enter a valid email address.',
      retryable: true,
      category: 'validation',
    }),

    invalidPhone: (): ErrorMessage => ({
      title: 'Invalid phone number',
      message:
        'Please enter a valid phone number (e.g., +1 (555) 123-4567).',
      retryable: true,
      category: 'validation',
    }),

    fieldRequired: (field: string): ErrorMessage => ({
      title: `${field} is required`,
      message: `Please fill in the ${field} field.`,
      retryable: true,
      category: 'validation',
    }),

    duplicateEntry: (field: string): ErrorMessage => ({
      title: `${field} already exists`,
      message: `This ${field} is already in use. Please try a different one.`,
      retryable: true,
      category: 'validation',
    }),
  },

  // Network/connectivity
  network: {
    offline: (): ErrorMessage => ({
      title: 'No internet connection',
      message: 'Please check your internet connection and try again.',
      action: 'Retry',
      retryable: true,
      category: 'network',
    }),

    timeout: (): ErrorMessage => ({
      title: 'Request timed out',
      message: 'The request took too long. Your connection might be slow. Try again.',
      action: 'Retry',
      retryable: true,
      category: 'network',
    }),

    serverUnreachable: (): ErrorMessage => ({
      title: 'Cannot reach the server',
      message: 'Check your internet connection or try again in a few moments.',
      action: 'Retry',
      retryable: true,
      category: 'network',
    }),
  },

  // Rate limiting
  rateLimit: {
    tooManyRequests: (waitSeconds: number = 60): ErrorMessage => ({
      title: 'Too many requests',
      message: `You have made too many requests. Please wait ${Math.ceil(waitSeconds / 60)} minute${Math.ceil(waitSeconds / 60) > 1 ? 's' : ''} before trying again.`,
      action: 'Retry later',
      retryable: true,
      category: 'ratelimit',
      supportText: `Retry available in ${waitSeconds} seconds`,
    }),
  },

  // Server errors
  server: {
    internalError: (): ErrorMessage => ({
      title: 'Server error',
      message:
        'The server encountered an error. Our team has been notified. Please try again in a few moments.',
      action: 'Retry',
      retryable: true,
      category: 'server',
      statusCode: 500,
    }),

    serviceUnavailable: (): ErrorMessage => ({
      title: 'Service temporarily unavailable',
      message: 'The service is undergoing maintenance. Please try again in a few moments.',
      action: 'Retry',
      retryable: true,
      category: 'server',
      statusCode: 503,
    }),

    notFound: (): ErrorMessage => ({
      title: 'Not found',
      message: 'The resource you are looking for does not exist.',
      retryable: false,
      category: 'notfound',
      statusCode: 404,
    }),
  },

  // Business logic
  lead: {
    alreadyAssigned: (): ErrorMessage => ({
      title: 'Lead already assigned',
      message: 'This lead is already assigned to another consultant.',
      retryable: false,
      category: 'validation',
    }),

    statusTransitionInvalid: (): ErrorMessage => ({
      title: 'Invalid status change',
      message:
        'This status change is not allowed from the current state. Refresh and try again.',
      retryable: true,
      category: 'validation',
    }),

    cannotDelete: (): ErrorMessage => ({
      title: 'Cannot delete lead',
      message:
        'This lead cannot be deleted because it has already been processed.',
      retryable: false,
      category: 'validation',
    }),
  },

  // File operations
  file: {
    uploadFailed: (): ErrorMessage => ({
      title: 'Upload failed',
      message: 'The file upload failed. Please try again.',
      action: 'Retry',
      retryable: true,
      category: 'network',
    }),

    fileTooLarge: (maxSizeMB: number): ErrorMessage => ({
      title: 'File too large',
      message: `File size exceeds the ${maxSizeMB}MB limit. Please choose a smaller file.`,
      retryable: true,
      category: 'validation',
    }),

    invalidFileType: (allowedTypes: string): ErrorMessage => ({
      title: 'Invalid file type',
      message: `Please upload a file of type: ${allowedTypes}`,
      retryable: true,
      category: 'validation',
    }),
  },
}

/**
 * Error context wrapper for better error messages
 * Wraps a function and provides context-aware error handling
 */
export function withErrorContext<T extends unknown[], R>(
  fn: (...args: T) => Promise<R> | R,
  context: string,
) {
  return async (...args: T): Promise<{ data: R | null; error: ErrorMessage | null }> => {
    try {
      const data = await fn(...args)
      return { data, error: null }
    } catch (err) {
      const error = resolveErrorMessage(err, context)
      return { data: null, error }
    }
  }
}
