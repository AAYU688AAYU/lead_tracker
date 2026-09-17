/**
 * Server Actions Registry
 * Centralized inventory of all server actions with timeout recommendations
 *
 * Phase 10 MEDIUM #14: Track all server actions and their timeout requirements
 */

import type { TimeoutPresetKey } from './server-actions-timeout'

/**
 * Server action metadata for timeout configuration
 */
export interface ServerActionMetadata {
  name: string
  file: string
  description: string
  recommendedTimeout: TimeoutPresetKey
  rationale: string
  dependsOnExternal?: string[] // External services (Resend, Twilio, etc.)
  heavyDatabase?: boolean // If true, uses complex queries or aggregations
  fileUpload?: boolean // If true, handles file uploads
}

/**
 * Complete registry of all server actions
 * This is a reference guide for implementing timeout protection
 */
export const SERVER_ACTIONS_REGISTRY: ServerActionMetadata[] = [
  // ─────────────────────────────────────────────────────────────────────
  // APPLY FLOW
  // ─────────────────────────────────────────────────────────────────────

  {
    name: 'submitApplication',
    file: 'app/apply/actions.ts',
    description: 'Submit new intake form application with file uploads',
    recommendedTimeout: 'SLOW',
    rationale:
      'Handles file uploads (documents), creates lead, sends emails via Resend, can be slow due to file processing and external API calls',
    dependsOnExternal: ['Resend (email)', 'Rate limiter'],
    fileUpload: true,
  },

  {
    name: 'setPassword',
    file: 'app/apply/actions.ts',
    description: 'Set password for new user during onboarding',
    recommendedTimeout: 'FAST',
    rationale: 'Simple operation: hash password, update auth, audit log. No external dependencies.',
  },

  // ─────────────────────────────────────────────────────────────────────
  // AUTH FLOW
  // ─────────────────────────────────────────────────────────────────────

  {
    name: 'requestPasswordReset',
    file: 'app/auth/password-reset/actions.ts',
    description: 'Request password reset token',
    recommendedTimeout: 'FAST',
    rationale:
      'Generate token, create DB record, send email. Simple but includes external email service.',
    dependsOnExternal: ['Resend (email)'],
  },

  {
    name: 'completePasswordReset',
    file: 'app/auth/password-reset/actions.ts',
    description: 'Complete password reset with token validation',
    recommendedTimeout: 'FAST',
    rationale: 'Verify token, update password, mark token used. Fast DB operations.',
  },

  {
    name: 'changePassword',
    file: 'app/auth/password-reset/actions.ts',
    description: 'Change password for authenticated user',
    recommendedTimeout: 'FAST',
    rationale: 'Update password, audit log. No external dependencies.',
  },

  // ─────────────────────────────────────────────────────────────────────
  // STATUS LOOKUP
  // ─────────────────────────────────────────────────────────────────────

  {
    name: 'lookupApplication',
    file: 'app/status/actions.ts',
    description: 'Lookup application status by reference code and email',
    recommendedTimeout: 'FAST',
    rationale: 'Single lead lookup, get stage and document status. Indexed queries.',
  },

  {
    name: 'uploadDocuments',
    file: 'app/status/actions.ts',
    description: 'Upload documents for existing application',
    recommendedTimeout: 'SLOW',
    rationale:
      'Handles file uploads to storage, creates document records, may notify admin via email.',
    fileUpload: true,
  },

  // ─────────────────────────────────────────────────────────────────────
  // STUDENT DASHBOARD
  // ─────────────────────────────────────────────────────────────────────

  {
    name: 'updateStudentProfile',
    file: 'app/dashboard/student/actions.ts',
    description: 'Update student profile information',
    recommendedTimeout: 'FAST',
    rationale: 'Simple profile update, indexed by user_id.',
  },

  // ─────────────────────────────────────────────────────────────────────
  // CONSULTANT DASHBOARD
  // ─────────────────────────────────────────────────────────────────────

  {
    name: 'getConsultantLeads',
    file: 'app/dashboard/consultant/actions.ts',
    description: 'Fetch consultant leads with filtering and sorting',
    recommendedTimeout: 'STANDARD',
    rationale:
      'Queries materialized view, applies filters, joins with communication logs. Indexed but can be slow with large datasets.',
    heavyDatabase: true,
  },

  {
    name: 'logCommunication',
    file: 'app/dashboard/consultant/actions.ts',
    description: 'Log communication with student (call, email, SMS)',
    recommendedTimeout: 'FAST',
    rationale: 'Create communication record, update lead status. Simple DB operations.',
  },

  {
    name: 'advanceLeadStage',
    file: 'app/dashboard/consultant/actions.ts',
    description: 'Advance lead to next pipeline stage',
    recommendedTimeout: 'STANDARD',
    rationale:
      'Update lead stage, trigger automation, send emails. May depend on Resend.',
    dependsOnExternal: ['Resend (email)', 'Edge function'],
  },

  // ─────────────────────────────────────────────────────────────────────
  // ADMIN DASHBOARD
  // ─────────────────────────────────────────────────────────────────────

  {
    name: 'bulkAssignLeads',
    file: 'app/dashboard/admin/actions.ts',
    description: 'Assign multiple leads to consultants',
    recommendedTimeout: 'SLOW',
    rationale: 'Bulk update operation with audit logging for each lead. Can be slow with many leads.',
    heavyDatabase: true,
  },

  {
    name: 'getAnalytics',
    file: 'app/dashboard/admin/analytics/actions.ts',
    description: 'Fetch detailed analytics with aggregations',
    recommendedTimeout: 'VERY_SLOW',
    rationale: 'Complex aggregations across leads, consultants, documents. May need to scan large result sets.',
    heavyDatabase: true,
  },

  {
    name: 'toggleConsultantAccepting',
    file: 'app/dashboard/admin/team/actions.ts',
    description: 'Toggle consultant accepting new leads',
    recommendedTimeout: 'FAST',
    rationale: 'Simple profile flag update, audit log. No external dependencies.',
  },

  {
    name: 'deactivateConsultant',
    file: 'app/dashboard/admin/team/actions.ts',
    description: 'Deactivate consultant and reassign leads',
    recommendedTimeout: 'SLOW',
    rationale:
      'Bulk operation: mark inactive, reassign all leads, send notifications. Heavy DB work.',
    heavyDatabase: true,
  },

  {
    name: 'getConsultantPortfolio',
    file: 'app/dashboard/admin/consultants/[id]/actions.ts',
    description: 'Get detailed consultant portfolio with metrics',
    recommendedTimeout: 'STANDARD',
    rationale: 'Queries materialized views and calculates statistics. Indexed but potentially slow.',
    heavyDatabase: true,
  },

  {
    name: 'updatePipelineSetting',
    file: 'app/dashboard/admin/pipeline-settings/actions.ts',
    description: 'Update pipeline stage settings and routing rules',
    recommendedTimeout: 'FAST',
    rationale: 'Simple settings update, audit log. No external dependencies.',
  },

  {
    name: 'sendNotification',
    file: 'app/dashboard/consultant/notifications/actions.ts',
    description: 'Send notification to user',
    recommendedTimeout: 'FAST',
    rationale: 'Create notification record, update realtime. Simple operation.',
  },

  // ─────────────────────────────────────────────────────────────────────
  // NOTIFICATIONS API
  // ─────────────────────────────────────────────────────────────────────

  {
    name: 'markNotificationAsRead',
    file: 'app/api/notifications/[id]/route.ts',
    description: 'Mark notification as read',
    recommendedTimeout: 'FAST',
    rationale: 'Single record update. No external dependencies.',
  },

  {
    name: 'markAllNotificationsAsRead',
    file: 'app/api/notifications/read-all/route.ts',
    description: 'Mark all notifications as read for user',
    recommendedTimeout: 'STANDARD',
    rationale: 'Bulk update for single user. Could affect many records.',
  },

  // ─────────────────────────────────────────────────────────────────────
  // FILE UPLOADS
  // ─────────────────────────────────────────────────────────────────────

  {
    name: 'uploadProfilePhoto',
    file: 'app/dashboard/admin/consultants/[id]/actions.ts',
    description: 'Upload and process profile photo',
    recommendedTimeout: 'SLOW',
    rationale:
      'File upload, image processing/resizing, storage write. IO intensive.',
    fileUpload: true,
  },

  {
    name: 'uploadLeadDocument',
    file: 'app/dashboard/admin/actions.ts',
    description: 'Upload document for lead',
    recommendedTimeout: 'SLOW',
    rationale:
      'File upload, virus scan, storage write, create DB record. Can be slow.',
    fileUpload: true,
  },
]

