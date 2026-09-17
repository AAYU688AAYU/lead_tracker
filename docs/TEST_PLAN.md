# TEST_PLAN.md — Use-Case Logic & Screen State Validation
## B2B2C Educational Placement Agency CRM — Pre-Build Walkthrough

**Purpose:** Sanity-check pipeline logic and screen states across Student, Consultant, and Admin before any frontend code is written. Walk each scenario against the Stitch screens (STITCH_UI_UX_PROMPT.md) and confirm the flow holds together end-to-end.

**Format:** Each test case has Setup → Action → Expected Result → Architecture Reference → Gap Analysis.

**How to use:** For each TC, point to the Stitch screen and README section that satisfies it, or mark it `GAP`. Gaps found here cost a screen redesign. Gaps found after coding cost a refactor.

**Reading key:**
- `PASS` — fully covered by existing architecture + Stitch screens
- `GAP` — screen state or backend behavior not yet designed
- `DECISION` — requires a product decision before the screen can be built
- `PARTIAL` — backend covered in README, Stitch screen needs updating

---

## Core Happy Path

---

### TC-01 — New Student Onboarding

**Setup:** No account exists. Student lands on the platform for the first time.

**Action:** Student signs up via magic link, completes the intake form (name, email, phone, target countries, program interests), and submits.

**Expected Result:**
1. Student receives a welcome email and WhatsApp confirmation within seconds of submission.
2. Student lands on their dashboard (`/portal/student`) in a "waiting for consultant" state — not an empty screen, not a broken layout.
3. An unassigned lead appears in the Admin's attention list (`/admin` — attention section of D1).
4. The auto-assignment trigger fires and assigns the lead to the lowest-loaded consultant with available capacity.
5. If no consultant has capacity, the lead sits flagged in Admin's unassigned queue (not silently dropped).

**Architecture Reference:**
- Intake form: Stitch screen A2 (`/portal/student/apply`)
- Welcome email + WhatsApp: README §8 (Edge Function `auto-respond-lead`), §17.13 (custom domain), §17.14 (WhatsApp template)
- Auto-assignment trigger: README §16.8 (`tr_auto_assign_lead`)
- "Waiting for consultant" state: Stitch screen B1 — "matching you with a consultant" state specified
- Admin unassigned queue: Stitch screen D1 — attention list covers both stalled and unassigned

**Gap Analysis:**

| # | Gap | Severity |
|---|-----|----------|
| 1 | Intake form is at `/portal/student/apply` in Stitch but README §1 lists student portal URL as `/portal/student`. The public inquiry route needs a decision: is it behind auth (student must register first) or is it a public landing form? Currently inconsistent. | `DECISION` |
| 2 | Partial intake — student closes browser mid-form. No draft-save behavior exists anywhere in the README schema or Stitch screens. If the `leads` row only writes on final submit, partial progress is lost. If it writes on step 1, a half-filled lead enters the system. Neither path is designed. | `GAP` |
| 3 | The "matching you with a consultant" state in B1 covers the auto-assignment lag but has no timeout handling. If auto-assignment fails (no capacity) the student sees this indefinitely. No "we'll be in touch shortly" fallback copy or notification trigger for this specific state. | `GAP` |
| 4 | WhatsApp welcome message requires a Meta-approved template (§17.14). Template not registered = 400 error on every new submission. This is a launch blocker for the welcome flow, not a polish item. | `GAP` |

---

### TC-02 — Consultant Assignment

**Setup:** Student from TC-01, lead successfully created, auto-assignment fired.

**Action:** System assigns the lead to the lowest-loaded available consultant (auto), or Admin manually assigns from the unassigned queue in D1.

**Expected Result:**
1. Student's dashboard updates to show their assigned consultant's name and contact.
2. Consultant sees the new engagement appear in the `Inquiry` column of their Kanban (C1) — without refreshing.
3. An audio chime plays on the new card arrival (Stitch C1 specifies this).
4. The card does NOT pulse red — it has just arrived, it has not breached its 24h Inquiry SLA yet.

**Architecture Reference:**
- Auto-assignment: README §16.8, `tr_auto_assign_lead` BEFORE INSERT trigger
- Realtime delivery to consultant: README §7 (WAL → Realtime → WebSocket), §15.2 (`RealtimeProvider`)
- Auto-assignment INSERT race condition: README §17.7 — auto-assignment trigger fires AFTER INSERT, initial INSERT has `assigned_consultant_id = NULL`, Realtime broadcasts with NULL. Consultant B's channel filter misses the INSERT. Only the subsequent UPDATE reaches them.
- Student dashboard update: README §7 (Realtime subscription), Stitch B1

