/**
 * seed-phase4-test.mjs
 *
 * Seeds Phase 4 test data against the live Supabase project.
 * Run from apex_fe/:  node scripts/seed-phase4-test.mjs
 *
 * What it does:
 *   1. Creates "Consultant Beta" auth user (if not already present)
 *      using the Admin API — this fires fn_handle_new_user so the
 *      profiles row is created with the correct role automatically.
 *   2. Ensures test.consultant@apex.test (Alpha) has full_name set.
 *   3. Assigns the existing unassigned lead to Alpha.
 *   4. Inserts additional leads for Alpha (across multiple stages,
 *      one stalled) and Beta (two stages) using real UUIDs already
 *      in the database.
 *   5. Seeds one unread notification for Alpha (bell test).
 *   6. Prints a final summary so you can verify without SQL.
 *
 * Safe to re-run — uses ON CONFLICT DO NOTHING for inserts.
 */

import { createClient } from '@supabase/supabase-js'

// ── Config — read from env or hard-code for local dev ──────────────────────
const SUPABASE_URL             = process.env.NEXT_PUBLIC_SUPABASE_URL
  || 'https://jeqzqmwwguvuvghwzpeq.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplcXpxbXd3Z3V2dXZnaHd6cGVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTM2MzUyOCwiZXhwIjoyMTA0OTM5NTI4fQ.1Qczkw0MmsD5zWoZMFAupDj_pI9Q_daj8k-brAmO6mo'

// ── Known UUIDs from database inspection ──────────────────────────────────
const ALPHA_ID  = '8eb54558-9113-4ac5-a8de-dab979979060'  // test.consultant@apex.test
const STU1_ID   = '4a222912-497e-4519-ad53-070c62ee4686'  // test.student@apex.test
const STU2_ID   = 'e03ff31c-464b-4dfe-a8d4-d5f566e32454'  // jahanjolly2020@gmail.com
const EXISTING_LEAD_ID = '10d58b8d-f403-4c25-bc4e-56ae4b701b0a' // unassigned inquiry lead

// Programs (use varied ones for realistic card display)
const PROG_MSC_CS     = 'aaaaaaaa-0001-0001-0001-000000000001' // MSc Computer Science, Edinburgh
const PROG_MBA        = 'aaaaaaaa-0001-0001-0001-000000000002' // MBA Business Administration, Edinburgh
const PROG_DATA_SCI   = 'aaaaaaaa-0002-0002-0002-000000000001' // MSc Data Science, Toronto
const PROG_MIT        = 'aaaaaaaa-0003-0003-0003-000000000001' // Master of IT, Melbourne
const PROG_INFORMATICS= 'aaaaaaaa-0004-0004-0004-000000000001' // MSc Informatics, TU Munich

// Beta credentials
const BETA_EMAIL    = 'consultant.beta@apex.test'
const BETA_PASSWORD = 'TestPass123!'

// ── Helpers ────────────────────────────────────────────────────────────────

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
}

function log(msg) {
  console.log(`  ${msg}`)
}

function ok(label) {
  console.log(`✓ ${label}`)
}

function fail(label, err) {
  console.error(`✗ ${label}:`, err?.message ?? err)
}

