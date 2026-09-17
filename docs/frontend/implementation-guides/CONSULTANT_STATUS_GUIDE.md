# Consultant Status and Availability Tracking Guide

**Phase 10 LOW #18**: Enhance consultant status states and availability tracking with rich status information and smart recommendations.

## Overview

Current system uses boolean flags (`is_active`, `is_accepting_leads`). This enhancement provides:

1. **Rich Status States** — Not just on/off, but context-aware states
2. **Capacity Tracking** — Visual utilization metrics
3. **Smart Recommendations** — Auto-suggest best consultant for assignment
4. **Status Transitions** — Audit trail of status changes
5. **Team Metrics** — Analyze overall team capacity

## Status States

### Consultant Availability States

```typescript
ACCEPTING      // Actively accepting new leads (has capacity)
AT_CAPACITY    // At or above max capacity limit (no new leads)
UNAVAILABLE    // Manually marked unavailable by themselves or admin
INACTIVE       // Deactivated by admin (soft deleted)
ON_BREAK       // Temporarily unavailable (future use)
```

### State Machine

```
ACCEPTING ──(at capacity)──> AT_CAPACITY
   ↑                              ↓
   └──(capacity freed)────────────┘

ACCEPTING ──(toggle off)──> UNAVAILABLE
   ↑                             ↓
   └────(toggle on)──────────────┘

ACCEPTING ──(admin deactivate)──> INACTIVE
  (any)                            ↓
   └──(admin reactivate)───────────┘

(any) ──(future)──> ON_BREAK
```

## Usage

### Calculate Status from Database

```typescript
import {
  buildConsultantStatus,
  canAcceptLeads,
  getDisplayLabel,
} from '@/lib/consultant-status'

const consultantData = {
  id: 'consultant-123',
  name: 'Jane Smith',
  email: 'jane@example.com',
  isActive: true,
  isAcceptingLeads: true,
  activeLeads: 12,
  stalledLeads: 2,
  maxCapacity: 15,
  updatedAt: new Date(),
}

const status = buildConsultantStatus(consultantData)

console.log(status.state) // 'at_capacity'
console.log(status.displayLabel) // 'At capacity'
console.log(status.displayColor) // 'yellow'
console.log(status.capacityPercentage) // 93%
console.log(canAcceptLeads(status)) // false
```

### Display Status in UI

```tsx
import { getDisplayColor, getDisplayIcon } from '@/lib/consultant-status'

export function ConsultantStatusBadge({ status }) {
  const color = getDisplayColor(status.state)
  const icon = getDisplayIcon(status.state)

  const colorMap = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className={`rounded-full px-3 py-1 text-sm font-medium ${colorMap[color]}`}>
      <span className="mr-1">{getIconEmoji(icon)}</span>
      {status.displayLabel}
    </div>
  )
}

function getIconEmoji(icon: string): string {
  const icons = {
    'check-circle': '✓',
    'alert-circle': '⚠',
    'x-circle': '✕',
    'slash-circle': '⊘',
    'pause-circle': '⏸',
  }
  return icons[icon] ?? '•'
}
```

### Smart Lead Assignment

```typescript
import { getAssignmentRecommendation } from '@/lib/consultant-status'

export async function assignLead(leadId: string) {
  // Get all consultants' status
  const consultants = await getAllConsultants()
  const statuses = consultants.map(buildConsultantStatus)

  // Get recommendation
  const { recommended, reason, alternatives } = getAssignmentRecommendation(statuses)

  if (!recommended) {
    return {
      success: false,
      error: 'No consultants available to accept this lead',
    }
  }

  // Assign to recommended
  await db.leads.update(leadId, {
    consultant_id: recommended.id,
  })

  // Log why we chose this consultant
  console.log(`[ASSIGNMENT] Assigned to ${recommended.name}: ${reason}`)

  return {
    success: true,
    assignedTo: recommended.id,
    reason,
  }
}
```

### Track Status Changes