**Gap Analysis:**

| # | Gap | Severity |
|---|-----|----------|
| 1 | The Realtime channel filter race (§17.7) means the consultant's Kanban receives the new card via an UPDATE event, not an INSERT event. The `RealtimeProvider` handles UPDATE via `wasUnassigned` check (§17.7 fix). But the audio chime in C1 is currently wired to INSERT events only. If the card arrives via UPDATE, no chime plays. The chime trigger needs to also fire on `wasUnassigned === true` UPDATE events. | `GAP` |
| 2 | Student dashboard update on assignment: the student portal uses `cache: 'no-store'` (§14.2), so a page reload shows the consultant. But is the consultant name shown in real time without reload? No Realtime subscription on the student portal side is specified for `assigned_consultant_id` changes. Student may need to refresh to see their consultant. | `GAP` |
| 3 | Manual assignment by Admin: D1 shows the unassigned queue. D2 shows reassignment. But neither screen spec shows what happens to the Admin's view after they assign — does the lead leave the unassigned list immediately (optimistic update) or on next load? | `PARTIAL` |

---

### TC-03 — Stage Progression

**Setup:** Assigned engagement at `Inquiry`. Consultant has logged a call.

**Action:** Consultant advances the engagement to `Counseling`, then later to `Document Collection`.

**Expected Result:**
1. Only one action is available: "Advance to Counseling →" — no stage picker, no dropdown.
2. On click, the Kanban card moves immediately (optimistic update, §15.5), `is_stalled` resets, `last_contacted_at` updates.
3. If the DB write fails, the card rolls back to `Inquiry` with an error toast.
4. Student's dashboard stage tracker updates without a page refresh.
5. Student receives an automated email/WhatsApp notification for the stage change (§17.5).
6. No stage can be skipped — attempting `Inquiry → Document Collection` in one action is rejected by the FSM trigger (§17.1) with a clear error, not a silent failure.

**Architecture Reference:**
- FSM enforcement: README §17.1 (`tr_enforce_stage_transition`)
- Single advance button: STITCH C2 — explicitly specified as one button, not a picker
- Optimistic update + rollback: README §15.5
- Student notification trigger: README §17.5 (`tr_notify_student_on_stage_change`)
- Student Realtime update: not explicitly subscribed on student portal

**Gap Analysis:**

| # | Gap | Severity |
|---|-----|----------|
| 1 | Student sees stage update on their dashboard. The student portal has `cache: 'no-store'` but no Realtime subscription on `leads.stage`. The student must manually reload to see the updated stage. In a system that emails the student "Your application has advanced to Counseling," the portal showing the old stage on the same screen is a trust-damaging inconsistency. A Realtime subscription on the student dashboard for their own lead's `stage` field needs to be added. | `GAP` |
| 2 | The FSM trigger error message (`RAISE EXCEPTION`) surfaces as a PostgreSQL error string. The Server Action (§16.3) catches this and returns `success: false`. The toast (§15.5) shows `result.error`. But the raw Postgres error string ("Invalid stage jump: Inquiry → Document Collection") is technical copy — it needs to be translated into user-friendly language before reaching the toast. | `GAP` |
| 3 | Double-click protection: TC-03 explicitly calls this out. `useTransition` in React prevents concurrent submissions from the same button, but there is no explicit disable state on the advance button while the Server Action is in-flight. A fast double-click before `useTransition` is active could submit twice. The button needs `disabled` during the pending transition. | `GAP` |

---

### TC-04 — Document Request and Review

**Setup:** Engagement at `Document Collection`. Consultant reviews required documents.

**Action:** Consultant requests a transcript. Student uploads it. Consultant reviews and approves it.

**Expected Result:**
1. Student sees document status as "Pending review" immediately after upload — not after a server round-trip delay.
2. Consultant sees the uploaded document in C2 (Case View) without refreshing.
3. Consultant approves → student sees "Verified" without refreshing.
4. No state where the document appears uploaded on the student side but is invisible on the consultant side.

**Architecture Reference:**
- Document schema: README §6.1 (`public.documents`, `verification_status ENUM`)
- Document versioning: README §17.4 (`tr_supersede_prior_document`)
- Student upload screen: Stitch B2 — current-version-only view, "view previous version" link
- Consultant document view: Stitch C2 — document statuses section
- Server-side validation: README §16.5 (`confirmDocumentUploadAction`)

