/**
 * Authentication Schema
 *
 * Validates all authentication-related inputs:
 * - Sign in (email, password)
 * - Password reset (request, validate, complete)
 * - Password change
 */

import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD VALIDATION HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Zod refinement for password complexity
 * Validates NIST 800-63B requirements with pattern detection
 */
const passwordComplexityRefinement = z
  .string()
  .min(1, 'Password is required')
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must be no more than 128 characters')
  .refine(
    (pwd) => /[A-Z]/.test(pwd),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (pwd) => /[a-z]/.test(pwd),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    (pwd) => /\d/.test(pwd),
    'Password must contain at least one number'
  )
  .refine(
    (pwd) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
    'Password must contain at least one special character'
  )
  .refine(
    (pwd) => !/\s/.test(pwd),
    'Password cannot contain spaces or whitespace'
  )

// ─────────────────────────────────────────────────────────────────────────────
// SIGN IN
// ─────────────────────────────────────────────────────────────────────────────

export const signInSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
  next: z
    .string()
    .url()
    .optional()
    .catch(undefined),
})

export type SignInInput = z.infer<typeof signInSchema>

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD RESET REQUEST
// ─────────────────────────────────────────────────────────────────────────────

export const passwordResetRequestSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
})

export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD RESET COMPLETE
// ─────────────────────────────────────────────────────────────────────────────

export const passwordResetCompleteSchema = z
  .object({
    token: z
      .string()
      .min(1, 'Reset token is required')
      .min(32, 'Invalid reset token'),
    password: passwordComplexityRefinement,
    confirmPassword: z
      .string()
      .min(1, 'Confirm password is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type PasswordResetCompleteInput = z.infer<typeof passwordResetCompleteSchema>

// ─────────────────────────────────────────────────────────────────────────────
// SET PASSWORD (for new users after signup)
// ─────────────────────────────────────────────────────────────────────────────

export const setPasswordSchema = z
  .object({
    password: passwordComplexityRefinement,
    confirmPassword: z
      .string()
      .min(1, 'Confirm password is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type SetPasswordInput = z.infer<typeof setPasswordSchema>

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE PASSWORD (for authenticated users)
// ─────────────────────────────────────────────────────────────────────────────

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Current password is required'),
    newPassword: passwordComplexityRefinement,
    confirmPassword: z
      .string()
      .min(1, 'Confirm password is required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  })

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
