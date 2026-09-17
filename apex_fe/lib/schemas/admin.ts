/**
 * Admin Dashboard Schema
 *
 * Validates admin-related inputs:
 * - Team management (activate, deactivate, offboard)
 * - Pipeline settings (stage labels, thresholds)
 * - Analytics queries
 */

import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// TEAM MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// Pipeline stages for settings
const PIPELINE_STAGES = [
  'initial_contact',
  'in_progress',
  'assessment_pending',
  'interview_scheduled',
  'interview_completed',
  'decision_pending',
  'enrolled',
  'deferred',
] as const

// Severity levels for escalations
const SEVERITY_LEVELS = ['NONE', 'MEDIUM', 'HIGH', 'CRITICAL'] as const

export const toggleAcceptingSchema = z.object({
  consultant_id: z
    .string()
    .uuid('Invalid consultant ID'),
  new_value: z
    .boolean({ message: 'Must be true or false' }),
})

export type ToggleAcceptingInput = z.infer<typeof toggleAcceptingSchema>

// ─────────────────────────────────────────────────────────────────────────────
// DEACTIVATE CONSULTANT
// ─────────────────────────────────────────────────────────────────────────────

export const deactivateConsultantSchema = z.object({
  consultant_id: z
    .string()
    .uuid('Invalid consultant ID'),
})

export type DeactivateConsultantInput = z.infer<typeof deactivateConsultantSchema>

// ─────────────────────────────────────────────────────────────────────────────
// OFFBOARD CONSULTANT (Reassign leads to another consultant)
// ─────────────────────────────────────────────────────────────────────────────

export const offboardConsultantSchema = z
  .object({
    from_id: z
      .string()
      .uuid('Invalid consultant ID'),
    to_id: z
      .string()
      .uuid('Invalid consultant ID'),
  })
  .refine((data) => data.from_id !== data.to_id, {
    message: 'Cannot offboard consultant to themselves',
    path: ['to_id'],
  })

export type OffboardConsultantInput = z.infer<typeof offboardConsultantSchema>

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE SETTINGS — UPDATE STAGE LABEL
// ─────────────────────────────────────────────────────────────────────────────

export const updateStageLabelSchema = z.object({
  stage: z
    .enum(PIPELINE_STAGES, { message: 'Invalid stage' }),
  label: z
    .string()
    .min(1, 'Stage label is required')
    .max(60, 'Stage label must not exceed 60 characters')
    .trim(),
})

export type UpdateStageLabelInput = z.infer<typeof updateStageLabelSchema>

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE SETTINGS — UPDATE STALL THRESHOLD
// ─────────────────────────────────────────────────────────────────────────────

export const updateStallThresholdSchema = z.object({
  stage: z
    .enum(PIPELINE_STAGES, { message: 'Invalid stage' }),
  stall_threshold_hours: z
    .union([z.string(), z.number()])
    .pipe(z.coerce.number())
    .int('Must be a whole number')
    .min(1, 'Threshold must be at least 1 hour')
    .max(8760, 'Threshold must not exceed 1 year (8760 hours)'),
})

export type UpdateStallThresholdInput = z.infer<typeof updateStallThresholdSchema>

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE SETTINGS — UPDATE ESCALATION THRESHOLD
// ─────────────────────────────────────────────────────────────────────────────

export const updateEscalationThresholdSchema = z.object({
  stage: z
    .enum(PIPELINE_STAGES, { message: 'Invalid stage' }),
  escalation_threshold_hours: z
    .union([z.string(), z.number()])
    .pipe(z.coerce.number())
    .int('Must be a whole number')
    .min(1, 'Threshold must be at least 1 hour')
    .max(8760, 'Threshold must not exceed 1 year (8760 hours)'),
})

export type UpdateEscalationThresholdInput = z.infer<typeof updateEscalationThresholdSchema>

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE SETTINGS — UPDATE SEVERITY LEVEL
// ─────────────────────────────────────────────────────────────────────────────

export const updateSeverityLevelSchema = z.object({
  stage: z
    .enum(PIPELINE_STAGES, { message: 'Invalid stage' }),
  severity_level: z
    .enum(SEVERITY_LEVELS, { message: 'Invalid severity level' }),
})

export type UpdateSeverityLevelInput = z.infer<typeof updateSeverityLevelSchema>

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS QUERY
// ─────────────────────────────────────────────────────────────────────────────

export const analyticsQuerySchema = z.object({
  from: z
    .string()
    .datetime('Invalid date format, use ISO 8601')
    .optional()
    .catch(undefined),
  to: z
    .string()
    .datetime('Invalid date format, use ISO 8601')
    .optional()
    .catch(undefined),
  consultant_id: z
    .string()
    .uuid('Invalid consultant ID')
    .optional()
    .catch(undefined),
})

export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>

// ─────────────────────────────────────────────────────────────────────────────
// Type exports
// ─────────────────────────────────────────────────────────────────────────────

export type PipelineStage = (typeof PIPELINE_STAGES)[number]
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number]
