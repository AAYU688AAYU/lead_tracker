/**
 * Phone Number Utilities
 * Phase 10 MEDIUM #15: Normalize phone numbers to E.164 format
 *
 * E.164 is the international standard for phone numbers:
 * - Format: +[country code][number]
 * - Example: +14155552671 (US), +44 20 7946 0958 (UK), +33 1 42 68 53 00 (France)
 * - Always starts with +
 * - Only digits after country code
 * - No spaces, hyphens, or parentheses
 *
 * Benefits of E.164 normalization:
 * - Prevents duplicate records (same number stored differently)
 * - Enables accurate international SMS/calls via Twilio, Resend
 * - Consistent data for analytics and reporting
 * - Simplifies searching and filtering
 * - Required by many telecom APIs
 */

import {
  parsePhoneNumber,
  isValidPhoneNumber,
  getCountryCallingCode,
  type CountryCode,
} from 'libphonenumber-js'

/**
 * Parse and normalize phone number to E.164 format
 *
 * @param phoneInput Raw phone number from user
 * @param defaultCountry Default country code if number is ambiguous (e.g., 'US', 'FR')
 * @returns E.164 formatted number or null if invalid
 *
 * @example
 * normalizePhoneNumber('(415) 555-2671') // '+14155552671'
 * normalizePhoneNumber('+33 1 42 68 53 00') // '+33142685300'
 * normalizePhoneNumber('079 4609 0958', 'GB') // '+442079460958'
 */
export function normalizePhoneNumber(
  phoneInput: string,
  defaultCountry?: CountryCode
): string | null {
  if (!phoneInput || typeof phoneInput !== 'string') {
    return null
  }

  try {
    const trimmed = phoneInput.trim()

    // Parse with optional default country for ambiguous formats
    const parsed = parsePhoneNumber(trimmed, defaultCountry)

    if (!parsed) {
      return null
    }

    // Validate and return E.164 format
    if (isValidPhoneNumber(trimmed, defaultCountry)) {
      return parsed.format('E.164')
    }

    return null
  } catch {
    return null
  }
}

/**
 * Batch normalize multiple phone numbers
 * Useful for data migration and bulk imports
 *
 * @returns Object mapping input to result (or null if invalid)
 */
export function normalizePhoneNumbers(
  phoneInputs: string[],
  defaultCountry?: CountryCode
): Record<string, string | null> {
  const results: Record<string, string | null> = {}

  for (const input of phoneInputs) {
    const normalized = normalizePhoneNumber(input, defaultCountry)
    results[input] = normalized
  }

  return results
}

/**
 * Validate phone number and return both raw and normalized
 *
 * @returns Object with validation result and details
 */