**Gap Analysis:**

| # | Gap | Severity |
|---|-----|----------|
| 1 | Upload flow: student uploads → `confirmDocumentUploadAction` runs server-side validation → inserts to `public.documents` with `verification_status = 'PENDING'`. But the Stitch B2 screen shows "Pending review" as an immediate state. The upload process has at minimum 2 server round-trips (generate signed URL, then confirm upload). During this window, what does the student see? An optimistic "uploaded" state before confirmation could show "Pending review" for a file that subsequently fails server-side validation and gets deleted. The upload component needs a three-state design: uploading → confirming → confirmed/rejected. | `GAP` |
| 2 | Consultant sees document in real time: `public.documents` is not in the `supabase_realtime` publication (README §7.1 only adds `leads`, `reminders`, `activity_logs`). A new document upload does not trigger a Realtime event to the consultant's channel. The consultant must refresh to see uploaded documents. | `GAP` |
| 3 | Document request mechanism: TC-04 says "Consultant requests a transcript." The README has a `documents` table and upload flow. But there is no "document request" schema — no way for a consultant to formally indicate "I need document type X from this student" that would surface as a call-to-action on the student's B2 screen. The student currently just sees a list of all possible document types. A `document_requests` table or a status field distinguishing "required and missing" from "not yet needed" does not exist. | `GAP` |

---

### TC-05 — Document Rejection

**Setup:** Same as TC-04. Consultant reviews the uploaded transcript.

**Action:** Consultant marks the document as `REJECTED` with a typed reason.

**Expected Result:**
1. Student sees the rejection and the specific reason on their B2 screen — not just a red badge.
2. A clear re-upload action is present inline on the rejected document row.
3. The rejection reason is stored and visible to both parties at all times.
4. When student re-uploads, the old rejected file is superseded (§17.4), not deleted, so the version history is preserved.

**Architecture Reference:**
- `verification_status = 'REJECTED'`: README §6.1
- `review_notes TEXT` field on `documents` table: README §6.1 — this is where the rejection reason lives
- Document versioning: README §17.4 (`is_current`, `superseded_by`, version trigger)
- Stitch B2: "A rejected document shows why in one short line" — ✓ specified

**Gap Analysis:**

| # | Gap | Severity |
|---|-----|----------|
| 1 | Student notification on rejection: §17.5 trigger fires on `leads.stage` UPDATE. A document rejection changes `documents.verification_status`, not `leads.stage`. No trigger or communication queuing fires when a document is rejected. Student does not receive an email or WhatsApp saying "Your transcript was rejected — please re-upload." The trigger in §17.5 needs to be extended or a separate trigger added for `documents.verification_status` changes. | `GAP` |
| 2 | Consultant rejection UX: C2 lists "current document statuses" but does not specify how a consultant submits a rejection reason. There is a `review_notes` field in the schema but no Stitch screen for the rejection input — no modal, no inline form, no character limit. This needs a deliberate screen design. | `PARTIAL` |

---

### TC-06 — In-App Messaging

**Setup:** Assigned student and consultant.

**Action:** Either party sends a message.

**Expected Result:** Message appears in both the student's screen and the consultant's Case View thread, forming one shared conversation.

**Architecture Reference:**
- Stitch B3 explicitly states: *"This reflects logged calls/notes, not live chat — there's no in-app messaging in this system."*
- README has `interaction_logger` but no `messages` table, no chat schema, no thread model.

**Gap Analysis:**

| # | Gap | Severity |
|---|-----|----------|
| 1 | **This TC as written cannot pass.** The system has no in-app messaging. The test case assumes a shared conversation thread that does not exist and is deliberately excluded from the Stitch spec. **This is a product scope decision, not an implementation gap.** Two options: (A) Accept that communication is external (WhatsApp, phone) and the system only logs contact notes — Stitch B3 is the read-only audit of those logs. (B) Build an in-app messaging system — requires a `messages` table, Realtime subscription on both portals, read receipts, and Stitch screens for both parties. Option B is significant scope. **Decide before build.** | `DECISION` |
| 2 | Even under Option A (no in-app chat), the consultant's contact log (C2 "Log Contact" action) and the student's activity timeline (B3) must read as the same data source — not two disconnected records. The consultant's logged note should appear on the student's B3 timeline as "Your consultant logged a contact on [date]: [summary if shareable]." Whether the full note text is shared with the student is another product decision. | `DECISION` |

---

## Edge Cases and Exceptions

---

