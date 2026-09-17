/**
 * Application & Intake Schema
 *
 * Validates public-facing form inputs:
 * - Student application/intake form
 * - Consolidated from app/apply/actions.ts custom validation
 */

import { z } from 'zod'

// International phone number validation helper
function isValidPhoneNumber(value: string): boolean {
  // Accept phone numbers in various formats, validate using basic patterns
  // Format: +[country code][number], with dashes/spaces optional
  const phoneRegex = /^(\+\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/
  return phoneRegex.test(value.replace(/\s/g, ''))
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT APPLICATION / INTAKE FORM
// ─────────────────────────────────────────────────────────────────────────────

export const submitApplicationSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Full name is required')
    .min(2, 'Full name must be at least 2 characters')
    .max(255, 'Full name must not exceed 255 characters')
    .trim()
    .regex(/^[\p{L}\s'-]+$/u, 'Full name can only contain letters, spaces, hyphens, and apostrophes'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(255, 'Email must not exceed 255 characters')
    .toLowerCase()
    .trim(),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .min(6, 'Phone number must be at least 6 digits')
    .max(20, 'Phone number must not exceed 20 characters')
    .trim()
    .refine(isValidPhoneNumber, 'Invalid phone number format'),
  program_id: z
    .string()
    .uuid('Invalid program ID'),
  notes: z
    .string()
    .max(500, 'Notes must not exceed 500 characters')
    .trim()
    .optional()
    .catch(undefined),
})

export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>

// ─────────────────────────────────────────────────────────────────────────────
// SET PASSWORD (for new users after application)
// ─────────────────────────────────────────────────────────────────────────────

export const setApplicationPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, 'Password is required')
      .min(12, 'Password must be at least 12 characters')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/\d/, 'Password must contain a number')
      .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain a special character'),
    confirmPassword: z
      .string()
      .min(1, 'Confirm password is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type SetApplicationPasswordInput = z.infer<typeof setApplicationPasswordSchema>
