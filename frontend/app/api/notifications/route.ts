import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/server'
import { sanitizeQueryParams } from '@/lib/api/auth-guard'

/**
 * GET /api/notifications
 * Phase 10: Secure notification fetching with server-side authorization
 *
 * Fetch paginated notifications for the authenticated user
 *
 * Query params:
 *   - page: number (default: 0)
 *   - limit: number (default: 15, max: 50)
 *   - type: string (optional, filter by notification type)
 */
export async function GET(request: NextRequest) {
  try {
    // 1. AUTHENTICATE
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. SANITIZE QUERY PARAMETERS
    const { searchParams } = new URL(request.url)
    const params = sanitizeQueryParams(
      {
        page: searchParams.get('page'),
        limit: searchParams.get('limit'),
        type: searchParams.get('type'),
      },
      {
        page: { type: 'number', default: 0, min: 0 },
        limit: { type: 'number', default: 15, min: 1, max: 50 },
        type: { type: 'string', default: null },
      }
    )

    const page = params.page
    const limit = params.limit
    const filter = params.type

    const supabase = await createClient()
    const offset = page * limit

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Apply type filter if provided
    if (filter && filter !== 'all') {
      query = query.eq('type', filter)
    }

    // Paginate
    query = query.range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) {
      console.error('[GET /api/notifications] Query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const totalCount = count || 0
    const hasMore = offset + limit < totalCount

    return NextResponse.json({
      notifications: data || [],
      unread_count: data?.filter((n: any) => !n.is_read).length || 0,
      total_count: totalCount,
      has_more: hasMore,
      page,
    })
  } catch (err) {
    console.error('[GET /api/notifications] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
