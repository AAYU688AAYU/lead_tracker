import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/server'
import { logUnauthorizedAccess } from '@/lib/api/auth-guard'

/**
 * PATCH /api/notifications/[id]
 * Phase 10: Secure single notification update with explicit ownership verification
 *
 * Mark a single notification as read
 * Only allows authenticated user to update their own notifications
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. AUTHENTICATE
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const notificationId = params.id

    // 2. AUTHORIZE — Verify notification belongs to authenticated user
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('user_id')
      .eq('id', notificationId)
      .single()

    if (fetchError || !notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    // 3. VERIFY OWNERSHIP
    if (notification.user_id !== user.id) {
      // Log unauthorized access attempt
      await logUnauthorizedAccess(user.id, 'notification_update', {
        notification_id: notificationId,
        notification_owner: notification.user_id,
        attempted_by: user.id,
        reason: 'Ownership verification failed',
      }, supabase)

      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // 4. UPDATE — Only the owned notification
    const { error: updateError } = await supabase
      .from('notifications')
      .update({
        is_read: true,
      })
      .eq('id', notificationId)
      .eq('user_id', user.id)  // Double-check in WHERE clause

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[PATCH /api/notifications/[id]] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
