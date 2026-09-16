'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type {
  Lead,
  PipelineStageLabel,
  Document,
  CommunicationLog,
} from '@/lib/supabase/types'
import type { StageStep, DocumentRow } from '@/app/status/actions'

// ---------------------------------------------------------------------------
// Narrow query-result types
// ---------------------------------------------------------------------------

type LeadRow = Pick<Lead, 'id' | 'reference_code' | 'stage' | 'status' | 'student_id' | 'consultant_id' | 'created_at'>
type StageRow = Pick<PipelineStageLabel, 'stage' | 'label' | 'sort_order'>
type CommRow  = Pick<CommunicationLog, 'lead_id' | 'created_at'>
type DocRow   = Pick<Document, 'id' | 'lead_id' | 'file_name' | 'file_url' | 'status' | 'rejection_reason' | 'created_at'>
type ConsultantRow = Pick<import('@/lib/supabase/types').Profile, 'id' | 'full_name' | 'email' | 'phone'>

// ---------------------------------------------------------------------------
// Public shape
// ---------------------------------------------------------------------------

/** Minimal consultant info surfaced to the student — enough to follow up */
export interface ConsultantBrief {
  full_name: string
  email:     string
  phone:     string | null
}

export interface LeadDetail {
  id:             string
  reference_code: string
  stage:          string
  stage_label:    string   // human label from pipeline_stage_labels
  status:         string
  created_at:     string
  last_contacted: string | null
  documents:      DocumentRow[]
  /** Null when the lead has not yet been assigned to a consultant */
  consultant:     ConsultantBrief | null
}

export interface DashboardData {
  stages:  StageStep[]
  leads:   LeadDetail[]
}

// ---------------------------------------------------------------------------
// getStudentDashboardData
// Called server-side from the student dashboard page.
// Uses the authenticated server client (RLS enforced) so students only ever
// see their own leads.  Documents and communication_logs are fetched with
// the service-role client because their RLS policies require auth.uid() to
// match the lead's student_id — which it does here, but the generated types
// would be inferred as never[] without the cast workaround; service-role
// keeps the code consistent with the rest of the codebase.
// ---------------------------------------------------------------------------

export async function getStudentDashboardData(studentId: string): Promise<DashboardData> {
  // Authenticated client for leads (RLS: student sees own rows)
  const authDb = await createClient()
  // Service-role for pipeline labels, communication logs, documents
  const svcDb  = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any

  // 1. Leads — authenticated, RLS enforced
  const { data: leadRows } = await authDb
    .from('leads')
    .select('id, reference_code, stage, status, student_id, consultant_id, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  const leads = (leadRows ?? []) as LeadRow[]

  // 2. Stage labels — one query, shared across all leads
  const { data: stageRows } = await svcDb
    .from('pipeline_stage_labels')
    .select('stage, label, sort_order')
    .order('sort_order', { ascending: true })

  const stages = ((stageRows ?? []) as StageRow[]).map((s) => ({
    stage:      s.stage,
    label:      s.label,
    sort_order: s.sort_order,
  }))

  const stageMap = new Map(stages.map((s) => [s.stage, s.label]))

  if (leads.length === 0) {
    return { stages, leads: [] }
  }

  const leadIds = leads.map((l) => l.id)

  // 3. Consultant profiles — batch-fetch for all assigned consultants.
  //    Uses svcDb: the student RLS policy on profiles only allows selecting
  //    their own row, not their consultant's row. Service role + explicit
  //    id filter is the safe, consistent pattern used throughout.
  const consultantIds = [
    ...new Set(leads.map((l) => l.consultant_id).filter((id): id is string => id != null))
  ]
  const consultantMap = new Map<string, ConsultantBrief>()
  if (consultantIds.length > 0) {
    const { data: cRows } = await svcDb
      .from('profiles')
      .select('id, full_name, email, phone')
      .in('id', consultantIds)
    for (const c of ((cRows ?? []) as ConsultantRow[])) {
      consultantMap.set(c.id, {
        full_name: c.full_name,
        email:     c.email,
        phone:     c.phone,
      })
    }
  }

  // 4. Most recent communication log per lead (one query, all leads)
  const { data: commRows } = await svcDb
    .from('communication_logs')
    .select('lead_id, created_at')
    .in('lead_id', leadIds)
    .order('created_at', { ascending: false })

  // Build a map: lead_id → most recent created_at
  const lastContactedMap = new Map<string, string>()
  for (const row of ((commRows ?? []) as CommRow[])) {
    if (!lastContactedMap.has(row.lead_id)) {
      lastContactedMap.set(row.lead_id, row.created_at)
    }
  }

  // 5. Documents for all leads (one query)
  const { data: docRows } = await svcDb
    .from('documents')
    .select('id, lead_id, file_name, file_url, status, rejection_reason, created_at')
    .in('lead_id', leadIds)
    .order('created_at', { ascending: false })

  // Resolve signed URLs for private-bucket paths
  const resolvedDocs: (DocRow & { resolved_url: string })[] = await Promise.all(
    ((docRows ?? []) as DocRow[]).map(async (d) => {
      let resolved = d.file_url
      if (d.file_url.startsWith('storage:')) {
        const { data: signed } = await svcDb
          .storage
          .from('documents')
          .createSignedUrl(d.file_url.slice('storage:'.length), 60 * 60)
        if (signed?.signedUrl) resolved = signed.signedUrl
      }
      return { ...d, resolved_url: resolved }
    })
  )

  // Group documents by lead_id
  const docsMap = new Map<string, DocumentRow[]>()
  for (const d of resolvedDocs) {
    const list = docsMap.get(d.lead_id) ?? []
    list.push({
      id:               d.id,
      file_name:        d.file_name,
      file_url:         d.resolved_url,
      status:           d.status as DocumentRow['status'],
      rejection_reason: d.rejection_reason,
      created_at:       d.created_at,
    })
    docsMap.set(d.lead_id, list)
  }

  // 6. Assemble
  const leadDetails: LeadDetail[] = leads.map((l) => ({
    id:             l.id,
    reference_code: l.reference_code,
    stage:          l.stage,
    stage_label:    stageMap.get(l.stage) ?? l.stage,
    status:         l.status,
    created_at:     l.created_at,
    last_contacted: lastContactedMap.get(l.id) ?? null,
    documents:      docsMap.get(l.id) ?? [],
    consultant:     l.consultant_id ? (consultantMap.get(l.consultant_id) ?? null) : null,
  }))

  return { stages, leads: leadDetails }
}
