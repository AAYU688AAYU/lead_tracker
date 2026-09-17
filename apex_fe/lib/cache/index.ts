/**
 * Caching Layer
 * Phase 10 LOW #17: Cache static and semi-static data with ISR
 *
 * This module provides cached versions of frequently-accessed, rarely-changed data.
 * Uses Next.js unstable_cache for automatic deduplication within requests
 * and ISR for cross-request caching.
 */

import { unstable_cache } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import type {
  Profile,
  PipelineStageLabel,
} from '@/lib/supabase/types'

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE STAGES
// Fetched: Every admin page load, every form submission
// Change frequency: Rarely (only admin updates)
// Strategy: Cache for 1 hour, revalidate on admin update
// ─────────────────────────────────────────────────────────────────────────────

type StageRow = Pick<PipelineStageLabel, 'stage' | 'label' | 'sort_order' | 'stall_threshold_hours'>

async function getPipelineStagesUncached(): Promise<StageRow[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('pipeline_stage_labels')
    .select('stage, label, sort_order, stall_threshold_hours')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[CACHE] Error fetching pipeline stages:', error)
    return []
  }

  return data ?? []
}

/**
 * Get pipeline stages with caching
 * Cached for 1 hour, can be revalidated on-demand
 *
 * @returns Array of pipeline stages
 */
export const getPipelineStages = unstable_cache(
  getPipelineStagesUncached,
  ['pipeline-stages'],
  {
    revalidate: 3600, // 1 hour
    tags: ['pipeline-stages'],
  }
)

// ─────────────────────────────────────────────────────────────────────────────
// PROGRAMS
// Fetched: Every intake form load, admin pages
// Change frequency: Weekly (admin-controlled)
// Strategy: Cache for 24 hours
// ─────────────────────────────────────────────────────────────────────────────

interface Program {
  id: string
  name: string
}

async function getProgramsUncached(): Promise<Program[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('programs')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('[CACHE] Error fetching programs:', error)
    return []
  }

  return data ?? []
}

/**
 * Get active programs with caching
 * Cached for 24 hours
 *
 * @returns Array of programs
 */
export const getPrograms = unstable_cache(
  getProgramsUncached,
  ['programs'],
  {
    revalidate: 86400, // 24 hours
    tags: ['programs'],
  }
)

// ─────────────────────────────────────────────────────────────────────────────
// UNIVERSITIES
// Fetched: Every intake form load, admin pages
// Change frequency: Weekly (admin-controlled)
// Strategy: Cache for 24 hours
// ─────────────────────────────────────────────────────────────────────────────

interface University {
  id: string
  name: string
}

async function getUniversitiesUncached(): Promise<University[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('universities')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('[CACHE] Error fetching universities:', error)
    return []
  }

  return data ?? []
}

/**
 * Get active universities with caching
 * Cached for 24 hours
 *
 * @returns Array of universities
 */
export const getUniversities = unstable_cache(
  getUniversitiesUncached,
  ['universities'],
  {
    revalidate: 86400, // 24 hours
    tags: ['universities'],
  }
)

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTANT LIST
// Fetched: Every admin dashboard load
// Change frequency: Hourly (profile updates)
// Strategy: Cache for 10 minutes (balance between freshness and performance)
// ─────────────────────────────────────────────────────────────────────────────

interface ConsultantProfile {
  id: string
  full_name: string | null
  email: string
  is_accepting_leads: boolean
  max_lead_capacity: number | null
}

async function getConsultantListUncached(): Promise<ConsultantProfile[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, is_accepting_leads, max_lead_capacity')
    .eq('role', 'consultant')
    .eq('is_active', true)
    .order('full_name')

  if (error) {
    console.error('[CACHE] Error fetching consultant list:', error)
    return []
  }

  return data ?? []
}

/**
 * Get list of active consultants with caching
 * Cached for 10 minutes
 *
 * @returns Array of consultant profiles
 */
export const getConsultantList = unstable_cache(
  getConsultantListUncached,
  ['consultants-list'],
  {
    revalidate: 600, // 10 minutes
    tags: ['consultants-list'],
  }
)

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all cacheable data for a page
 * Useful for pages that need multiple cached queries
 *
 * @example
 * const { stages, programs, universities } = await getCacheBundle()
 */
export async function getCacheBundle() {
  const [stages, programs, universities] = await Promise.all([
    getPipelineStages(),
    getPrograms(),
    getUniversities(),
  ])

  return {
    stages,
    programs,
    universities,
  }
}

/**
 * Check cache health (for monitoring)
 * Returns timing information about cached queries
 */
export async function checkCacheHealth() {
  const start = Date.now()
  const stages = await getPipelineStages()
  const stageDuration = Date.now() - start

  const start2 = Date.now()
  const programs = await getPrograms()
  const programDuration = Date.now() - start2

  return {
    stages: {
      count: stages.length,
      duration: stageDuration,
      isCached: stageDuration < 10, // <10ms likely cached
    },
    programs: {
      count: programs.length,
      duration: programDuration,
      isCached: programDuration < 10,
    },
  }
}
