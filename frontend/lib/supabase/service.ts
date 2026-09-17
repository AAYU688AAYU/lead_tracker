/**
 * Service-role Supabase client — bypasses Row-Level Security.
 * ONLY import this in Server Actions or Route Handlers.
 * Never expose to the client bundle.
 */
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars',
    )
  }

  return createSupabaseClient<Database>(url, key, {
    auth: {
      // Service role must NOT persist sessions or auto-refresh tokens
      persistSession:   false,
      autoRefreshToken: false,
    },
  })
}
