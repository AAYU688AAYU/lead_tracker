/**
 * Consultant Status and Availability Tracking
 * Phase 10 LOW #18: Enhanced consultant status states and availability tracking
 *
 * Provides rich status information beyond boolean flags:
 * - Availability state (accepting leads, at capacity, unavailable)
 * - Workload tracking (active leads, capacity)
 * - Status indicators for UI display
 * - Automatic state transitions based on capacity
 */

/**
 * Consultant availability states
 *
 * ACCEPTING: Actively accepting new leads (not at capacity)
 * AT_CAPACITY: At or above max capacity (no new leads)
 * UNAVAILABLE: Manually marked as unavailable
 * INACTIVE: Deactivated by admin (soft deleted)
 * ON_BREAK: Temporarily unavailable (optional, for future use)
 */
export enum ConsultantAvailabilityState {
  ACCEPTING = 'accepting',
  AT_CAPACITY = 'at_capacity',
  UNAVAILABLE = 'unavailable',
  INACTIVE = 'inactive',
  ON_BREAK = 'on_break',
}

/**
 * Detailed consultant status information
 */
export interface ConsultantStatus {
  // Identity
  id: string
  name: string
  email: string

  // Status
  state: ConsultantAvailabilityState
  isActive: boolean
  isAcceptingLeads: boolean

  // Workload
  activeLadsCount: number
  stalledLeadsCount: number
  totalOpenLeads: number
  maxCapacity: number | null
  capacityPercentage: number // 0-100
  isAtCapacity: boolean

  // Metadata
  updatedAt: Date
  lastLeadAssignedAt?: Date
  daysInactive?: number

  // Display info
  displayLabel: string // "Accepting" | "At Capacity" | "Unavailable" | "Inactive"
  displayColor: 'green' | 'yellow' | 'red' | 'gray' // For UI
  displayIcon: string // For UI indicators
}

/**
 * Calculate consultant availability state
 */
export function calculateConsultantState(options: {
  isActive: boolean
  isAcceptingLeads: boolean
  activeLeads: number
  stalledLeads: number
  maxCapacity: number | null
}): ConsultantAvailabilityState {
  const { isActive, isAcceptingLeads, activeLeads, stalledLeads, maxCapacity } = options

  // Inactive takes precedence
  if (!isActive) {
    return ConsultantAvailabilityState.INACTIVE
  }

  // Check if at capacity
  const totalOpen = activeLeads + stalledLeads
  if (maxCapacity !== null && totalOpen >= maxCapacity) {
    return ConsultantAvailabilityState.AT_CAPACITY
  }

  // Check if manually unavailable
  if (!isAcceptingLeads) {
    return ConsultantAvailabilityState.UNAVAILABLE
  }

  // Default: accepting
  return ConsultantAvailabilityState.ACCEPTING
}

/**
 * Calculate capacity percentage
 */
export function calculateCapacityPercentage(
  activeLeads: number,
  stalledLeads: number,
  maxCapacity: number | null
): number {
  if (!maxCapacity || maxCapacity <= 0) {
    return 0 // No limit
  }

  const totalOpen = activeLeads + stalledLeads
  return Math.min(100, Math.round((totalOpen / maxCapacity) * 100))
}

/**
 * Build complete consultant status object
 */
export function buildConsultantStatus(data: {
  id: string
  name: string
  email: string
  isActive: boolean
  isAcceptingLeads: boolean
  activeLeads: number
  stalledLeads: number
  maxCapacity: number | null
  updatedAt: Date
  lastLeadAssignedAt?: Date
  inactiveDays?: number
}): ConsultantStatus {
  const state = calculateConsultantState({
    isActive: data.isActive,
    isAcceptingLeads: data.isAcceptingLeads,
    activeLeads: data.activeLeads,
    stalledLeads: data.stalledLeads,
    maxCapacity: data.maxCapacity,
  })

  const totalOpen = data.activeLeads + data.stalledLeads
  const capacityPercentage = calculateCapacityPercentage(
    data.activeLeads,
    data.stalledLeads,
    data.maxCapacity
  )

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    state,
    isActive: data.isActive,
    isAcceptingLeads: data.isAcceptingLeads,
    activeLadsCount: data.activeLeads,
    stalledLeadsCount: data.stalledLeads,
    totalOpenLeads: totalOpen,
    maxCapacity: data.maxCapacity,
    capacityPercentage,
    isAtCapacity: data.maxCapacity !== null && totalOpen >= data.maxCapacity,
    updatedAt: data.updatedAt,
    lastLeadAssignedAt: data.lastLeadAssignedAt,
    daysInactive: data.inactiveDays,
    displayLabel: getDisplayLabel(state),
    displayColor: getDisplayColor(state),
    displayIcon: getDisplayIcon(state),
  }
}