### TC-07 — Consultant Reassignment

**Setup:** Active engagement with documents uploaded, contact notes logged, and stage at `Document Collection`. Currently assigned to Consultant A.

**Action:** Admin reassigns the engagement to Consultant B via D2 (admin consultants/engagement management screen).

**Expected Result:**
1. All history (documents, notes, activity timeline) transfers with the engagement — Consultant B is not starting blind.
2. Consultant B sees the engagement appear in their Kanban immediately (no refresh).
3. Consultant A's Kanban removes the card immediately (no refresh).
4. Student sees their consultant name update.
5. The offboarding trigger (§17.3) fires notification to super-admins if this is a deactivation-triggered reassignment.

**Architecture Reference:**
- Reassignment: Admin action updates `leads.assigned_consultant_id`
- Realtime filter behavior on reassignment: README §17.7 — UPDATE event with new `assigned_consultant_id` reaches Consultant B's filter. Old value no longer matches Consultant A's filter → A's card disappears on next UPDATE. But A's card does not disappear until the next UPDATE event hits — if the reassignment UPDATE is the only event, A's card disappears and B's card appears simultaneously. This is correct behavior, documented.
- Offboarding trigger: README §17.3 (`tr_consultant_deactivation`)
- Admin screen: Stitch D2 — reassign action specified

**Gap Analysis:**

| # | Gap | Severity |
|---|-----|----------|
| 1 | **Does the student get notified of the reassignment?** README §18 (Open Item 2) explicitly flags this as an unresolved product decision. The test case cannot fully pass without answering it. Two options documented in §18: notify (email/WhatsApp) or silent. Choose before building the trigger and the template. | `DECISION` |
| 2 | Consultant A's card disappearance: when the admin reassigns, the UPDATE to `assigned_consultant_id` fires a Realtime event. Consultant A's channel filter `assigned_consultant_id=eq.A_id` no longer matches the new row value — correct behavior. But does A's Kanban remove the card reactively, or does it just stop receiving updates for it while the card remains visually? The `RealtimeProvider` UPDATE handler patches the leads array but does not remove cards where `assigned_consultant_id` no longer matches. A card that belongs to someone else can sit in Consultant A's Kanban indefinitely. A cleanup step is needed: on any UPDATE where `assigned_consultant_id !== consultantId`, remove the card from state. | `GAP` |
| 3 | D2 reassign confirmation UX: Stitch specifies the deactivation warning ("visibly warn how many active engagements will need reassignment"). But for a simple single-engagement reassignment (not a deactivation), there is no confirmation step specified. A misclick in a table with a reassign dropdown could silently move a live student's case. A confirmation step or undo window should be specified. | `PARTIAL` |

---

### TC-08 — Consultant Capacity / Overload

**Setup:** Consultant A has 28 active engagements. Their `max_lead_capacity` is 30. A new lead arrives.

**Action:** Auto-assignment trigger evaluates available consultants.

**Expected Result:**
1. If capacity is available: Consultant A is assigned (lowest-loaded with headroom).
2. If no consultant has capacity: lead is flagged `ASSIGNMENT_FAILED`, appears in Admin's unassigned attention list (D1), admin sees it is unassigned and can see load across all consultants before manually assigning.
3. Admin cannot accidentally overload a consultant from the assignment UI without seeing their current load.

**Architecture Reference:**
- Auto-assignment with capacity cap: README §16.8 (`fn_auto_assign_lead`, `max_lead_capacity`)
- `ASSIGNMENT_FAILED` log: README §16.8
- Admin attention list: Stitch D1 — specifically splits "stalled long enough" from "leads that failed auto-assignment"
- Consultant load table: Stitch D2 — "name, active count, capacity, stalled count, accepting-new-leads toggle"

**Gap Analysis:**

| # | Gap | Severity |
|---|-----|----------|
| 1 | The D2 consultant table shows `capacity` as a column. But "capacity" as displayed — is it the raw `max_lead_capacity` number, the current active count, or a percentage? For the admin to make a good manual assignment decision, they need to see both current load AND max, not just a number. The column needs a format like "28 / 30" or a filled capacity bar. Stitch D2 needs this clarified. | `PARTIAL` |
| 2 | The `is_accepting_leads` toggle on D2 allows a consultant to opt out of new auto-assignments (e.g. during leave). But there is no visual signal to the admin that a consultant is unavailable when the admin is manually assigning from the unassigned queue. If the admin selects a consultant who has `is_accepting_leads = FALSE` from a dropdown, should the system warn or block? | `GAP` |
| 3 | No capacity-increase flow exists. When the agency hires a new consultant, `max_lead_capacity` must be set. When a senior consultant takes on more, it must be updatable. No admin UI for editing `max_lead_capacity` per consultant is specified in D2 or anywhere in the Stitch spec. | `GAP` |

