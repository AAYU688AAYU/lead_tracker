'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/supabase/types'

interface UseAuthReturn {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  error: Error | null
}

/**
 * useAuth Hook
 *
 * Provides current user session and profile data from Supabase.
 * Used in client components to check authentication status and access user info.
 *
 * Returns:
 *   - user: Current authenticated user (from Supabase auth)
 *   - profile: User profile data from the profiles table
 *   - isLoading: True while fetching initial session and profile
 *   - error: Any error encountered during fetch
 *
 * Usage:
 *   const { user, profile, isLoading } = useAuth()
 *   if (isLoading) return <Spinner />
 *   if (!user) return <Redirect to="/login" />
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Fetch current session and profile on mount
    const initAuth = async () => {
      try {
        // Get current session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) throw sessionError

        if (session?.user) {
          setUser(session.user)

          // Fetch user profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (profileError && profileError.code !== 'PGRST116') {
            // PGRST116 = no rows returned
            throw profileError
          }

          setProfile(profileData || null)
        }

        setIsLoading(false)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        setIsLoading(false)
      }
    }

    initAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)

        // Fetch profile when auth state changes
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        setProfile(profileData || null)
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  return { user, profile, isLoading, error }
}
