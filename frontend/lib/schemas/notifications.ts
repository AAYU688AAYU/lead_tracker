/**
 * Notifications Schema
 *
 * Validates notification-related inputs:
 * - Notification queries (pagination, filtering)
 * - Notification updates
 */

import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION & QUERY PARAMS
// ─────────────────────────────────────────────────────────────────────────────

export const notificationQuerySchema = z.object({
  page: z
    .union([z.string(), z.number()])
    .pipe(z.coerce.number())
    .refine(val => Number.isInteger(val), 'Page must be a whole number')
    .min(0, 'Page must be 0 or greater')
    .default(0),
  limit: z
    .union([z.string(), z.number()])
    .pipe(z.coerce.number())
    .refine(val => Number.isInteger(val), 'Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit must not exceed 50')
    .default(15),
  type: z
    .string()
    .optional()
    .catch(undefined),
})

export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>

// ─────────────────────────────────────────────────────────────────────────────
// MARK NOTIFICATION AS READ
// ─────────────────────────────────────────────────────────────────────────────

export const markNotificationAsReadSchema = z.object({
  notification_id: z
    .string()
    .uuid('Invalid notification ID'),
})

export type MarkNotificationAsReadInput = z.infer<typeof markNotificationAsReadSchema>

// ─────────────────────────────────────────────────────────────────────────────
// BULK DELETE NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const bulkDeleteNotificationsSchema = z.object({
  notification_ids: z
    .array(
      z.string().uuid('Each notification ID must be a valid UUID'),
      { message: 'Must provide an array of notification IDs' }
    )
    .min(1, 'Must provide at least one notification ID')
    .max(100, 'Cannot delete more than 100 notifications at once'),
})

export type BulkDeleteNotificationsInput = z.infer<typeof bulkDeleteNotificationsSchema>

// ─────────────────────────────────────────────────────────────────────────────
// GET NOTIFICATIONS (Server action version)
// ─────────────────────────────────────────────────────────────────────────────

export const getNotificationsSchema = z.object({
  page: z
    .number()
    .int('Page must be a whole number')
    .min(0, 'Page must be 0 or greater'),
  limit: z
    .number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit must not exceed 50'),
  filter: z
    .string()
    .optional(),
})

export type GetNotificationsInput = z.infer<typeof getNotificationsSchema>