---

### TC-09 — Stuck Lead / Inactivity Escalation

**Setup:** An engagement has had no consultant activity for an extended period — beyond its stage SLA threshold.

**Action:** `pg_cron` evaluates every 60 seconds. The threshold is breached.

**Expected Result:**
1. `is_stalled = TRUE` set on the lead row.
2. A reminder row is inserted to `public.reminders`.
3. Consultant's Kanban card gets the single pulsing red dot + "Nh inactive" label (C1 Stitch spec).
4. Consultant's Follow-Up Queue (`/crm/consultant/stalled`, Stitch C3) shows this engagement sorted by hours inactive.
5. Admin's attention list (D1) surfaces this if the consultant has not acted within an additional escalation window.
6. When the consultant logs contact, `is_stalled` resets, reminder resolves, red dot disappears.

**Architecture Reference:**
- Stall detection: README §2 Work 4, §6.3 (`fn_detect_stalled_leads`)
- Exception handling in cron: README §16.2 (EXCEPTION block per row)
- Stall visual: Stitch C1 — pulsing red dot, "Nh inactive" label
- Follow-up queue: Stitch C3 — sorted by hours inactive
- Admin escalation: Stitch D1 — attention list
- Clearing stall: README §5.2 (Sequence 2), `logConsultationAction` (§14.3)

**Gap Analysis:**

| # | Gap | Severity |
|---|-----|----------|
| 1 | Admin escalation threshold: D1 shows stalled engagements in the attention list. But at what point does a stalled engagement escalate to the admin view? Is it immediately on `is_stalled = TRUE`? Or only after a secondary threshold (e.g., stalled and consultant has not acted within 4 hours of the first alert)? Without this defined, the admin dashboard either shows every stalled lead (noise) or never escalates at all. This threshold needs a schema column (`escalation_threshold_hours` in `stage_threshold_configs`?) and a documented rule. | `DECISION` |
| 2 | Student perspective during a stall: the student's B1 dashboard shows their current stage. There is no visual signal to the student that their application has been inactive. A student who is anxious about their application has no way to know whether their case is being worked on or sitting idle. Whether to surface stall status to the student (or specifically hide it) is a product decision that should be made deliberately, not by omission. | `DECISION` |

---

### TC-10 — Incomplete Intake / Form Abandonment

**Setup:** Student starts the onboarding form (`/portal/student/apply`). They complete step 1 (name, email) but close the browser before step 2 (target countries, programs).

**Action:** Student returns the next day and logs back in.

**Expected Result:**
1. Their partially completed form is preserved — they resume at step 2, not step 1.
2. The partial lead does NOT silently vanish from any queue.
3. The partial lead does NOT trigger the welcome email/WhatsApp (those fire on final submit, not on initial data entry).
4. The partial lead does NOT appear in a consultant's Kanban (no consultant is assigned to an unsubmitted inquiry).

**Architecture Reference:**
- Lead creation: README §6.1 — `INSERT INTO public.leads` happens on form submit
- Auto-respond webhook: fires on INSERT to `public.leads`
- Auto-assignment trigger: fires on INSERT to `public.leads`

**Gap Analysis:**

| # | Gap | Severity |
|---|-----|----------|
| 1 | **No draft-save mechanism exists anywhere in this architecture.** The form either writes to `public.leads` on final submit (which loses partial progress on close) or writes on step 1 (which triggers the webhook, the auto-assignment, and the welcome email for an incomplete lead). Neither is acceptable. A `drafts` table or a `status = 'DRAFT'` field on `leads` with webhook guards needs to be designed. This is a launch-blocking gap for any multi-step intake form. | `GAP` |
| 2 | The Stitch A2 screen is a single-page inquiry form, not a multi-step wizard. If the form is genuinely single-page (all fields visible at once), form abandonment is a simpler problem — the browser can preserve field values via `localStorage` or `sessionStorage` without a database draft. But Stitch A2 does not explicitly state single-page vs multi-step. This needs to be resolved in the Stitch spec before the form is built. | `DECISION` |

---

### TC-11 — Admin Drills Into a Single Consultant

**Setup:** Admin is on D1 (agency-wide dashboard). Multiple consultants, varying load and stall counts.

