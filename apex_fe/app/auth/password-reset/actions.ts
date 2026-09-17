'use server'

/**
 * Password Reset Server Actions
 * Phase 10: Secure password reset with email verification
 */

import {
  requestPasswordReset,
  validatePasswordResetToken,
  completePasswordReset,
  validatePasswordComplexity,
} from '@/lib/auth/password-reset'

/**
 * Action: Request password reset
 * Sends reset link to user's email
 */
export async function requestPasswordResetAction(email: string): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  if (!email || !email.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' }
  }

  try {
    const result = await requestPasswordReset(email)
    return result
  } catch (err) {
    console.error('[requestPasswordReset] error:', err)
    return {
      success: false,
      error: 'An error occurred. Please try again later.',
    }
  }
}

/**
 * Action: Validate reset token on reset page load
 * Checks if token is still valid
 */
export async function validateResetTokenAction(
  token: string,
  email: string
): Promise<{
  isValid: boolean
  error?: string
}> {
  if (!token || !email) {
    return { isValid: false, error: 'Invalid reset link' }
  }

  try {
    const result = await validatePasswordResetToken(token, email)
    if (result.error) {
      return { isValid: false, error: result.error }
    }
    return { isValid: true }
  } catch (err) {
    console.error('[validateResetToken] error:', err)
    return {
      isValid: false,
      error: 'An error occurred validating your reset link.',
    }
  }
}

/**
 * Action: Complete password reset
 * Validates token and updates password
 */
export async function completePasswordResetAction(
  token: string,
  email: string,
  newPassword: string,
  confirmPassword: string
): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  // Validation
  if (!token || !email || !newPassword) {
    return { success: false, error: 'Missing required fields.' }
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: 'Passwords do not match.' }
  }

  // Check password complexity
  const validation = validatePasswordComplexity(newPassword)
  if (!validation.isValid) {
    return { success: false, error: validation.errors[0] }
  }

  try {
    const result = await completePasswordReset(token, email, newPassword)
    return result
  } catch (err) {
    console.error('[completePasswordReset] error:', err)
    return {
      success: false,
      error: 'An error occurred resetting your password.',
    }
  }
}
