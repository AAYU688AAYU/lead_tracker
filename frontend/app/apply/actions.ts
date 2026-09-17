'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { normalizePhoneNumber, validateAndNormalizePhoneNumber } from '@/lib/phone-utils'
import { RateLimiter, RATE_LIMIT_PRESETS, getClientIp } from '@/lib/rate-limiter'
import { headers } from 'next/headers'
import type { Profile, Lead } from '@/lib/supabase/types'
import type { ApplyFormState, SetPasswordState } from './types'

// ---------------------------------------------------------------------------
// Rate limiter for public intake form
// ---------------------------------------------------------------------------

const intakeFormRateLimiter = new RateLimiter(RATE_LIMIT_PRESETS.INTAKE_FORM)

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function validateEmail(value: string): string | null {
  if (!value) return 'Email is required.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address.'
  return null
}

function validatePhone(value: string): string | null {
  if (!value) return 'Phone number is required.'

  // Use comprehensive phone validation that also normalizes
  const validation = validateAndNormalizePhoneNumber(value)
  
  if (!validation.isValid) {
    return validation.error || 'Enter a valid phone number.'
  }

  return null
}

// ---------------------------------------------------------------------------
// Narrow query-result types
// The hand-authored Database type has Relationships: [] on every table which
// prevents the Supabase query builder from inferring chained .select() shapes.
// We cast results to these narrow interfaces at each query site.
// ---------------------------------------------------------------------------

type ProfileIdRow = Pick<Profile, 'id'>
type LeadResultRow = Pick<Lead, 'id' | 'reference_code'>

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