**Action:** Admin clicks into Consultant A's individual performance and caseload.

**Expected Result:**
1. A path exists from D1 aggregate view → individual consultant detail view.
2. Admin sees Consultant A's full portfolio: all engagements, stages, stall status, contact log summary.
3. Admin can reassign individual engagements from this view.
4. Admin can see conversion rate and average stage dwell time for this consultant.

**Architecture Reference:**
- D1: Stitch D1 — per-consultant load widget (active count, stalled count, capacity used)
- D2: Stitch D2 — consultant management table + agency-wide engagements table
- Analytics: README §14.4 (`getCachedCounselorVelocity`, `mv_counselor_performance`)

**Gap Analysis:**

| # | Gap | Severity |
|---|-----|----------|
| 1 | **There is no individual consultant detail screen specified in the Stitch prompt.** D1 has a per-consultant load widget. D2 has a consultant table with deactivate/add actions and a separate agency-wide engagements table. But drilling from "Consultant A row in D2" into "Consultant A's full portfolio view" goes to a screen that does not exist in the Stitch spec. This is a missing screen. | `GAP` |
| 2 | The `mv_counselor_performance` materialized view (README §14.6) computes conversion rate, average lead age, total assigned, total admitted. This data exists. But it has no dedicated screen to display it. The closest is D1's per-consultant widget, which shows raw counts, not rates or dwell times. A consultant performance detail screen needs to be added to the Stitch spec. | `GAP` |

---

### TC-12 — Mobile Student Session

**Setup:** Student accesses their dashboard, documents screen, and activity timeline on a mobile browser (375px viewport).

**Action:** Student attempts each primary action: view pipeline stage, view per-university application statuses, upload a document, view contact history.

**Expected Result:**
1. All four actions are reachable on mobile — no horizontal overflow, no truncated buttons, no inaccessible tap targets.
2. Document upload works on mobile — file picker opens, upload completes, status updates.
3. Per-university application cards (B1) stack vertically and remain readable.
4. Stage tracker on B1 adapts — a horizontal 6-stage bar does not fit on 375px; it needs a condensed mobile representation.

**Architecture Reference:**
- Mobile-first requirement: Stitch Master Prompt — "Mobile web is the primary context for Student flows"
- Student screens: Stitch B1, B2, B3
- Direct S3 upload: README §4 — `STUDENT_APP -->|Direct S3 Upload with Signed URL| STORAGE_BUCKET`

**Gap Analysis:**

| # | Gap | Severity |
|---|-----|----------|
| 1 | The 6-stage horizontal pipeline bar on B1 is designed to show all 6 stages simultaneously. On a 375px viewport, six equal-width columns do not fit without text overflow or illegible truncation. A mobile-specific representation needs to be specified: options include a segmented dot indicator (active dot highlighted), a "Stage 3 of 6: Document Collection" label with prev/next context, or a vertical stepper. This is a Stitch B1 screen update, not a code issue. | `GAP` |
| 2 | File upload on mobile: iOS Safari and Android Chrome both support `<input type="file">`. The `DocumentUploader` component is referenced in the file tree (README §11) but its implementation is not specified. Camera capture (`capture="environment"`) vs file library picker — passport photos may need camera access, transcripts need file library. The upload component needs an `accept` attribute per document type and explicit `capture` handling for photo-based documents. | `PARTIAL` |
| 3 | The Consultant CRM and Admin screens are "desktop-optimized, degrading gracefully to tablet" per the Stitch master prompt. No mobile breakpoint is specified for the 6-column Kanban (C1). If a consultant opens the CRM on their phone, the Kanban is unusable. This is an accepted tradeoff per the spec — but it should be explicitly documented so it is not mistaken for a bug during testing. | `PASS` (accepted tradeoff — document it) |

---

## Summary — All Gaps by Priority

