import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StatusClient } from './status-client'

export const metadata: Metadata = {
  title:       'Application Status — Apex',
  description: 'Look up your student application status and upload documents.',
}

// ---------------------------------------------------------------------------
// /status — public page, no login required.
//
// If the visitor is already authenticated as a student, redirect them to
// the dashboard where they can see their full application status, reference
// code, and document upload — no need to re-enter credentials here.
//
// Unauthenticated visitors (students who have not yet set a password, or
// anyone looking up on a different device) get the reference-code + email
// lookup form as before.
// ---------------------------------------------------------------------------

export default async function StatusPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Any authenticated user goes to their role-appropriate dashboard.
    // The root page already handles role routing, so redirect there.
    redirect('/dashboard/student')
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-16 sm:py-24">
      <div className="mx-auto w-full max-w-[560px]">

        {/* Page header */}
        <div className="mb-8">
          <svg
            className="mb-4 h-10 w-10 text-[var(--accent)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 2.5" />
          </svg>

          <h1 className="text-2xl font-semibold text-[var(--text)]">
            Application status
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Enter your reference code and email address to track your application
            and upload documents.
          </p>
        </div>

        <StatusClient />

      </div>
    </main>
  )
}
