/**
 * apply-migrations.mjs
 *
 * One-time script to apply the Phase 2 RLS policies and clean up any
 * duplicate test seed data, then re-seed universities + programs.
 *
 * Requires: SUPABASE_DB_URL in env  OR  reads from .env.local automatically.
 *
 * Usage:
 *   node scripts/apply-migrations.mjs
 *
 * The script connects via the Supabase "pg" direct connection string:
 *   postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
 * You can find it in: Supabase Dashboard → Project Settings → Database → Connection string → URI
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))

// ---------------------------------------------------------------------------
// Load env
// ---------------------------------------------------------------------------
function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dir, '../.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) process.env[m[1].trim()] = m[2].trim()
    }
  } catch { /* already in env */ }
}

loadEnv()

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !SVC) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const db = createClient(URL, SVC, { auth: { persistSession: false } })

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------
const UNIVERSITIES = [
  { id: '11111111-1111-1111-1111-111111111101', name: 'University of Edinburgh',        country: 'United Kingdom' },
  { id: '11111111-1111-1111-1111-111111111102', name: 'University of Toronto',           country: 'Canada'         },
  { id: '11111111-1111-1111-1111-111111111103', name: 'University of Melbourne',         country: 'Australia'      },
  { id: '11111111-1111-1111-1111-111111111104', name: 'Technical University of Munich',  country: 'Germany'        },
  { id: '11111111-1111-1111-1111-111111111105', name: 'New York University',             country: 'United States'  },
]

const PROGRAMS = [
  // University of Edinburgh
  { university_id: '11111111-1111-1111-1111-111111111101', name: 'MSc Computer Science',          degree_level: 'MSc'  },
  { university_id: '11111111-1111-1111-1111-111111111101', name: 'MBA Business Administration',    degree_level: 'MBA'  },
  { university_id: '11111111-1111-1111-1111-111111111101', name: 'BEng Software Engineering',      degree_level: 'BEng' },
  // University of Toronto
  { university_id: '11111111-1111-1111-1111-111111111102', name: 'MSc Data Science',               degree_level: 'MSc'  },
  { university_id: '11111111-1111-1111-1111-111111111102', name: 'Bachelor of Commerce',            degree_level: 'BCom' },
  // University of Melbourne
  { university_id: '11111111-1111-1111-1111-111111111103', name: 'Master of Information Technology', degree_level: 'MIT' },
  { university_id: '11111111-1111-1111-1111-111111111103', name: 'BSc Computer Science',            degree_level: 'BSc'  },
  // Technical University of Munich
  { university_id: '11111111-1111-1111-1111-111111111104', name: 'MSc Informatics',                 degree_level: 'MSc'  },
  { university_id: '11111111-1111-1111-1111-111111111104', name: 'MBA Technology Management',       degree_level: 'MBA'  },
  // New York University
  { university_id: '11111111-1111-1111-1111-111111111105', name: 'MS Computer Science',             degree_level: 'MS'   },
  { university_id: '11111111-1111-1111-1111-111111111105', name: 'MBA Stern School of Business',    degree_level: 'MBA'  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ok(label, error) {
  if (error) { console.error(`✗ ${label}:`, error.message); process.exit(1) }
  console.log(`✓ ${label}`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n── Cleaning up old test rows ──────────────────────────────')

  // Delete any leads referencing the old test UUIDs (avoids FK violations on delete)
  await db.from('leads').delete().in('program_id', [
    // old IDs from earlier ad-hoc inserts
    '11111111-0000-0000-0000-000000000001',
    '22222222-0000-0000-0000-000000000002',
    '33333333-0000-0000-0000-000000000003',
  ])

  const { error: delProgErr } = await db.from('programs').delete().in('university_id', [
    '11111111-0000-0000-0000-000000000001',
    '22222222-0000-0000-0000-000000000002',
    '11111111-0000-0000-0000-000000000003',
  ])
  ok('delete old programs', delProgErr)

  const { error: delUniErr } = await db.from('universities').delete().in('id', [
    '11111111-0000-0000-0000-000000000001',
    '22222222-0000-0000-0000-000000000002',
    '11111111-0000-0000-0000-000000000003',
  ])
  ok('delete old universities', delUniErr)

  console.log('\n── Seeding universities ───────────────────────────────────')
  const { error: uniErr } = await db.from('universities').upsert(UNIVERSITIES, { onConflict: 'id' })
  ok(`insert ${UNIVERSITIES.length} universities`, uniErr)

  console.log('\n── Seeding programs ───────────────────────────────────────')
  const { error: progErr } = await db.from('programs').upsert(PROGRAMS, { onConflict: 'id' })
  ok(`insert ${PROGRAMS.length} programs`, progErr)

  console.log('\n── Verifying service-role read ────────────────────────────')
  const { data: unis, error: vErr } = await db.from('universities').select('id, name').order('name')
  ok('universities readable via service role', vErr)
  unis.forEach(u => console.log(`   ${u.name}`))

  console.log('\n\n✅  Seed complete.')
  console.log('\n⚠️  IMPORTANT — RLS policies still needed.')
  console.log('   The anon role cannot read programs/universities until you run the')
  console.log('   Phase 2 migration SQL in the Supabase Dashboard SQL Editor.\n')
  console.log('   Go to: https://supabase.com/dashboard/project/jeqzqmwwguvuvghwzpeq/sql/new')
  console.log('   Paste and run:\n')
  console.log('   CREATE POLICY "universities: anon select"')
  console.log('     ON universities FOR SELECT USING (true);')
  console.log('')
  console.log('   CREATE POLICY "programs: anon select"')
  console.log('     ON programs FOR SELECT USING (true);')
  console.log('')
}

main().catch(e => { console.error(e); process.exit(1) })