```
┌──────┬─────────────────────────────────────────────────┬──────────┬──────────────────────────────────────────────┐
│ TC   │ Gap Description                                 │ Type     │ Fix Required                                 │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 01   │ Public vs auth-gated inquiry form               │ DECISION │ Product decision: register-then-apply or     │
│      │                                                 │          │ public form with email verification          │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 01   │ Partial intake / draft-save not designed        │ GAP      │ Add drafts table or DRAFT status field +     │
│      │                                                 │          │ webhook guard on non-SUBMITTED leads         │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 01   │ No-capacity state has no timeout/fallback copy  │ GAP      │ Stitch B1 needs explicit empty/fallback      │
│      │                                                 │          │ state for unassigned beyond N minutes        │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 01   │ WhatsApp template not registered                │ GAP      │ Register template before go-live (§17.14)    │
│      │                                                 │          │ — launch blocker                             │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 02   │ Audio chime wired to INSERT only, not           │ GAP      │ Add chime trigger to wasUnassigned UPDATE    │
│      │ wasUnassigned UPDATE (auto-assign race)         │          │ handler in RealtimeProvider                  │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 02   │ Student portal has no Realtime sub on           │ GAP      │ Add Realtime subscription for                │
│      │ assigned_consultant_id — must refresh to see   │          │ leads.assigned_consultant_id on B1           │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 03   │ Student portal has no Realtime sub on stage     │ GAP      │ Add Realtime subscription for leads.stage    │
│      │ — must refresh to see stage change             │          │ on B1 student dashboard                      │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 03   │ FSM error text is raw Postgres exception string │ GAP      │ Translate DB error to user copy in           │
│      │                                                 │          │ updateLeadStageAction before toast           │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 03   │ Advance button not disabled during pending      │ GAP      │ Add disabled prop tied to                    │
│      │ Server Action — double-click risk              │          │ useTransition isPending state                │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 04   │ Upload has no three-state UX (uploading /       │ GAP      │ DocumentUploader needs loading/confirming/   │
│      │ confirming / confirmed) — optimistic mismatch  │          │ confirmed states, not just done/error        │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 04   │ documents table not in Realtime publication     │ GAP      │ Add documents to supabase_realtime pub +     │
│      │ — consultant must refresh to see uploads       │          │ Realtime sub in C2 Case View                 │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 04   │ No document request schema or UX               │ GAP      │ Add document_requests table or required_docs │
│      │                                                 │          │ field so consultant can formally request     │
│      │                                                 │          │ specific doc types from student              │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 05   │ No trigger or notification on document          │ GAP      │ Extend §17.5 trigger or add separate trigger │
│      │ rejection — student not informed               │          │ on documents.verification_status UPDATE      │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 05   │ Rejection reason input not designed in C2       │ PARTIAL  │ Add rejection modal/inline form to Stitch C2 │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 06   │ No in-app messaging exists — TC-06 cannot pass  │ DECISION │ Decide: external comms only (contact log)    │
│      │ as written                                      │          │ vs build full in-app messaging (major scope) │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 06   │ Consultant note visibility to student           │ DECISION │ Decide whether logged contact notes are      │
│      │ undefined                                       │          │ shown on student B3 timeline or kept internal│
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 07   │ Student not notified on reassignment            │ DECISION │ README §18 Open Item 2 — decide and build    │
│      │ (Open Item 2)                                   │          │ trigger + template or explicitly omit        │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 07   │ Old consultant's Kanban does not remove card    │ GAP      │ RealtimeProvider UPDATE handler needs        │
│      │ after reassignment                              │          │ cleanup step: remove card if                 │
│      │                                                 │          │ assigned_consultant_id !== consultantId      │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 07   │ No confirmation step for single reassignment    │ PARTIAL  │ Add confirmation dialog to D2 reassign action│
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 08   │ Capacity column in D2 shows raw number only     │ PARTIAL  │ Change to "28 / 30" format or capacity bar   │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 08   │ No warning when manually assigning to a         │ GAP      │ Admin assignment UI should surface           │
│      │ consultant with is_accepting_leads = FALSE      │          │ unavailability state before confirming       │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 08   │ No UI to edit max_lead_capacity per consultant  │ GAP      │ Add editable capacity field to D2 consultant │
│      │                                                 │          │ row (inline edit or settings drawer)         │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 09   │ Admin escalation threshold not defined          │ DECISION │ Define escalation_threshold_hours in         │
│      │                                                 │          │ stage_threshold_configs or separate table    │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 09   │ Student has no visibility into stall status     │ DECISION │ Decide: show "your application needs         │
│      │ of their own application                        │          │ attention" on B1 or hide completely          │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 10   │ No draft-save on intake form (same as TC-01)    │ GAP      │ Resolved by TC-01 fix above                  │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 10   │ Multi-step vs single-page form not decided      │ DECISION │ Confirm in Stitch A2: single-page or wizard  │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 11   │ Individual consultant detail screen missing     │ GAP      │ Add consultant detail screen to Stitch       │
│      │ from Stitch spec                                │          │ (new screen: D4 or drill-in from D2)         │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 11   │ mv_counselor_performance data has no display    │ GAP      │ Consultant performance metrics need a screen │
│      │ screen                                          │          │ — add to D1 expandable widget or D4 detail  │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 12   │ 6-stage bar does not fit on 375px               │ GAP      │ Stitch B1 needs mobile-specific stage        │
│      │                                                 │          │ representation (dot indicator or label)      │
├──────┼─────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────────┤
│ 12   │ DocumentUploader needs accept + capture attrs   │ PARTIAL  │ Specify per document-type accept MIME and    │
│      │ per document type                               │          │ capture behavior in DocumentUploader spec    │
└──────┴─────────────────────────────────────────────────┴──────────┴──────────────────────────────────────────────┘
```

