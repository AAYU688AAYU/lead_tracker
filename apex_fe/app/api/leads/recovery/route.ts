import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/server'

/**
 * GET /api/leads/recovery
 *
 * Gap recovery endpoint: fetch leads modified since a given timestamp
 * Used by RealtimeProvider to recover missed updates during disconnections
 *
 * Query params:
 *   - since: number (timestamp in milliseconds)
 *   - consultant_id: string (required)
 *
 * Returns:
 *   - Array of leads modified since the given time
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const since = parseInt(searchParams.get('since') || '0')
    const consultantId = searchParams.get('consultant_id')

    if (!consultantId) {
      return NextResponse.json(
        { error: 'Missing consultant_id parameter' },
        { status: 400 }
      )
    }

    // Verify consultant_id matches authenticated user
    if (consultantId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const supabase = createClient()
    const sinceDate = new Date(since).toISOString()

    // Fetch leads modified since the given timestamp
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('consultant_id', consultantId)
      .gte('updated_at', sinceDate)
      .order('updated_at', { ascending: false })
      .limit(100) // Limit to prevent huge payloads

    if (error) {
      console.error('[GET /api/leads/recovery] Query error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (err) {
    console.error('[GET /api/leads/recovery] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
