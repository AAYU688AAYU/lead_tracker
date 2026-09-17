/**
 * Lead Management Schema
 *
 * Validates lead-related inputs:
 * - Stage transitions
 * - Lead status changes
 * - Communication logs
 * - Document reviews
 * - Lead notes
 * - Consultant reassignment
 */

import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// VALID ENUMS
// ─────────────────────────────────────────────────────────────────────────────

// Pipeline stages (must match database enum)
const LEAD_STAGES = [
  'initial_contact',
  'in_progress',
  'assessment_pending',
  'interview_scheduled',
  'interview_completed',
  'decision_pending',
  'enrolled',
  'deferred',
] as const

// Lead statuses (must match database enum)
const LEAD_STATUSES = ['active', 'stalled', 'completed', 'dropped'] as const

// Communication channels
const COMMUNICATION_CHANNELS = ['call', 'email', 'whatsapp', 'in_person'] as const

// Document review actions
const DOCUMENT_ACTIONS = ['approved', 'rejected'] as const

// ─────────────────────────────────────────────────────────────────────────────
// ADVANCE STAGE (Consultant Dashboard & Drawer)
// ─────────────────────────────────────────────────────────────────────────────

export const advanceStageSchema = z.object({
  lead_id: z
    .string()
    .uuid('Invalid lead ID'),
  current_stage: z
    .enum(LEAD_STAGES, { message: 'Invalid stage' }),
  dashboard: z
    .enum(['consultant', 'admin'])
    .optional()
    .catch(undefined),
})

export type AdvanceStageInput = z.infer<typeof advanceStageSchema>

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE LEAD STATUS
// ─────────────────────────────────────────────────────────────────────────────

export const updateLeadStatusSchema = z.object({
  lead_id: z
    .string()
    .uuid('Invalid lead ID'),
  status: z
    .enum(LEAD_STATUSES, { message: 'Invalid status' }),
})

export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>

// ─────────────────────────────────────────────────────────────────────────────
// LOG COMMUNICATION
// ─────────────────────────────────────────────────────────────────────────────

export const logCommunicationSchema = z.object({
  lead_id: z
    .string()
    .uuid('Invalid lead ID'),
  channel: z
    .enum(COMMUNICATION_CHANNELS, { message: 'Invalid communication channel' }),
  summary: z
    .string()
    .min(1, 'Communication summary is required')
    .min(10, 'Summary must be at least 10 characters')
    .max(1000, 'Summary must not exceed 1000 characters')
    .trim(),
  dashboard: z
    .enum(['consultant', 'admin'])
    .optional()
    .catch(undefined),
})

export type LogCommunicationInput = z.infer<typeof logCommunicationSchema>

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW DOCUMENT
// ─────────────────────────────────────────────────────────────────────────────

export const reviewDocumentSchema = z
  .object({
    doc_id: z
      .string()
      .uuid('Invalid document ID'),
    action: z
      .enum(DOCUMENT_ACTIONS, { message: 'Invalid action' }),
    rejection_reason: z
      .string()
      .min(1, 'Rejection reason is required')
      .min(10, 'Reason must be at least 10 characters')
      .max(500, 'Reason must not exceed 500 characters')
      .trim()
      .optional(),
    dashboard: z
      .enum(['consultant', 'admin'])
      .optional()
      .catch(undefined),
  })
  .refine((data) => {
    // If action is 'rejected', rejection_reason is required
    if (data.action === 'rejected' && !data.rejection_reason) {
      return false
    }
    return true
  }, {
    message: 'Rejection reason is required when rejecting',
    path: ['rejection_reason'],
  })

export type ReviewDocumentInput = z.infer<typeof reviewDocumentSchema>

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE LEAD NOTES
// ─────────────────────────────────────────────────────────────────────────────

export const updateLeadNotesSchema = z.object({
  lead_id: z
    .string()
    .uuid('Invalid lead ID'),
  notes: z
    .string()
    .max(1000, 'Notes must not exceed 1000 characters')
    .trim(),
})

export type UpdateLeadNotesInput = z.infer<typeof updateLeadNotesSchema>

// ─────────────────────────────────────────────────────────────────────────────
// REASSIGN CONSULTANT
// ─────────────────────────────────────────────────────────────────────────────

export const reassignConsultantSchema = z.object({
  lead_id: z
    .string()
    .uuid('Invalid lead ID'),
  consultant_id: z
    .string()
    .uuid('Invalid consultant ID')
    .nullable()
    .optional(), // null = unassign
  dashboard: z
    .enum(['consultant', 'admin'])
    .optional()
    .catch(undefined),
})

export type ReassignConsultantInput = z.infer<typeof reassignConsultantSchema>

// ─────────────────────────────────────────────────────────────────────────────
// KANBAN DRAG & DROP (Stage advance via drag)
// ─────────────────────────────────────────────────────────────────────────────

export const advanceStageKanbanSchema = z.object({
  lead_id: z
    .string()
    .uuid('Invalid lead ID'),
  from_stage: z
    .enum(LEAD_STAGES, { message: 'Invalid from stage' }),
  to_stage: z
    .enum(LEAD_STAGES, { message: 'Invalid to stage' }),
})

export type AdvanceStageKanbanInput = z.infer<typeof advanceStageKanbanSchema>

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTANT DETAIL (Admin view)
// ─────────────────────────────────────────────────────────────────────────────

export const consultantDetailSchema = z.object({
  consultant_id: z
    .string()
    .uuid('Invalid consultant ID'),
})

export type ConsultantDetailInput = z.infer<typeof consultantDetailSchema>

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGN CONSULTANT (Admin dashboard)
// ─────────────────────────────────────────────────────────────────────────────

export const assignConsultantSchema = z.object({
  lead_id: z
    .string()
    .uuid('Invalid lead ID'),
  consultant_id: z
    .string()
    .uuid('Invalid consultant ID')
    .nullable()
    .optional(), // null = unassign
})

export type AssignConsultantInput = z.infer<typeof assignConsultantSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Type exports for discriminated unions
// ─────────────────────────────────────────────────────────────────────────────

export type LeadStage = (typeof LEAD_STAGES)[number]
export type LeadStatus = (typeof LEAD_STATUSES)[number]
export type CommunicationChannel = (typeof COMMUNICATION_CHANNELS)[number]
export type DocumentAction = (typeof DOCUMENT_ACTIONS)[number]