---

## Open Product Decisions — Resolve Before Build

These are not implementation gaps. They require a deliberate business answer. Defaulting silently produces a system that behaves one way without anyone having chosen it.

| # | Decision | Options | Default if Unaddressed |
|---|----------|---------|----------------------|
| D1 | Is the intake form public (unauthenticated) or behind auth? | (A) Public form → email verification → account created. (B) Student registers first, then fills intake. | B — but A is better UX for conversion |
| D2 | Multi-step wizard vs single-page intake form? | (A) Single page: all fields visible, browser-preserved on close. (B) Multi-step wizard: draft-save required. | Undefined — both Stitch A2 and README are silent |
| D3 | Is there in-app messaging, or is communication external only? | (A) External only (WhatsApp/phone) + contact log. (B) In-app messaging (major scope). | A — Stitch B3 already reflects this, but TC-06 exposes the ambiguity |
| D4 | Are consultant contact notes visible to students on B3? | (A) Full note text visible. (B) Only "Consultant logged contact on [date]" visible, no content. (C) Nothing shown. | Undefined |
| D5 | Does the student get notified on consultant reassignment? | (A) Email + WhatsApp notification. (B) Silent reassignment. | Silent — but trust-damaging if the student is actively watching their portal |
| D6 | At what point does a stalled lead escalate to Admin view? | (A) Immediately on is_stalled = TRUE. (B) Only after consultant has not acted for X hours post-alert. | Undefined — D1 attention list would be overwhelmed with noise under option A |
| D7 | Is the student shown any stall indicator on their B1 dashboard? | (A) Show "your application needs attention" badge. (B) Hide completely — agency manages this internally. | Hidden — but students often assume silence = nothing happening |

---

## Screens Required That Do Not Yet Exist in Stitch

| Screen | Route | Required By |
|--------|-------|-------------|
| Consultant Portfolio Detail | `/admin/consultants/[id]` | TC-11 — drill-in from D1/D2 |
| Consultant Performance Metrics | Inside D4 or D1 expandable | TC-11 — `mv_counselor_performance` data |
| Document Rejection Input | Modal/panel inside C2 | TC-05 — rejection reason entry |
| Capacity Edit | Inline in D2 consultant row | TC-08 — `max_lead_capacity` editing |
| Consultant-Unavailable Warning | Modal overlay on D2 assign | TC-08 — `is_accepting_leads = FALSE` guard |

---

## Architecture Changes Required Before Frontend Build

These are backend/schema changes exposed by this test plan that are not yet in the README:

| Change | TC | Location | Description |
|--------|----|-----------|----|
| Add `documents` to `supabase_realtime` publication | TC-04 | README §7.1 | Consultant must receive document upload events in real time |
| Add Realtime subscription to student portal (leads.stage, assigned_consultant_id) | TC-02, TC-03 | README §7 | Student dashboard must update without page refresh |
| Add `wasUnassigned` chime trigger to RealtimeProvider | TC-02 | README §15.2 / §17.7 | Audio chime fires on auto-assigned UPDATE, not just INSERT |
| Remove-card-on-reassignment in RealtimeProvider UPDATE handler | TC-07 | README §15.2 | Cards for reassigned leads must leave old consultant's Kanban |
| Draft-save mechanism for intake form | TC-01, TC-10 | README §6.1 | Either `drafts` table or `status = 'DRAFT'` on leads with webhook guard |
| Trigger on `documents.verification_status` for student notification | TC-05 | README §17.5 | Document rejection must notify student via email/WhatsApp |
| Escalation threshold field in `stage_threshold_configs` | TC-09 | README §6.1 | Separate SLA for first-alert vs admin-escalation |
| `accept` + `capture` attributes on DocumentUploader per doc type | TC-12 | README §11 | Mobile file picker needs MIME type restrictions and camera access |