/**
 * Group actions by timeout category for easy reference
 */
export function groupActionsByTimeout(): Record<string, ServerActionMetadata[]> {
  const grouped: Record<string, ServerActionMetadata[]> = {}

  for (const action of SERVER_ACTIONS_REGISTRY) {
    if (!grouped[action.recommendedTimeout]) {
      grouped[action.recommendedTimeout] = []
    }
    grouped[action.recommendedTimeout].push(action)
  }

  return grouped
}

/**
 * Get actions that depend on external services
 */
export function getActionsWithExternalDependencies(): ServerActionMetadata[] {
  return SERVER_ACTIONS_REGISTRY.filter(
    (action) => action.dependsOnExternal && action.dependsOnExternal.length > 0
  )
}

/**
 * Get heavy database operations
 */
export function getHeavyDatabaseActions(): ServerActionMetadata[] {
  return SERVER_ACTIONS_REGISTRY.filter((action) => action.heavyDatabase)
}

/**
 * Get file upload operations
 */
export function getFileUploadActions(): ServerActionMetadata[] {
  return SERVER_ACTIONS_REGISTRY.filter((action) => action.fileUpload)
}

/**
 * Statistics about server actions
 */
export function getActionStatistics() {
  const grouped = groupActionsByTimeout()
  const externalDeps = getActionsWithExternalDependencies()
  const heavyDb = getHeavyDatabaseActions()
  const fileOps = getFileUploadActions()

  return {
    totalActions: SERVER_ACTIONS_REGISTRY.length,
    byTimeout: Object.fromEntries(
      Object.entries(grouped).map(([key, actions]) => [key, actions.length])
    ),
    actionsWithExternalDeps: externalDeps.length,
    heavyDatabaseOps: heavyDb.length,
    fileUploadOps: fileOps.length,
  }
}
