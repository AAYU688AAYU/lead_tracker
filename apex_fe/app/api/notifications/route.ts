import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/server'

/**
 * GET /api/notifications
 *
 * Fetch paginated notifications for the current user
 *
 * Query params:
 *   - consultant_id: string (required)
 *   - page: number (default: 0)
 *   - limit: number (default: 15)
 *   - filter: string (optional, e.g., 'lead_assigned', 'lead_stalled')
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '0')
    const limit = parseInt(searchParams.get('limit') || '15')
    const filter = searchParams.get('filter')

    const supabase = createClient()
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