export function validateAndNormalizePhoneNumber(
  phoneInput: string,
  defaultCountry?: CountryCode
): {
  isValid: boolean
  normalized?: string
  country?: string
  dialingCode?: string
  nationalNumber?: string
  error?: string
} {
  if (!phoneInput) {
    return {
      isValid: false,
      error: 'Phone number is required',
    }
  }

  try {
    const trimmed = phoneInput.trim()

    // First validate the string format
    if (!isValidPhoneNumber(trimmed, defaultCountry)) {
      return {
        isValid: false,
        error: 'Invalid phone number format. Use international format or provide country code.',
      }
    }

    // Then parse to get details
    const parsed = parsePhoneNumber(trimmed, defaultCountry)

    if (!parsed) {
      return {
        isValid: false,
        error: 'Phone number format is invalid for the specified country.',
      }
    }

    const countryCode = parsed.country as CountryCode
    return {
      isValid: true,
      normalized: parsed.format('E.164'),
      country: parsed.country,
      dialingCode: `+${getCountryCallingCode(countryCode)}`,
      nationalNumber: parsed.format('NATIONAL'),
    }
  } catch (error) {
    return {
      isValid: false,
      error: `Phone validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Format phone number for display (national format)
 * Shows number in user-friendly format based on country
 *
 * @example
 * formatPhoneForDisplay('+14155552671') // '(415) 555-2671' (US)
 * formatPhoneForDisplay('+33142685300') // '01 42 68 53 00' (France)
 */
export function formatPhoneForDisplay(e164: string): string | null {
  try {
    const parsed = parsePhoneNumber(e164)
    if (!parsed) return null
    return parsed.format('NATIONAL')
  } catch {
    return null
  }
}

/**
 * Format phone number for international display
 *
 * @example
 * formatPhoneInternational('+14155552671') // '+1 415-555-2671'
 */
export function formatPhoneInternational(e164: string): string | null {
  try {
    const parsed = parsePhoneNumber(e164)
    if (!parsed) return null
    return parsed.format('INTERNATIONAL')
  } catch {
    return null
  }
}

/**
 * Extract country code from phone number
 *
 * @example
 * getPhoneCountry('+14155552671') // 'US'
 */
export function getPhoneCountry(e164: string): CountryCode | null {
  try {
    const parsed = parsePhoneNumber(e164)
    if (!parsed) return null
    return parsed.country as CountryCode
  } catch {
    return null
  }
}

/**
 * Check if two phone numbers are the same (handles different formats)
 *
 * @example
 * isSamePhoneNumber('(415) 555-2671', '+14155552671') // true
 * isSamePhoneNumber('+33142685300', '+33 1 42 68 53 00') // true
 */
export function isSamePhoneNumber(
  phone1: string,
  phone2: string,
  defaultCountry?: CountryCode
): boolean {
  const normalized1 = normalizePhoneNumber(phone1, defaultCountry)
  const normalized2 = normalizePhoneNumber(phone2, defaultCountry)

  if (!normalized1 || !normalized2) {
    return false
  }

  return normalized1 === normalized2
}

/**
 * Get dialing code for country
 *
 * @example
 * getCountryDialingCode('US' as CountryCode) // '+1'
 * getCountryDialingCode('FR' as CountryCode) // '+33'
 */
export function getCountryDialingCode(countryCode: CountryCode): string {
  return `+${getCountryCallingCode(countryCode)}`
}

/**
 * Common country codes for easy reference
 */
export const COMMON_COUNTRY_CODES = {
  US: 'US',
  CA: 'CA',
  GB: 'GB',
  FR: 'FR',
  DE: 'DE',
  IT: 'IT',
  ES: 'ES',
  AU: 'AU',
  NZ: 'NZ',
  JP: 'JP',
  CN: 'CN',
  IN: 'IN',
  BR: 'BR',
  MX: 'MX',
} as const

/**
 * Helpful error messages for phone validation
 */
export const PHONE_VALIDATION_MESSAGES = {
  REQUIRED: 'Phone number is required',
  INVALID_FORMAT: 'Enter a valid phone number',
  INVALID_COUNTRY: 'Phone number format is invalid for the specified country',
  TOO_SHORT: 'Phone number is too short',
  TOO_LONG: 'Phone number is too long',
  NO_DIGITS: 'Phone number must contain at least one digit',
  PARSE_ERROR: 'Unable to parse phone number',
} as const

/**
 * Server-side phone normalization for database storage
 * Should be called before inserting/updating phone numbers in database
 *
 * @param phoneInput Raw phone from form
 * @param defaultCountry Default country if not specified in input
 * @returns Normalized E.164 or null (invalid)
 */
export function normalizePhoneForDatabase(
  phoneInput: string | undefined,
  defaultCountry?: CountryCode
): string | null {
  if (!phoneInput) return null
  const normalized = normalizePhoneNumber(phoneInput, defaultCountry)
  return normalized
}

/**
 * Validate for Twilio compatibility
 * Twilio uses E.164 format
 */
export function isValidForTwilio(phoneInput: string): boolean {
  const normalized = normalizePhoneNumber(phoneInput)
  if (!normalized) return false

  // Twilio requires E.164 format with +
  return /^\+[1-9]\d{1,14}$/.test(normalized)
}

/**
 * Validate for Resend SMS (if supported)
 * Currently Resend focuses on email but may support SMS
 */
export function isValidForResend(phoneInput: string): boolean {
  // Resend primarily uses E.164
  return isValidForTwilio(phoneInput)
}

/**
 * Mask phone number for display (hide sensitive digits)
 * Useful for PII protection in logs/UI
 *
 * @example
 * maskPhoneNumber('+14155552671') // '+1415***2671'
 */
export function maskPhoneNumber(e164: string): string {
  if (!e164 || e164.length < 4) return e164

  // Keep country code and last 4 digits visible
  const visible = 4
  const masked = '*'.repeat(Math.max(0, e164.length - visible - 3))
  return e164.slice(0, e164.length - visible - masked.length) + masked + e164.slice(-visible)
}

/**
 * Deduplicate phone numbers by normalizing all and removing duplicates
 * Useful for bulk operations and data cleanup
 *
 * @returns Array of unique E.164 formatted numbers
 */
export function deduplicatePhoneNumbers(
  phoneInputs: string[],
  defaultCountry?: CountryCode
): string[] {
  const normalized = new Set<string>()

  for (const input of phoneInputs) {
    const normal = normalizePhoneNumber(input, defaultCountry)
    if (normal) {
      normalized.add(normal)
    }
  }

  return Array.from(normalized)
}

/**
 * Type-safe country code selector
 * Used to ensure only valid country codes are passed
 */
export type SupportedCountry = keyof typeof COMMON_COUNTRY_CODES