```typescript
import {
  buildConsultantStatus,
  needsReassignment,
  createStatusChangeEvent,
} from '@/lib/consultant-status'

export async function updateConsultantAvailability(
  consultantId: string,
  isAcceptingLeads: boolean
) {
  // Get old status
  const oldData = await getConsultant(consultantId)
  const oldStatus = buildConsultantStatus(oldData)

  // Update database
  await db.profiles.update(consultantId, { is_accepting_leads: isAcceptingLeads })

  // Get new status
  const newData = await getConsultant(consultantId)
  const newStatus = buildConsultantStatus(newData)

  // Track change
  const event = createStatusChangeEvent(oldStatus, newStatus, 'admin')
  if (event) {
    await logStatusChange(event)

    // Check if reassignment needed
    if (needsReassignment(oldStatus, newStatus)) {
      console.warn(`⚠️ ${newStatus.name} has ${newStatus.totalOpenLeads} leads that may need reassignment`)
      // Trigger reassignment workflow
    }
  }

  return newStatus
}
```

### Team Capacity Metrics

```typescript
import { calculateTeamCapacityMetrics } from '@/lib/consultant-status'

export async function dashboardMetrics() {
  const consultants = await getAllConsultants()
  const statuses = consultants.map(buildConsultantStatus)

  const metrics = calculateTeamCapacityMetrics(statuses)

  return {
    totalCapacity: metrics.totalCapacity,
    currentUtilization: metrics.totalUtilized,
    utilizationRate: `${metrics.utilizationRate}%`,
    underutilized: metrics.underutilized, // <50% capacity
    optimal: metrics.optimal, // 50-85% capacity
    overutilized: metrics.overutilized, // 85-100% capacity
    atCapacity: metrics.atCapacity, // At limit
  }
}
```

## API Responses

### Single Consultant Status

```json
{
  "id": "consultant-123",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "state": "at_capacity",
  "isActive": true,
  "isAcceptingLeads": true,
  "activeLadsCount": 12,
  "stalledLeadsCount": 2,
  "totalOpenLeads": 14,
  "maxCapacity": 15,
  "capacityPercentage": 93,
  "isAtCapacity": true,
  "updatedAt": "2024-09-18T10:30:00Z",
  "lastLeadAssignedAt": "2024-09-18T09:15:00Z",
  "displayLabel": "At capacity",
  "displayColor": "yellow",
  "displayIcon": "alert-circle"
}
```

### Team Capacity Metrics

```json
{
  "totalCapacity": 150,
  "totalUtilized": 128,
  "utilizationRate": 85,
  "underutilized": 3,
  "optimal": 8,
  "overutilized": 2,
  "atCapacity": 1
}
```

### Assignment Recommendation

```json
{
  "recommended": {
    "id": "consultant-456",
    "name": "John Doe",
    "capacityPercentage": 65
  },
  "reason": "John Doe has lowest utilization (65%)",
  "alternatives": [
    {
      "id": "consultant-789",
      "name": "Sarah Johnson",
      "capacityPercentage": 72
    },
    {
      "id": "consultant-012",
      "name": "Mike Wilson",
      "capacityPercentage": 78
    }
  ]
}
```

## Database Schema Extension

To support enhanced tracking, consider adding:

```sql
-- Current state cache (for performance)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_state VARCHAR(20);

-- Tracking metrics
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_lead_assigned_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_leads_completed INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS average_completion_time_days NUMERIC;

-- Status change audit trail
CREATE TABLE IF NOT EXISTS consultant_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES profiles(id),
  previous_state VARCHAR(20) NOT NULL,
  new_state VARCHAR(20) NOT NULL,
  reason TEXT,
  triggered_by VARCHAR(20), -- 'admin' or 'system'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX idx_consultant_status_history_consultant
  ON consultant_status_history(consultant_id, created_at DESC);
```

## Best Practices

### 1. Use Status for Assignment Decisions

```typescript
// ✅ Good: Check status before assigning
if (canAcceptLeads(consultantStatus)) {
  await assignLead(leadId, consultantId)
}

// ❌ Wrong: Just check boolean
if (consultant.is_accepting_leads) {
  await assignLead(leadId, consultantId)  // Might be at capacity!
}
```