// ── Main ───────────────────────────────────────────────────────────────────

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function run() {
  console.log('\n=== Phase 4 Test Seed ===\n')

  // ── 1. Ensure Alpha has a full_name ──────────────────────────────────────
  console.log('Step 1: Ensuring Consultant Alpha has full_name…')
  const { error: alphaErr } = await db
    .from('profiles')
    .update({ full_name: 'Consultant Alpha' })
    .eq('id', ALPHA_ID)
    .eq('full_name', 'Test Consultant') // only update if still using old name

  if (alphaErr) fail('update Alpha full_name', alphaErr)
  else ok('Consultant Alpha profile ready')

  // ── 2. Create Consultant Beta via Auth Admin API ──────────────────────────
  console.log('\nStep 2: Creating Consultant Beta auth user…')

  // Check if already exists
  const { data: existingUsers } = await db.auth.admin.listUsers()
  const betaExists = existingUsers?.users?.some(u => u.email === BETA_EMAIL)

  let BETA_ID = null

  if (betaExists) {
    BETA_ID = existingUsers.users.find(u => u.email === BETA_EMAIL).id
    ok(`Consultant Beta already exists (${BETA_ID})`)
  } else {
    const { data: newUser, error: createErr } = await db.auth.admin.createUser({
      email:           BETA_EMAIL,
      password:        BETA_PASSWORD,
      email_confirm:   true,           // skip email confirmation
      user_metadata: {
        role:       'consultant',
        full_name:  'Consultant Beta',
      },
    })

    if (createErr) {
      fail('create Consultant Beta', createErr)
      console.log('  Attempting to find existing profile by email instead…')
    } else {
      BETA_ID = newUser.user.id
      ok(`Consultant Beta created (${BETA_ID})`)
    }
  }

  // Verify profile row was created by the trigger
  if (BETA_ID) {
    const { data: betaProfile, error: profileErr } = await db
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('id', BETA_ID)
      .single()

    if (profileErr || !betaProfile) {
      // Trigger may not have fired — insert manually
      log('Profile row missing, inserting manually…')
      const { error: insertErr } = await db.from('profiles').upsert({
        id:        BETA_ID,
        role:      'consultant',
        full_name: 'Consultant Beta',
        email:     BETA_EMAIL,
        is_accepting_leads: true,
      }, { onConflict: 'id' })
      if (insertErr) fail('insert Beta profile', insertErr)
      else ok('Consultant Beta profile row created manually')
    } else {
      // Fix role if trigger defaulted to student
      if (betaProfile.role !== 'consultant') {
        await db.from('profiles').update({ role: 'consultant', full_name: 'Consultant Beta' }).eq('id', BETA_ID)
        ok('Fixed Consultant Beta role to consultant')
      } else {
        ok(`Consultant Beta profile OK (role=${betaProfile.role}, name=${betaProfile.full_name})`)
      }
    }

    // ── 3. Assign the existing unassigned lead to Alpha ────────────────────
    console.log('\nStep 3: Assigning existing lead to Consultant Alpha…')
    const { error: assignErr } = await db
      .from('leads')
      .update({ consultant_id: ALPHA_ID })
      .eq('id', EXISTING_LEAD_ID)
      .is('consultant_id', null)

    if (assignErr) fail('assign existing lead', assignErr)
    else ok('Existing inquiry lead assigned to Alpha')

    // ── 4. Seed leads for Alpha ────────────────────────────────────────────
    console.log('\nStep 4a: Seeding Alpha leads...')

    const alphaLeads = [
      // consultation — 2 days in stage
      {
        student_id:       STU2_ID,
        consultant_id:    ALPHA_ID,
        program_id:       PROG_MBA,
        stage:            'consultation',
        status:           'active',
        stage_entered_at: daysAgo(2),
        notes:            'Interested in part-time options.',
      },
      // documents — stalled, 10 days in stage (well past 72h threshold)
      {
        student_id:       STU1_ID,
        consultant_id:    ALPHA_ID,
        program_id:       PROG_DATA_SCI,
        stage:            'documents',
        status:           'stalled',
        stage_entered_at: daysAgo(10),
        notes:            'Awaiting transcripts from previous institution.',
      },
      // application — active, 1 day in stage
      {
        student_id:       STU2_ID,
        consultant_id:    ALPHA_ID,
        program_id:       PROG_MSC_CS,
        stage:            'application',
        status:           'active',
        stage_entered_at: daysAgo(1),
        notes:            null,
      },
    ]

    const { data: insertedAlpha, error: alphaLeadsErr } = await db
      .from('leads')
      .insert(alphaLeads)
      .select('id, stage, status')

    if (alphaLeadsErr) fail('insert Alpha leads', alphaLeadsErr)
    else {
      ok(`Inserted ${insertedAlpha.length} leads for Alpha:`)
      insertedAlpha.forEach(l => log(`  ${l.stage} / ${l.status} (${l.id})`))
    }

    // ── 5. Seed leads for Beta ─────────────────────────────────────────────
    console.log('\nStep 4b: Seeding Beta leads...')

    const betaLeads = [
      // inquiry — 3 days in stage
      {
        student_id:       STU1_ID,
        consultant_id:    BETA_ID,
        program_id:       PROG_MIT,
        stage:            'inquiry',
        status:           'active',
        stage_entered_at: daysAgo(3),
        notes:            null,
      },
      // decision — 4 days in stage
      {
        student_id:       STU2_ID,
        consultant_id:    BETA_ID,
        program_id:       PROG_INFORMATICS,
        stage:            'decision',
        status:           'active',
        stage_entered_at: daysAgo(4),
        notes:            'Offer received, awaiting student response.',
      },
    ]

    const { data: insertedBeta, error: betaLeadsErr } = await db
      .from('leads')
      .insert(betaLeads)
      .select('id, stage, status')

    if (betaLeadsErr) fail('insert Beta leads', betaLeadsErr)
    else {
      ok(`Inserted ${insertedBeta.length} leads for Beta:`)
      insertedBeta.forEach(l => log(`  ${l.stage} / ${l.status} (${l.id})`))
    }

    // ── 6. Seed notification for Alpha ─────────────────────────────────────
    console.log('\nStep 5: Seeding unread notification for Alpha…')
    const { error: notifErr } = await db.from('notifications').insert({
      user_id: ALPHA_ID,
      type:    'lead_assigned',
      content: 'A new lead has been assigned to you.',
      is_read: false,
    })

    if (notifErr) fail('insert notification', notifErr)
    else ok('Unread notification created for Alpha')

  } else {
    console.log('\n⚠ Could not determine Beta ID — skipping lead seed for Beta.')
    console.log('  Create the user manually in Supabase Dashboard → Authentication → Users')
    console.log(`  Email: ${BETA_EMAIL} | Password: ${BETA_PASSWORD}`)
    console.log('  Metadata: { "role": "consultant", "full_name": "Consultant Beta" }')
  }

  // ── 7. Final summary ────────────────────────────────────────────────────
  console.log('\n=== Final DB State ===\n')

  const { data: allLeads } = await db
    .from('leads')
    .select('id, stage, status, consultant_id, stage_entered_at')
    .order('consultant_id')

  const { data: allProfiles } = await db
    .from('profiles')
    .select('id, role, full_name, email')
    .in('role', ['consultant'])

  const { data: notifs } = await db
    .from('notifications')
    .select('user_id, is_read')

  console.log('Consultants:')
  allProfiles?.forEach(p => {
    const leads = allLeads?.filter(l => l.consultant_id === p.id) ?? []
    const unread = notifs?.filter(n => n.user_id === p.id && !n.is_read).length ?? 0
    console.log(`  ${p.full_name} (${p.email})`)
    console.log(`    ${leads.length} leads | ${unread} unread notifications`)
    leads.forEach(l => {
      const days = Math.floor((Date.now() - Date.parse(l.stage_entered_at)) / 86400000)
      console.log(`    → ${l.stage.padEnd(12)} | ${l.status.padEnd(9)} | ${days}d in stage`)
    })
  })

  const unassigned = allLeads?.filter(l => !l.consultant_id) ?? []
  if (unassigned.length) {
    console.log(`\n  Unassigned leads: ${unassigned.length}`)
  }

  console.log('\n=== Credentials for testing ===')
  console.log('')
  console.log('  Consultant Alpha:')
  console.log('    Email:    test.consultant@apex.test')
  console.log('    Password: TestPass123!')
  console.log('')
  console.log('  Consultant Beta:')
  console.log(`    Email:    ${BETA_EMAIL}`)
  console.log(`    Password: ${BETA_PASSWORD}`)
  console.log('')
  console.log('  Admin:')
  console.log('    Email:    test.admin@apex.test')
  console.log('    Password: TestPass123!')
  console.log('')
  console.log('  Dev server: npm run dev  (from apex_fe/)')
  console.log('  URL:        http://localhost:3000/login')
  console.log('')
}

run().catch(err => {
  console.error('\nFatal error:', err)
  process.exit(1)
})
