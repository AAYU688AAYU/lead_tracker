// ---------------------------------------------------------------------------
// Shared types for the /apply intake form.
// Intentionally NOT a 'use server' file — this module is imported by both
// the server action (actions.ts) and the client component (intake-form.tsx).
// 'use server' files may only export async functions; interfaces and constants
// must live here instead.
// ---------------------------------------------------------------------------

export interface ApplyFormState {
  status: 'idle' | 'success' | 'error'
  /** Field-level validation errors keyed by field name */
  fieldErrors: {
    full_name?:  string[]
    email?:      string[]
    phone?:      string[]
    program_id?: string[]
    notes?:      string[]
  }
  /** Non-field server error shown in the summary banner */
  serverError?: string
  /** Populated on success — the DB-generated reference code */
  referenceCode?: string
  /** Echo back so the status-page link can pre-fill the email field */
  submittedEmail?: string
  /**
   * Auth user ID echoed on success — passed to setPassword so it can call
   * auth.admin.updateUserById without needing a separate DB lookup.
   */
  userId?: string
}

/** Safe initial state for useActionState — fieldErrors is always an object. */
export const INITIAL_STATE: ApplyFormState = {
  status:      'idle',
  fieldErrors: {},
}

// ---------------------------------------------------------------------------
// Set-password form state (inline in the confirmation panel)
// ---------------------------------------------------------------------------

export interface SetPasswordState {
  status: 'idle' | 'submitting' | 'success' | 'error'
  error?: string
}

export const INITIAL_SET_PASSWORD_STATE: SetPasswordState = {
  status: 'idle',
}