### 2. Monitor State Transitions

```typescript
// Log every state change
const event = createStatusChangeEvent(oldStatus, newStatus)
if (event) {
  await logToAuditTrail(event)
  // Alert admin if significant change
  if (event.newState === 'inactive' && event.previousState === 'accepting') {
    await notifyAdmins(`${event.consultantName} is now inactive`)
  }
}
```

### 3. Handle Capacity Overflow

```typescript
// When assigning lead pushes consultant to capacity
const oldUtil = status.capacityPercentage
const newUtil = calculateCapacityPercentage(
  status.activeLadsCount + 1,
  status.stalledLeadsCount,
  status.maxCapacity
)

if (oldUtil < 100 && newUtil >= 100) {
  // Notify that consultant just hit capacity
  console.log(`${status.name} is now at capacity`)
}
```

### 4. Display Status Clearly

```typescript
// Show status prominently in admin dashboard
// Include:
// - Status badge with color
// - Capacity bar showing utilization
// - Open leads count
// - Last assignment time
// - Action suggestions
```

### 5. Communicate Status Changes to Consultants

```typescript
// When admin manually changes availability
if (newStatus.state === 'unavailable' && oldStatus.state !== 'unavailable') {
  // Notify consultant: "Your status has been marked as unavailable"
  await sendNotification(consultantId, {
    type: 'status_changed',
    message: 'Your availability has been changed to unavailable',
    action: 'You can change this back anytime',
  })
}
```

## Monitoring

### Alerts to Set Up

1. **Consultant at capacity** (>90% utilization)
   - Action: Recommend new lead assignment caution
2. **Multiple consultants unavailable**
   - Action: Alert admin about team availability
3. **Lead reassignment needed** (consultant deactivated with open leads)
   - Action: Immediate admin notification
4. **Consultant inactive too long** (>30 days)
   - Action: Periodic review flag

### Metrics to Track

- Team utilization rate (should be 75-85% optimal)
- Consultant state distribution (% accepting, at capacity, unavailable)
- Lead assignment frequency per consultant
- Status change frequency (should be rare)
- Reassignment events when consultant becomes unavailable

## Testing

```typescript
import {
  buildConsultantStatus,
  calculateTeamCapacityMetrics,
  getAssignmentRecommendation,
} from '@/lib/consultant-status'

describe('Consultant Status', () => {
  test('correctly identifies at-capacity state', () => {
    const status = buildConsultantStatus({
      id: 'c1',
      name: 'Jane',
      email: 'jane@example.com',
      isActive: true,
      isAcceptingLeads: true,
      activeLeads: 15,
      stalledLeads: 0,
      maxCapacity: 15,
      updatedAt: new Date(),
    })

    expect(status.state).toBe('at_capacity')
    expect(status.isAtCapacity).toBe(true)
    expect(status.capacityPercentage).toBe(100)
  })

  test('recommends consultant with lowest utilization', () => {
    const statuses = [
      buildConsultantStatus({
        id: 'c1',
        name: 'Jane',
        email: 'jane@example.com',
        isActive: true,
        isAcceptingLeads: true,
        activeLeads: 10,
        stalledLeads: 0,
        maxCapacity: 20,
        updatedAt: new Date(),
      }),
      buildConsultantStatus({
        id: 'c2',
        name: 'John',
        email: 'john@example.com',
        isActive: true,
        isAcceptingLeads: true,
        activeLeads: 5,
        stalledLeads: 0,
        maxCapacity: 20,
        updatedAt: new Date(),
      }),
    ]

    const { recommended } = getAssignmentRecommendation(statuses)
    expect(recommended?.id).toBe('c2') // John has 25% vs Jane's 50%
  })
})
```

## Files

- `lib/consultant-status.ts` — All status utilities
- `CONSULTANT_STATUS_GUIDE.md` — This guide

## Related

- `DATABASE_INDEXING_GUIDE.md` — Index status columns for performance
- `PAGINATION_IMPLEMENTATION_GUIDE.md` — Filter/sort consultants by status
- `AUDIT_LOGGING_GUIDE.md` — Log all status changes
