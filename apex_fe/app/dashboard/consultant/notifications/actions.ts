'use server'

/**
 * Notification Server Actions
 *
 * Server-side actions for notification management.
 * Handles: fetching, marking as read, bulk operations.
 *
 * Why server actions?
 *   - Direct database access with auth context (RLS enforced)
 *   - Revalidation of related pages after mutations
 *   - Type-safe with NextJS + TypeScript
 *   - Built-in error handling and logging
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth/server'

// ─────────────────────────────────────────────────────────────────────────
// Get Paginated Notifications
// ─────────────────────────────────────────────────────────────────────────

export async function getNotificationsAction(
  page: number = 0,
  limit: number = 15,
  filter?: string
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

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
      console.error('[getNotificationsAction] Query error:', error)
      throw error
    }

    const totalCount = count || 0
    const hasMore = offset + limit < totalCount

    // Get unread count separately for efficiency
    const { data: unreadData } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    return {
      notifications: data || [],
      unread_count: unreadData?.length || 0,
      total_count: totalCount,
      has_more: hasMore,
      page,
    }
  } catch (err) {
    console.error('[getNotificationsAction] Error:', err)
    throw err
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Mark Single Notification as Read
// ─────────────────────────────────────────────────────────────────────────

export async function markNotificationAsReadAction(notificationId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    const supabase = createClient()

    // Verify notification belongs to this user before updating
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('id')
      .eq('id', notificationId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !notification) {
      throw new Error('Notification not found or not authorized')
    }

    // Mark as read
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('id', notificationId)

    if (updateError) {
      throw updateError
    }

    // Revalidate notification UI
    revalidatePath('/dashboard/consultant/notifications')

    return { success: true }
  } catch (err) {
    console.error('[markNotificationAsReadAction] Error:', err)
    throw err
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Mark All Notifications as Read
// ─────────────────────────────────────────────────────────────────────────

export async function markAllNotificationsAsReadAction() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    const supabase = createClient()

    // Mark all unread notifications for this user as read
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) {
      throw error
    }

    // Revalidate
    revalidatePath('/dashboard/consultant/notifications')

    return { success: true }
  } catch (err) {
    console.error('[markAllNotificationsAsReadAction] Error:', err)
    throw err
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Get Initial State (for server-rendered component)
// ─────────────────────────────────────────────────────────────────────────

export async function getNotificationCountAction() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { unread_count: 0 }
    }

    const supabase = createClient()

    const { data, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) {
      console.error('[getNotificationCountAction] Error:', error)
      return { unread_count: 0 }
    }

    return { unread_count: data?.length || 0 }
  } catch (err) {
    console.error('[getNotificationCountAction] Error:', err)
    return { unread_count: 0 }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Delete Notification (soft delete - just mark as read for now)
// ─────────────────────────────────────────────────────────────────────────

export async function deleteNotificationAction(notificationId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    const supabase = createClient()

    // Soft delete: just mark as read (could add deleted_at field if needed)
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id)

    if (error) {
      throw error
    }

    revalidatePath('/dashboard/consultant/notifications')
    return { success: true }
  } catch (err) {
    console.error('[deleteNotificationAction] Error:', err)
    throw err
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Bulk Delete Notifications
// ─────────────────────────────────────────────────────────────────────────

export async function bulkDeleteNotificationsAction(notificationIds: string[]) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    if (notificationIds.length === 0) {
      return { success: true, deleted: 0 }
    }

    const supabase = createClient()

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .in('id', notificationIds)

    if (error) {
      throw error
    }

    revalidatePath('/dashboard/consultant/notifications')
    return { success: true, deleted: notificationIds.length }
  } catch (err) {
    console.error('[bulkDeleteNotificationsAction] Error:', err)
    throw err
  }
}
