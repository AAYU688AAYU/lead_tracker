'use server'

/**
 * Consultant Detail Actions — TASK #5
 *
 * getConsultantDetail()      — fetch consultant profile, metrics, portfolio
 * bulkReassignLeads()        — reassign multiple selected leads to replacement
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Lead, Profile } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConsultantMetrics {
  conversionRate: number       // enrolled / total assigned
  avgLeadAgeDays: number       // average age of leads in days
  totalAdmittedThirtyDays: number
  stalledLeadsCount: number
}

export interface PortfolioLead {
  id: string
  reference_code: string
  student_name: string
  stage: string
  stage_label: string
  status: string
  created_at: string
  days_in_stage: number
  target_country: string | null
}

export interface ConsultantDetailData {
  consultant: {
    id: string
    full_name: string
    email: string
    role: string
    join_date: string | null
    is_accepting_leads: boolean
    max_lead_capacity: number | null
  }
  metrics: ConsultantMetrics
  portfolio: PortfolioLead[]
}

// ---------------------------------------------------------------------------
// getConsultantDetail
// ---------------------------------------------------------------------------

export async function getConsultantDetail(
  consultantId: string,
): Promise<ConsultantDetailData | null> {
  const authDb = await createClient()
  const svcDb = createServiceClient()

  // Verify caller is admin
  const { data: { user } } = await authDb.auth.getUser()
  if (!user) redirect('/login')

  const { data: callerProfile } = await authDb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if ((callerProfile as { role: string } | null)?.role !== 'admin') {
    redirect('/dashboard/admin')
  }

  // Fetch consultant profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbr = svcDb as any
  const { data: consultantRow, error: consultErr } = await dbr
    .from('profiles')
    .select('id, full_name, email, role, created_at, is_accepting_leads, max_lead_capacity')
    .eq('id', consultantId)
    .single()

  if (consultErr || !consultantRow) {
    console.error('[consultant-detail] fetch profile error:', consultErr)
    return null
  }

  type ConsultantRow = Pick<
    Profile,
    'id' | 'full_name' | 'email' | 'role' | 'is_accepting_leads' | 'max_lead_capacity'
  > & { created_at: string }

  const consultant = consultantRow as ConsultantRow

  // Fetch all leads for this consultant
  const { data: leadRows } = await dbr
    .from('leads')
    .select(
      'id, reference_code, stage, status, student_id, created_at, target_country, stalled_at'
    )
    .eq('consultant_id', consultantId)
    .neq('status', 'dropped')

  type LeadRow = Pick<
    Lead,
    'id' | 'reference_code' | 'stage' | 'status' | 'student_id' | 'created_at' | 'target_country'
  > & { stalled_at: string | null }

  const leads = (leadRows ?? []) as LeadRow[]

  // Fetch stage labels
  const { data: stageRows } = await svcDb
    .from('pipeline_stage_labels')
    .select('stage, label, sort_order')
    .order('sort_order', { ascending: true })

  const stageMap = new Map(
    ((stageRows ?? []) as Array<{ stage: string; label: string }>).map(s => [s.stage, s.label])
  )

  // Fetch all student profiles
  const studentIds = [...new Set(leads.map(l => l.student_id))]
  const profileMap = new Map<string, { full_name?: string; email?: string }>()
  if (studentIds.length > 0) {
    const { data: studentRows } = await authDb
      .from('profiles')
      .select('id, full_name, email')
      .in('id', studentIds)
    for (const p of studentRows ?? []) {
      profileMap.set(p.id, p as { full_name?: string; email?: string })
    }
  }

  // Calculate metrics
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const enrolledLeads = leads.filter(l => l.stage === 'enrolled').length
  const totalLeads = leads.length

  const conversionRate = totalLeads > 0 ? enrolledLeads / totalLeads : 0

  const avgLeadAgeDays =
    leads.length > 0
      ? Math.round(
          leads.reduce((sum, l) => {
            const age = (now.getTime() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24)
            return sum + age
          }, 0) / leads.length
        )
      : 0

  const totalAdmittedThirtyDays = leads.filter(l => {
    const created = new Date(l.created_at)
    return l.stage === 'enrolled' && created >= thirtyDaysAgo
  }).length

  const stalledLeadsCount = leads.filter(l => l.status === 'stalled').length

  // Build portfolio
  const portfolio: PortfolioLead[] = leads.map(l => {
    const student = profileMap.get(l.student_id)
    const daysInStage = Math.floor(
      (now.getTime() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )
    return {
      id: l.id,
      reference_code: l.reference_code,
      student_name: student?.full_name ?? student?.email ?? 'Unknown',
      stage: l.stage,
      stage_label: stageMap.get(l.stage) ?? l.stage,
      status: l.status,
      created_at: l.created_at,
      days_in_stage: daysInStage,
      target_country: l.target_country ?? null,
    }
  })

  return {
    consultant: {
      id: consultant.id,
      full_name: consultant.full_name ?? 'Unknown',
      email: consultant.email,
      role: consultant.role,
      join_date: consultant.created_at,
      is_accepting_leads: consultant.is_accepting_leads,
      max_lead_capacity: consultant.max_lead_capacity,
    },
    metrics: {
      conversionRate,
      avgLeadAgeDays,
      totalAdmittedThirtyDays,
      stalledLeadsCount,
    },
    portfolio,
  }
}
