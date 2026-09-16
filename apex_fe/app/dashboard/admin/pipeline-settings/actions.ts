'use server'

/**
 * Server actions for the Pipeline Settings screen.
 *
 * getPipelineSettings() — read all 6 stages ordered by sort_order
 * updateStageLabel()    — write pipeline_stage_labels.label for one stage
 * updateStallThreshold() — write pipeline_stage_labels.stall_threshold_hours for one stage
 *
 * Both update actions use the service client (bypasses RLS) so the write
 * succeeds regardless of the current user's RLS policies on the table.
 * They still verify the caller is an admin via the auth client.
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { PipelineStageLabel } from '@/lib/supabase/types'
import type { PipelineStageRow, SaveFieldState } from '../types'

// ---------------------------------------------------------------------------
// getPipelineSettings
// ---------------------------------------------------------------------------

export async function getPipelineSettings(): Promise<PipelineStageRow[]> {
  const svcDb = createServiceClient()

  const { data, error } = await svcDb
    .from('pipeline_stage_labels')
    .select('stage, label, sort_order, stall_threshold_hours')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[pipeline-settings] getPipelineSettings error:', error)
    return []
  }

  return ((data ?? []) as PipelineStageLabel[]).map(r => ({
    stage:                 r.stage,
    label:                 r.label,
    sort_order:            r.sort_order,
    stall_threshold_hours: r.stall_threshold_hours,
  }))
}

// ---------------------------------------------------------------------------
// Shared admin guard
// ---------------------------------------------------------------------------

async function assertAdmin(): Promise<string | null> {
  const authDb = await createClient()
  const { data: { user } } = await authDb.auth.getUser()
  if (!user) return 'Not authenticated.'

  const { data } = await authDb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if ((data as { role: string } | null)?.role !== 'admin') {
    return 'Admin access required.'
  }
  return null
}

// ---------------------------------------------------------------------------
// updateStageLabel
// ---------------------------------------------------------------------------

export async function updateStageLabel(
  _prev: SaveFieldState,
  formData: FormData,
): Promise<SaveFieldState> {
  const stage = ((formData.get('stage') as string | null) ?? '').trim()
  const label = ((formData.get('label') as string | null) ?? '').trim()
  const field = `label:${stage}`

  if (!stage) return { status: 'error', field, message: 'Missing stage.' }
  if (!label) return { status: 'error', field, message: 'Label cannot be empty.' }
  if (label.length > 60) return { status: 'error', field, message: 'Label must be 60 characters or fewer.' }

  const authErr = await assertAdmin()
  if (authErr) return { status: 'error', field, message: authErr }

  const svcDb = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbw = svcDb as any

  const { error } = await dbw
    .from('pipeline_stage_labels')
    .update({ label })
    .eq('stage', stage)

  if (error) {
    console.error('[pipeline-settings] updateStageLabel error:', error)
    return { status: 'error', field, message: 'Could not save label. Please try again.' }
  }

  // Revalidate every consumer of pipeline_stage_labels.label
  revalidatePath('/dashboard/admin/pipeline-settings')
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/consultant')
  revalidatePath('/status')

  return { status: 'saved', field }
}

// ---------------------------------------------------------------------------
// updateStallThreshold
// ---------------------------------------------------------------------------

export async function updateStallThreshold(
  _prev: SaveFieldState,
  formData: FormData,
): Promise<SaveFieldState> {
  const stage = ((formData.get('stage') as string | null) ?? '').trim()
  const raw   = ((formData.get('stall_threshold_hours') as string | null) ?? '').trim()
  const field = `threshold:${stage}`

  if (!stage) return { status: 'error', field, message: 'Missing stage.' }

  const hours = parseInt(raw, 10)
  if (isNaN(hours) || hours < 1) {
    return { status: 'error', field, message: 'Threshold must be at least 1 hour.' }
  }

  const authErr = await assertAdmin()
  if (authErr) return { status: 'error', field, message: authErr }

  const svcDb = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbw = svcDb as any

  const { error } = await dbw
    .from('pipeline_stage_labels')
    .update({ stall_threshold_hours: hours })
    .eq('stage', stage)

  if (error) {
    console.error('[pipeline-settings] updateStallThreshold error:', error)
    return { status: 'error', field, message: 'Could not save threshold. Please try again.' }
  }

  revalidatePath('/dashboard/admin/pipeline-settings')
  revalidatePath('/dashboard/admin')

  return { status: 'saved', field }
}