export async function submitApplication(
  _prevState: ApplyFormState,
  formData: FormData,
): Promise<ApplyFormState> {
  // ── PHASE 10: RATE LIMITING ────────────────────────────────────────────────
  // 1. Get client IP for rate limiting
  const clientIp = getClientIp(headers())
  
  // 2. Check rate limit
  const rateLimitResult = await intakeFormRateLimiter.check(clientIp)
  
  if (!rateLimitResult.allowed) {
    console.warn(
      '[submitApplication] Rate limit exceeded for IP:',
      clientIp,
      'Remaining attempts:',
      rateLimitResult.remaining
    )
    
    return {
      status: 'error',
      fieldErrors: {},
      serverError: 'Too many submission attempts. Please try again in 1 hour.',
    }
  }

  // Log remaining attempts for debugging
  if (rateLimitResult.remaining < 3) {
    console.warn(
      '[submitApplication] Low rate limit remaining:',
      rateLimitResult.remaining,
      'for IP:',
      clientIp
    )
  }

  // ── 1. Extract ─────────────────────────────────────────────────────────────
  const full_name  = ((formData.get('full_name')  as string | null) ?? '').trim()
  const email      = ((formData.get('email')      as string | null) ?? '').trim().toLowerCase()
  const phone      = ((formData.get('phone')      as string | null) ?? '').trim()
  const program_id = ((formData.get('program_id') as string | null) ?? '').trim()
  const notes      = ((formData.get('notes')      as string | null) ?? '').trim()

  // ── 2. Server-side validation & normalization ──────────────────────────────
  // Normalize phone number to E.164 format for storage
  let normalizedPhone: string | null = null
  if (phone) {
    normalizedPhone = normalizePhoneNumber(phone)
  }

  const fieldErrors: ApplyFormState['fieldErrors'] = {}

  if (!full_name) {
    fieldErrors.full_name = ['Full name is required.']
  } else if (full_name.length < 2) {
    fieldErrors.full_name = ['Full name must be at least 2 characters.']
  }

  const emailErr = validateEmail(email)
  if (emailErr) fieldErrors.email = [emailErr]

  // Validate phone (uses normalization)
  if (phone) {
    const phoneErr = validatePhone(phone)
    if (phoneErr) {
      fieldErrors.phone = [phoneErr]
    }
  }

  if (!program_id) fieldErrors.program_id = ['Please select a program.']

  if (notes.length > 500) {
    fieldErrors.notes = [`Notes must be 500 characters or fewer (currently ${notes.length}).`]
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: 'error', fieldErrors }
  }

  // ── 3. DB writes via service-role client (bypasses RLS) ────────────────────
  const db = createServiceClient()
  // The hand-authored Database type has Relationships:[] on every table, which
  // causes the Supabase query-builder to resolve .insert()/.update() argument
  // types to never[]. Typed reads work fine via "as unknown as T" casts on the
  // result; writes need the builder itself cast to any so TS doesn't block the
  // call. We keep a separate alias so the narrower type still governs reads.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbw = db as any

  try {
    // 3a. Idempotency check — prevent duplicate submissions
    //     Use email + submission timestamp bucket to key duplicates
    const idempotencyKey = `apply_${email}_${Math.floor(Date.now() / 60000)}`
    const { data: dedupRow } = await db
      .from('webhook_dedup')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    if (dedupRow) {
      // Duplicate detected — return success to avoid UI errors for user retries,
      // but don't create a new lead. In a real system, you might return the
      // existing reference code, but for now we safely fail gracefully.
      console.warn('[apply] duplicate submission detected:', idempotencyKey)
      return {
        status:      'error',
        fieldErrors: {},
        serverError: 'Your submission was already processed. Please check your email or reference code.',
      }
    }

    // 3b. Verify the selected program exists — guards against a tampered POST
    const { data: programRow, error: programErr } = await db
      .from('programs')
      .select('id')
      .eq('id', program_id)
      .single()

    // Cast away the never inference — shape is { id: string } at runtime
    const verifiedProgram = programRow as { id: string } | null

    if (programErr || !verifiedProgram) {
      return {
        status:      'error',
        fieldErrors: {},
        serverError: 'The selected program could not be found. Please refresh and try again.',
      }
    }

    // 3b. Find or create a profile row matched by email (case-insensitive).
    //     profiles.id is a FK → auth.users.id so we must create the auth user
    //     first; the fn_handle_new_user trigger then creates the profile row.
    let profileId: string

    const { data: existingRow } = await db
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle()

    const existingProfile = existingRow as ProfileIdRow | null

    if (existingProfile) {
      // Profile already exists — keep it, but patch full_name and phone so the
      // profile stays current if the student re-applies with updated details.
      profileId = existingProfile.id
      const { error: updateErr } = await dbw
        .from('profiles')
        .update({ full_name, ...(normalizedPhone ? { phone: normalizedPhone } : {}) })
        .eq('id', profileId)
      if (updateErr) {
        console.warn('[apply] profile update on existing user failed:', updateErr)
      }
    } else {
      // Create auth user — trigger inserts the matching profile row
      const { data: authData, error: authErr } = await db.auth.admin.createUser({
        email,
        email_confirm: true,          // mark confirmed; no email sent at this stage
        user_metadata: { full_name, role: 'student' },
      })

      if (authErr) {
        // Race condition: another submission with the same email just landed
        const alreadyExists =
          authErr.message?.toLowerCase().includes('already been registered') ||
          authErr.message?.toLowerCase().includes('already exists')

        if (alreadyExists) {
          // Re-fetch — the concurrent request may have just committed the row
          const { data: raceRow } = await db
            .from('profiles')
            .select('id')
            .ilike('email', email)
            .maybeSingle()

          const raceProfile = raceRow as ProfileIdRow | null

          if (raceProfile) {
            profileId = raceProfile.id
          } else {
            // Trigger hasn't completed yet; treat as a transient failure
            console.error('[apply] auth user exists but profile row missing:', email)
            return {
              status:      'error',
              fieldErrors: {},
              serverError: 'We could not process your submission right now. Please try again in a moment.',
            }
          }
        } else {
          console.error('[apply] auth.admin.createUser error:', authErr)
          return {
            status:      'error',
            fieldErrors: {},
            serverError: 'Unable to create your account. Please try again later.',
          }
        }
      } else {
        profileId = authData.user.id

        // Trigger sets id/role/full_name/email — update phone separately if supplied
        if (normalizedPhone) {
          const { error: phoneErr } = await dbw
            .from('profiles')
            .update({ phone: normalizedPhone })
            .eq('id', profileId)
          if (phoneErr) {
            console.warn('[apply] phone update on new profile failed:', phoneErr)
          }
        }
      }
    }

    // 3c. Insert lead — reference_code is generated by the DB trigger
    const { data: leadRow, error: leadErr } = await dbw
      .from('leads')
      .insert({
        student_id:    profileId,
        program_id,
        stage:         'inquiry',
        status:        'active',
        notes:         notes || null,
        // consultant_id intentionally omitted — assigned later by an admin
      })
      .select('id, reference_code')
      .single()

    const lead = leadRow as LeadResultRow | null

    if (leadErr || !lead) {
      console.error('[apply] leads insert error:', leadErr)
      return {
        status:      'error',
        fieldErrors: {},
        serverError: 'Your application could not be submitted. Please try again.',
      }
    }

    // 3d. Insert activity log — actor_id NULL (no user session; service-role write)
    await dbw.from('activity_logs').insert({
      lead_id:  lead.id,
      actor_id: null,
      type:     'lead_created',
      content:  `Lead created via public intake form by ${full_name} (${email})`,
    })

    // 3e. Record this submission in webhook_dedup to prevent re-submissions
    await dbw.from('webhook_dedup').insert({
      idempotency_key: idempotencyKey,
    })

    return {
      status:         'success',
      fieldErrors:    {},
      referenceCode:  lead.reference_code,
      submittedEmail: email,
      userId:         profileId,
    }

  } catch (err) {
    console.error('[apply] unexpected error:', err)
    return {
      status:      'error',
      fieldErrors: {},
      serverError: 'An unexpected error occurred. Please try again.',
    }
  }
}