/**
 * Get human-readable status label
 */
export function getDisplayLabel(state: ConsultantAvailabilityState): string {
  switch (state) {
    case ConsultantAvailabilityState.ACCEPTING:
      return 'Accepting leads'
    case ConsultantAvailabilityState.AT_CAPACITY:
      return 'At capacity'
    case ConsultantAvailabilityState.UNAVAILABLE:
      return 'Unavailable'
    case ConsultantAvailabilityState.INACTIVE:
      return 'Inactive'
    case ConsultantAvailabilityState.ON_BREAK:
      return 'On break'
  }
}

/**
 * Get UI color for status
 */
export function getDisplayColor(state: ConsultantAvailabilityState): 'green' | 'yellow' | 'red' | 'gray' {
  switch (state) {
    case ConsultantAvailabilityState.ACCEPTING:
      return 'green'
    case ConsultantAvailabilityState.AT_CAPACITY:
      return 'yellow'
    case ConsultantAvailabilityState.UNAVAILABLE:
      return 'red'
    case ConsultantAvailabilityState.INACTIVE:
      return 'gray'
    case ConsultantAvailabilityState.ON_BREAK:
      return 'yellow'
  }
}

/**
 * Get UI icon identifier for status
 */
export function getDisplayIcon(state: ConsultantAvailabilityState): string {
  switch (state) {
    case ConsultantAvailabilityState.ACCEPTING:
      return 'check-circle'
    case ConsultantAvailabilityState.AT_CAPACITY:
      return 'alert-circle'
    case ConsultantAvailabilityState.UNAVAILABLE:
      return 'x-circle'
    case ConsultantAvailabilityState.INACTIVE:
      return 'slash-circle'
    case ConsultantAvailabilityState.ON_BREAK:
      return 'pause-circle'
  }
}

/**
 * Check if consultant can accept new leads
 */
export function canAcceptLeads(status: ConsultantStatus): boolean {
  return (
    status.state === ConsultantAvailabilityState.ACCEPTING &&
    status.isActive &&
    status.isAcceptingLeads &&
    !status.isAtCapacity
  )
}

/**
 * Get status suggestions for UI (what admin can do)
 */
export function getStatusSuggestions(status: ConsultantStatus): string[] {
  const suggestions: string[] = []

  if (status.state === ConsultantAvailabilityState.AT_CAPACITY) {
    suggestions.push('Increase capacity limit to accept more leads')
    suggestions.push('Reassign stalled leads to free up capacity')
  }

  if (status.state === ConsultantAvailabilityState.INACTIVE) {
    suggestions.push('Reactivate consultant if they are returning')
  }

  if (status.stalledLeadsCount > 0) {
    suggestions.push(`${status.stalledLeadsCount} leads are stalled - may need attention`)
  }

  if (status.capacityPercentage > 80 && status.capacityPercentage < 100) {
    suggestions.push('Consultant is nearing capacity - consider new lead assignments carefully')
  }

  return suggestions
}

/**
 * Capacity utilization metrics
 */
export interface CapacityMetrics {
  totalCapacity: number
  totalUtilized: number
  utilizationRate: number // 0-100
  underutilized: number // Count of consultants <50% capacity
  optimal: number // Count of consultants 50-85% capacity
  overutilized: number // Count of consultants >85% capacity
  atCapacity: number // Count of consultants at max
}

/**
 * Calculate team capacity metrics
 */