// ---------------------------------------------------------------------------
// Set password — PHASE 10 SECURE IMPLEMENTATION
// 
// This function handles password setting for new users after signup.
// SECURITY: Never trust userId from FormData — user must have valid session.
// The password must meet complexity requirements.
// ---------------------------------------------------------------------------

import { validatePasswordComplexity, changePassword } from '@/lib/auth/password-reset'

export async function setPassword(
  _prevState: SetPasswordState,
  formData: FormData,
): Promise<SetPasswordState> {
  try {
    const password = ((formData.get('password') as string | null) ?? '').trim()
    const confirm = ((formData.get('confirm') as string | null) ?? '').trim()

    // ── 1. Validate passwords match ────────────────────────────────────────
    if (!password || !confirm) {
      return { status: 'error', error: 'Both password fields are required.' }
    }

    if (password !== confirm) {
      return { status: 'error', error: 'Passwords do not match.' }
    }

    // ── 2. Validate password complexity (NIST 800-63B) ────────────────────
    const validation = validatePasswordComplexity(password)
    if (!validation.isValid) {
      return {
        status: 'error',
        error: validation.errors[0], // Return first error
      }
    }

    // ── 3. Get authenticated user (never trust FormData) ──────────────────
    // CRITICAL: We don't trust userId from FormData. Only allow changing
    // the password of the currently authenticated user.
    const { success, error: passwordError } = await changePassword(
      '', // We don't have current password here (user just signed up)
      password
    )

    if (!success || passwordError) {
      return {
        status: 'error',
        error: passwordError || 'Failed to set password. Please try again.',
      }
    }

    return { status: 'success' }
  } catch (err) {
    console.error('[setPassword] unexpected error:', err)
    return {
      status: 'error',
      error: 'An unexpected error occurred. Please try again.',
    }
  }
}