export function calculateTeamCapacityMetrics(statuses: ConsultantStatus[]): CapacityMetrics {
  let totalCapacity = 0
  let totalUtilized = 0

  const utilizationBuckets = {
    underutilized: 0,
    optimal: 0,
    overutilized: 0,
    atCapacity: 0,
  }

  for (const status of statuses) {
    if (!status.isActive) continue

    if (status.maxCapacity !== null) {
      totalCapacity += status.maxCapacity
      totalUtilized += status.totalOpenLeads

      const utilization = status.capacityPercentage
      if (utilization >= 100) {
        utilizationBuckets.atCapacity++
      } else if (utilization >= 85) {
        utilizationBuckets.overutilized++
      } else if (utilization >= 50) {
        utilizationBuckets.optimal++
      } else {
        utilizationBuckets.underutilized++
      }
    }
  }

  return {
    totalCapacity,
    totalUtilized,
    utilizationRate: totalCapacity > 0 ? Math.round((totalUtilized / totalCapacity) * 100) : 0,
    ...utilizationBuckets,
  }
}

/**
 * Get recommended action for consultant assignment
 */
export function getAssignmentRecommendation(
  statuses: ConsultantStatus[],
  newLeadsCount: number = 1
): {
  recommended: ConsultantStatus | null
  reason: string
  alternatives: ConsultantStatus[]
} {
  const accepting = statuses.filter((s) => canAcceptLeads(s))

  if (accepting.length === 0) {
    return {
      recommended: null,
      reason: 'No consultants are currently accepting leads',
      alternatives: [],
    }
  }

  // Sort by:
  // 1. Lowest capacity utilization (spread the load)
  // 2. Most recent lead assignment (balance updates)
  // 3. Name (tie-breaker)
  accepting.sort((a, b) => {
    const utilDiff = a.capacityPercentage - b.capacityPercentage
    if (utilDiff !== 0) return utilDiff

    const aTime = a.lastLeadAssignedAt?.getTime() ?? 0
    const bTime = b.lastLeadAssignedAt?.getTime() ?? 0
    if (aTime !== bTime) return aTime - bTime

    return (a.name ?? '').localeCompare(b.name ?? '')
  })

  return {
    recommended: accepting[0],
    reason: `${accepting[0].name} has lowest utilization (${accepting[0].capacityPercentage}%)`,
    alternatives: accepting.slice(1, 3),
  }
}

/**
 * Check if reassignment is needed (e.g., consultant became unavailable)
 */
export function needsReassignment(
  oldStatus: ConsultantStatus,
  newStatus: ConsultantStatus
): boolean {
  // If transitioned from accepting to not accepting
  if (
    oldStatus.state === ConsultantAvailabilityState.ACCEPTING &&
    newStatus.state !== ConsultantAvailabilityState.ACCEPTING &&
    newStatus.totalOpenLeads > 0
  ) {
    return true
  }

  // If deactivated
  if (oldStatus.isActive && !newStatus.isActive && newStatus.totalOpenLeads > 0) {
    return true
  }

  return false
}

/**
 * Status change event for audit logging
 */
export interface StatusChangeEvent {
  consultantId: string
  consultantName: string
  previousState: ConsultantAvailabilityState
  newState: ConsultantAvailabilityState
  reason: string
  triggeredBy: 'admin' | 'system' // Admin toggle, system auto-transition on capacity
  timestamp: Date
}

/**
 * Create status change event for logging
 */
export function createStatusChangeEvent(
  oldStatus: ConsultantStatus,
  newStatus: ConsultantStatus,
  triggeredBy: 'admin' | 'system' = 'admin'
): StatusChangeEvent | null {
  if (oldStatus.state === newStatus.state) {
    return null // No state change
  }

  let reason = ''
  if (oldStatus.state !== newStatus.state) {
    if (newStatus.state === ConsultantAvailabilityState.AT_CAPACITY) {
      reason = `Reached capacity limit (${newStatus.totalOpenLeads}/${newStatus.maxCapacity})`
    } else if (oldStatus.state === ConsultantAvailabilityState.AT_CAPACITY) {
      reason = `Capacity available (${newStatus.totalOpenLeads}/${newStatus.maxCapacity})`
    } else if (newStatus.state === ConsultantAvailabilityState.INACTIVE) {
      reason = 'Deactivated by admin'
    } else if (oldStatus.state === ConsultantAvailabilityState.INACTIVE) {
      reason = 'Reactivated by admin'
    } else {
      reason = `Status changed from ${oldStatus.displayLabel} to ${newStatus.displayLabel}`
    }
  }

  return {
    consultantId: newStatus.id,
    consultantName: newStatus.name,
    previousState: oldStatus.state,
    newState: newStatus.state,
    reason,
    triggeredBy,
    timestamp: new Date(),
  }
}
