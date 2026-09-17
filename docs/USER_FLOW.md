# USER_FLOW.md — Apex
## Screen-by-Screen Logic Flow for All Three User Roles

**Purpose:** Two things in one file:
1. The logical screen sequence for each user role — use as a Stitch flow
   arrangement prompt and as the navigation/routing reference during build.
2. A pre-code UX logic check — walk each case in Section 6 against the Stitch
   screens before writing backend code. Any failure is a design gap, not a bug.

**Relationship to other files:**
- `STITCH_UI_UX_PROMPT.md` — screen-level design briefs (what each screen looks like)
- `TEST_PLAN.md` — backend logic test cases (what the code must do)
- This file — the connective tissue: how screens relate, what state flows between
  them, and whether the flow holds together as a complete product

**How to use with Stitch:**
Paste Section 5 (Stitch Arrangement Prompt) after all screens are generated.
Stitch will draw arrows and transition labels — it cannot arrange existing screens,
only generate new ones, so use Figma or FigJam to actually position the frames.

---

## The Three User Journeys

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         APEX — USER FLOW MAP                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STUDENT JOURNEY (light theme, mobile-first)                                 │
│  A2 (public) → A1 → B1 → B2 / B3                                            │
│                                                                              │
│  CONSULTANT JOURNEY (dark theme, desktop-first)                              │
│  A1 → C1 ↔ F1 (table toggle) → C2 ↔ D5 (panel) / C3 / F4 (notifications)  │
│                                                                              │
│  SUPER-ADMIN JOURNEY (dark theme, desktop-first)                             │
│  A1 → D1 → D2 / D4 → C2 ↔ D3 (panel)                                       │
│       └→ F2 (pipeline settings) / F3 (templates)                            │
│                                                                              │
│  DEMO (operator-only, not a user role)                                       │
│  E1 (self-contained)                                                         │
│                                                                              │
│  FLOW INVARIANTS — these are always true regardless of path:                 │
│  • B3 never shows internal consultant notes — only student-safe summaries    │
│  • C1/F1/B1/B3 all use the same stage label — rename in F2 propagates all   │
│  • Stall indicator (Brick dot) appears only in C1, C3, F1, D1 — never B1    │
│  • A consultant URL-guessing another consultant's lead returns 403, not 404  │
│  • Unauthenticated access to /crm or /admin redirects to A1, not blank page │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Journey 1 — The Student

A student is a prospective university applicant. They arrive at the platform
from a referral, social media, or agency outreach. They have no account yet.
Their entire experience is mobile-first, light-themed, and must feel calm and
human at every step — this is a stressful, high-stakes process for a real person.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STUDENT JOURNEY — Complete Flow                                             │
│                                                                             │
│  [PUBLIC]                [AUTH]               [PORTAL]                     │
│                                                                             │
│   A2                →     A1          →         B1                          │
│  Inquiry Form           Login                Dashboard                      │
│  (no account)         (magic link)          (home base)                    │
│                                                   │                         │
│                                          ┌────────┴────────┐               │
│                                          │                 │               │
│                                         B2               B3               │
│                                       Documents       Activity             │
│                                        Vault          Timeline             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Step 1 → A2 — Student Inquiry Form
**Route:** `/portal/student/apply` (public, no login required)
**Entry point:** Student arrives from agency website, social link, or WhatsApp
referral. No account needed to reach this screen.

**What the student does:**
- Fills out name, email, phone, target countries, program interest, intake year
- Reads the reassurance line: "You'll get a confirmation by email and WhatsApp
  within minutes"
- Taps **Submit Inquiry →**

**What happens on submit:**
- Success state: reference number shown (AB-2026-XXXX), student name confirmed,
  "Check your email and WhatsApp" message
- Backend: lead row inserted → auto-assignment trigger fires → welcome email +
  WhatsApp dispatch in 2–4 seconds
- A magic link lands in the student's inbox allowing them to activate their
  portal account

**Form validation states (must design explicitly):**
- Invalid email format: inline error beneath the email field — "Please enter
  a valid email address." Form does not submit. Nothing silently fails.
- Required field empty on submit attempt: each empty required field gets an
  inline error label. The submit button does not navigate away.
- Duplicate submission (same email submits twice): the success state still
  shows — the backend handles idempotency. The student should not see an error
  for submitting twice.

**Transition to next screen:**
→ Student clicks the magic link in their welcome email
→ Browser opens → **A1 (Login)**

---

### Step 2 → A1 — Login
**Route:** `/auth/login`
**Entry context:** Student is arriving via a magic link from their welcome
email. The login screen is role-agnostic — same screen for all three roles.

**What the student does:**
- Magic link pre-fills or bypasses the email/password form
- Session established, role detected as `student`
- System routes automatically to `/portal/student`

**Transition to next screen:**
→ Auto-redirect after authentication → **B1 (Student Dashboard)**

**Note:** A student returning after their first session also enters here with
email/password (or another magic link). The flow is identical — role detection
routes them to B1 every time.

**Alternative path — student without a portal account checking status:**
A student who submitted via A2 but has not yet activated their portal account
can check their application status using their reference number. This path
does NOT require login:

A2 success state shows reference number → student visits `/portal/check`
→ enters reference number or email → sees their current stage and a read-only
timeline (same data as B3 but unauthenticated, showing only student-safe events).

**What this screen must never show:**
- Internal consultant notes
- Stall status or SLA breach information
- Consultant workload or capacity data
- Any other student's data (even if the reference number is guessed incorrectly —
  return "Reference not found" not a different student's record)

This is equivalent to Screen 2 in the new prompt pack ("Application Status
Lookup"). It is NOT currently in the Stitch spec — add it as screen B0 if
the agency wants unauthenticated status checks. Without it, a student who loses
the magic link email has no way to check their status without contacting the
agency directly.

---

### Step 3 → B1 — Student Dashboard *(home base)*
**Route:** `/portal/student`
**Entry context:** Student has just activated their account or is returning.
This is the screen they will return to most frequently throughout their journey.

**What the student sees:**

**State A — Freshly submitted, consultant not yet assigned (rare, < 60 seconds):**
- Stage tracker shows "Inquiry" as current stage
- Consultant section shows: "We're matching you with a consultant — you'll be
  notified shortly"
- No university application rows yet (none have been shortlisted)

**State B — Normal active state (most visits):**
- Stage tracker: current stage highlighted (e.g. "Document Collection")
  Mobile: compact step indicator showing previous/current/next stage
  Desktop: full horizontal 6-stage stepper
- University applications section: each target university as its own row with
  independent status chip (Shortlisted / Applied / Conditional Offer / etc.)
- Assigned consultant: name, title, "Contact history →" link

**What the student can do from B1:**
- Tap **"Contact history →"** → goes to **B3 (Activity Timeline)**
- Tap any university application row → future detail view (not in current spec)
- Navigate to **B2 (Documents)** via bottom navigation or a documents CTA
  (e.g. "2 documents need attention" prompt if any are in Rejected state)

**Transitions out:**
→ "Contact history" link → **B3**
→ Documents navigation → **B2**

---

### Step 4a → B2 — Documents
**Route:** `/portal/student/documents`
**Entry context:** Student navigates here to upload required documents or check
review status. May be prompted by a notification ("Your transcript was rejected").

**What the student sees:**
- List of required document types, each with current status only
- Rejected documents show the rejection reason inline in one line
- Upload action available on Not Uploaded and Rejected rows only

**Key interaction — the upload three-state:**
1. Student taps upload → file picker opens
2. **Uploading...** — progress indicator, button locked
3. **Confirming...** — server-side validation running, still locked
4. Either: **Pending review** (success) or **Upload failed — [reason]** (rejected
   by server due to MIME/size check)

**Why the three-state matters:** The backend can silently delete a file that
fails server-side checks. Showing "Uploaded" before confirmation is reached
would be a false positive — the student would think their document is submitted
when it has already been deleted.

**Transitions out:**
→ Back navigation → **B1**

---

### Step 4b → B3 — Activity Timeline
**Route:** `/portal/student/activity`
**Entry context:** Student taps "Contact history" from B1, or arrives from a
notification about a stage change or document review.

**What the student sees:**
A single chronological timeline (most recent first) with two visually distinct
entry types:

**Consultant contact entries** (logged by the consultant in C2):
- Channel icon + date + optional shared summary
- If consultant provided a summary: "Phone call · Jan 14 · Discussed IELTS
  requirements and shortlist"
- If no summary was shared: "Your advisor logged a contact · Jan 14"
  (signals activity without leaking operational detail)

**Automated system events** (triggered by backend):
- Stage advance: "Your application advanced to Document Collection · Jan 15"
- Document verified: "Your transcript was reviewed and verified · Jan 17"
- Consultant reassigned: "Your case has been transferred to a new advisor · Jan 20"

**What B3 must never show (permission invariant):**
- Internal consultant notes (the full note field from C2 Log Contact)
- Stall status, SLA breach data, or hours inactive
- Stage regression reasons logged by super-admin
- Any data from another student's engagement
- Communication log delivery failures (those are consultant-visible only, in C2)

If a student attempts to access B3 for another student's lead by URL
manipulation, RLS returns empty data — the page shows the student's own
empty timeline, not an error exposing the existence of other records.

**Transitions out:**
→ Back navigation → **B1**

---

## Journey 2 — The Consultant

A consultant is an agency employee. They manage a portfolio of student
engagements. They spend most of their working day in this interface.
Their experience is desktop-first, dark-themed, and built for density and speed.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CONSULTANT JOURNEY — Complete Flow                                          │
│                                                                             │
│   A1          →    C1           →       C2                                  │
│  Login           Kanban             Case View                               │
│  (role:        (home base,          (per student)                           │
│  consultant)    live board)              │                                  │
│                    │               ┌────┴────┐                              │
│                    │              D5        C3                              │
│                    │          Doc Review  Follow-Up                         │
│                    │           (panel)     Queue                            │
│                    │                                                        │
│                    └──────────────────────────────────────────────────────  │
│                    (new card arrives via Realtime — no navigation needed)   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Step 1 → A1 — Login
**Route:** `/auth/login`
**Entry context:** Consultant opens their browser, navigates to the platform.
Role detected as `consultant` after authentication.

**Transition:**
→ Auto-redirect → **C1 (Kanban Dashboard)**

---

### Step 2 → C1 — Consultant Kanban Dashboard *(home base)*
**Route:** `/crm/consultant`
**Entry context:** Consultant's primary working screen. They will spend the
majority of their day here. The board is live — new cards arrive without reload.

**What the consultant sees:**
- 6-column Kanban: Inquiry | Counseling | Document Collection | Application |
  Fee/Verification | Admitted
- Stats strip: "38 active · 5 stalled · 4 new this week"
- Each card: student name, target countries, days in stage
- Stalled cards only: one small Brick pulsing dot + "Nh inactive" label

**Live Realtime states the board handles silently:**
- New card slides in (auto-assigned lead arrives) → audio chime if enabled
- Stall dot fades onto an existing card (pg_cron detected breach)
- Stall dot clears (consultant logged contact in C2)
- Card fades out (lead reassigned by admin to another consultant)

**What the consultant can do from C1:**
- Click any card → **C2 (Case View)** for that student
- Navigate left sidebar → **C3 (Follow-Up Queue)** to see all stalled leads
- Navigate left sidebar bell icon → **F4 (Notification Centre)**
- View toggle (top right) → **F1 (Leads Table View)** — same data, denser format

**Transitions out:**
→ Click card → **C2**
→ Left nav "Stalled" → **C3**
→ Left nav bell icon → **F4**
→ View toggle → **F1**

**Mobile-specific path (375px):**
The 6-column Kanban is replaced with a stage chip/tab row + filtered list.
Tapping a chip (e.g. "Counseling") filters the list to that stage's leads.
Tapping a list item → **C2** (full-screen on mobile, not a drawer).
The view toggle to F1 table is hidden on mobile — the filtered list IS the
table equivalent at mobile size.

---

### Step 3 → C2 — Engagement Case View *(core working screen)*
**Route:** `/crm/consultant/[engagement-id]`
**Entry context:** Consultant clicks a card on C1 to work a specific student's case.

**Two-column layout:**

**Left column — case content (60%):**

*Section 1 — Student identity:*
Name, target countries, reference number, date created

*Section 2 — Pipeline position:*
Current stage name + ONE button: **[ Advance to [next stage] → ]**
- Button is disabled while a Server Action is in-flight (prevents double-submit)
- On stall breach: Brick dot + "Nh inactive" shows beneath the stage name
- Logging contact clears the stall indicator immediately (optimistic update)

*Section 3 — University applications:*
Table showing each university target with independent status per row
(editable inline: Shortlisted → Applied → Conditional Offer → etc.)

*Section 4 — Documents:*
Compact status rows. Each document type with current status chip.
"Review" button appears on Pending documents → opens **D5 (Rejection Panel)**

**Right column — actions sidebar (40%), sticky:**

*Log Contact:*
- Channel selector: Phone / WhatsApp / In-Person / Email
- Internal note (required, min 5 chars, never shown to student)
- Student-visible summary (optional, max 120 chars, appears on B3 if filled)
- **[ Log contact ]** button

*Auto-response delivery log:*
Collapsed accordion. Email + WhatsApp delivery status from initial submission.

**Bottom — Activity timeline:**
Append-only audit trail. Stage transitions, document reviews, contact logs,
stall events. Most recent first.

**What happens when consultant clicks "Review" on a Pending document:**
→ **D5 (Document Rejection Panel)** opens inline within C2

**Transitions out:**
→ "Review" on a document → **D5 (inline panel, stays in C2)**
→ Back navigation → **C1**

---

### Step 3a → D5 — Document Rejection Panel *(inline panel inside C2)*
**Route:** Panel overlay within `/crm/consultant/[id]`
**Entry context:** Consultant clicks "Review" on a Pending document in C2's
documents section. This is not a separate page — it is a panel that opens
within C2.

**Panel flow:**
1. Shows: document name, type, "Preview document" link (opens signed URL)
2. Two buttons: **[ Approve ]** (Fern) | **[ Reject ]**

**If Approve:** document status updates to Verified (Fern chip) → panel closes
→ back in C2

**If Reject:**
1. Buttons replaced with rejection reason textarea
2. Note: "This reason will appear on the student's document screen"
3. Character minimum: 5 chars
4. **[ Confirm rejection ]** (Brick) | Cancel link
5. On confirm: document shows Brick "Rejected" status in C2
6. Student's B2 screen updates with rejection reason
7. Student receives WhatsApp/email notification with the reason

**Transitions out:**
→ After Approve or Confirm rejection → back in **C2** (panel closes)
→ Cancel → back in **C2** (panel closes)

---

### Step 4 → C3 — Follow-Up Queue
**Route:** `/crm/consultant/stalled`
**Entry context:** Consultant navigates here when they want to see all
engagements that have breached their SLA threshold — their urgent action list.

**What the consultant sees:**
- Sorted table: most hours inactive at the top
- Columns: Student name | Stage | Hours inactive | Last contact | Action
- Each row: one **[ Log contact ]** button — two clicks to clear a stall

**Zero state:** "No stalled engagements. All cases are within their SLA."
(Fern green — this is good news, not an empty screen.)

**Transitions out:**
→ Click a student name or "Log contact" → **C2** for that engagement
→ Left nav → **C1**

---

### Step 4b → F1 — Leads Table View *(alternate to C1)*
**Route:** `/crm/consultant?view=table`
**Entry context:** Consultant clicks the view toggle on C1 to switch from
Kanban to table. Same data, denser format — preferred by consultants who
manage large portfolios and want to sort or filter quickly.

**What the consultant sees:**
- Dense sortable table: name, course, stage, days in stage, last activity,
  stall flag, actions
- Search + filter chips above: All | Stalled only | per-stage chips
- Brick dot in stall column — same visual language as C1, not a new pattern
- "38 leads" count label

**Key permission invariant:** the table shows only leads assigned to this
consultant — RLS scopes the query. A consultant cannot see other consultants'
leads by switching to table view.

**Transitions out:**
→ Click student name → **C2**
→ View toggle → back to **C1 (Kanban)**

---

### Step 5 → F4 — Notification Centre
**Route:** `/crm/consultant/notifications`
**Entry context:** Consultant clicks the bell icon in C1's left sidebar.
Unread count badge drove them here.

**What the consultant sees:**
- Grouped timeline: Today / Yesterday / Earlier
- New lead assigned, stall breach, stall resolved, reassigned away, admin messages
- Unread: subtle Lichen left border
- Each actionable notification has one button (View lead → or Log contact →)

**Permission invariant:** notifications are scoped to this consultant's leads
only. A consultant cannot see notifications for another consultant's portfolio.

**Nudge from Admin (visible here):**
When a super-admin clicks "Nudge consultant" in D1, a Marigold admin message
notification appears here: "Admin: [Name] has been inactive in [Stage] for
[N]h — please follow up." This is the downstream effect of the nudge action
in D1. Without F4, the nudge has no visible destination.

**Transitions out:**
→ "View lead →" → **C2** for that engagement
→ "Log contact →" → **C2** Log Contact panel for that engagement
→ Back nav → **C1**

---

## Journey 3 — The Super-Admin

A super-admin is the agency director or operations lead. They do not manage
individual students day-to-day — they oversee the entire agency pipeline,
manage consultant capacity, and intervene when the system flags problems.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SUPER-ADMIN JOURNEY — Complete Flow                                         │
│                                                                             │
│   A1      →    D1       →      D2        →     D4                           │
│  Login       Agency          Consultant      Consultant                     │
│  (role:     Dashboard        & Engagement    Portfolio                      │
│  super_     (overview)       Management      Detail                         │
│  admin)          │                                                          │
│                  │                                                          │
│                  └──→  C2 (as super-admin)  →  D3 (stage regression panel) │
│                        Case View with                                       │
│                        backward-move control                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Step 1 → A1 — Login
**Route:** `/auth/login`
**Entry context:** Super-admin logs in. Role detected as `super_admin`.

**Transition:**
→ Auto-redirect → **D1 (Admin Dashboard)**

---

### Step 2 → D1 — Admin Dashboard *(command centre)*
**Route:** `/admin`
**Entry context:** Super-admin's home screen. Everything starts here. They
assess agency health before deciding where to act.

**What the super-admin sees:**

**Opening line:** Agency health summary + timestamp
"38 active engagements · 5 stalled · 2 unassigned · Last evaluated 60s ago"

**Funnel:** Horizontal bar across 6 stages with student counts. Quiet muted
bars, one Apex green highlight on the busiest stage.

**Consultant capacity strip:**
Compact table — each consultant with Active | Stalled | Capacity ("28 / 30") |
Status. Clicking a row → **D4 (Consultant Portfolio Detail)**

**Attention list (two distinct sections):**

*Section A — Escalated stalls:*
Leads where the consultant has not acted for 4+ hours after first stall flag
(2h for Fee/Verification). Shows: student name, consultant name, stage, hours
since first stall. Action: **Nudge consultant** (sends internal notification)

*Section B — Unassigned:*
Leads where auto-assignment failed (no consultant had capacity). Shows: student
name, target country, reference number. Action: **Assign manually** → opens
consultant picker

**Nudge consultant action:**
Clicking "Nudge consultant" in Section A (escalated stalls) sends an in-app
notification to that consultant. It appears in their **F4 (Notification Centre)**
as a Marigold admin message: "Admin: [Student name] has been inactive in
[Stage] for [N]h — please follow up." The nudge does not change any data —
it is a push notification only. The D1 row remains until the consultant logs
contact and the stall clears.

**Transitions out:**
→ Click consultant row in capacity strip → **D4**
→ Click student in attention list → **C2** (as super-admin)
→ "Consultants" nav item → **D2**
→ "Settings" nav item → **F2 (Pipeline Settings)** or **F3 (Templates)**

---

### Step 3 → D2 — Consultant & Engagement Management
**Route:** `/admin/consultants`
**Entry context:** Super-admin navigates here to manage consultant capacity,
deactivate a leaving consultant, or manually reassign engagements.

**Panel 1 — Consultants table:**
- Name | Active | Capacity (editable inline: click to edit "28 / 30") |
  Stalled | Status toggle (Accepting / Paused) | Deactivate
- Paused consultants show Marigold "Not accepting new leads" pill
- **Deactivate** → confirmation modal: "[Name] has 12 active engagements.
  Deactivating will flag all 12 for reassignment. Cannot be undone."
  **[ Deactivate and flag leads ]** → triggers `tr_consultant_deactivation`
  → students receive WhatsApp notifications (Decision 2)
  → super-admins receive in-app notifications
  → D1 attention list populates with newly unassigned leads

**Panel 2 — Agency-wide engagements table:**
- Searchable by student name, stage, consultant
- Columns: Student name | Stage | Consultant | Target country | Days in stage |
  Stall status | Reassign
- **Reassign** → dropdown showing consultant load:
  "Priya Nair — 22/30 · Accepting" vs "Ben Okafor — 30/30 · Full"
  Paused consultants show warning before confirming
  → one-click confirm: "Reassign to [Name]?"

**Transitions out:**
→ Click consultant name → **D4**
→ Click student name in Panel 2 → **C2** (as super-admin)
→ "Dashboard" nav → **D1**

---

### Step 4 → D4 — Consultant Portfolio Detail
**Route:** `/admin/consultants/[consultant-id]`
**Entry context:** Super-admin drills into a specific consultant from the D1
capacity strip or D2 consultant table.

**What the super-admin sees:**

**Header:** Consultant name, role, join date, status (Accepting / Paused),
capacity ("28 / 30 active"), Deactivate button

**Performance summary strip (from `mv_counselor_performance`):**
Conversion rate | Avg lead age (days) | Total admitted (30 days) | Currently stalled

**Portfolio table:**
All engagements assigned to this consultant. Filterable by stage and stall status.
- Columns: Student name | Stage | Days in stage | Stall status | Target country | Actions
- Clicking a row → **C2** for that engagement (as super-admin view)

**Bulk reassignment:**
Select multiple rows → **[ Reassign selected ]** button appears above table
(useful for handover when a consultant goes on leave)

**Transitions out:**
→ Click engagement row → **C2** (as super-admin)
→ Deactivate button → confirmation modal (same as D2) → back to **D2**
→ Back nav → **D1** or **D2**

---

### Step 5 → C2 (as super-admin) + D3 — Case View with Stage Regression
**Route:** `/crm/consultant/[engagement-id]` (same URL, different role context)
**Entry context:** Super-admin navigates to a specific engagement from D1, D2,
or D4. The layout is identical to the consultant's C2 view with one key
difference in the pipeline section.

**What changes in super-admin mode:**

The pipeline section (Section 2) shows TWO controls instead of one:

**Primary action (prominent, Apex green):**
[ Advance to Fee/Verification → ]

**Secondary action (muted, less prominent, below with visual separation):**
[ ← Move back to Application ]

Clicking **Move back** opens an inline reason panel (D3) within the same screen.

---

### Step 5a → D3 — Stage Regression Panel *(inline inside C2)*
**Route:** Panel within `/crm/consultant/[id]` (super-admin only)
**Entry context:** Super-admin clicks "Move back to [previous stage]" in C2.

**Panel flow:**
1. Inline textarea appears: "Reason for moving back to Application:"
   Character minimum: 10. This reason is written to `activity_logs`.
2. **[ Confirm regression ]** (muted, not Brick — this is a correction,
   not a dangerous action) | Cancel link
3. On confirm: stage reverts, reason logged, both parties' views update

**Why the reason is mandatory:** Stage regression is an infrequent administrative
correction (university rejection, document resubmission required). The reason
creates an auditable record that explains the anomaly in the audit trail.

**Transitions out:**
→ Confirm or Cancel → back in **C2** (panel closes)

---

### Step 6 → F2 — Pipeline Stage Settings
**Route:** `/admin/settings/pipeline`
**Entry context:** Super-admin navigates here from Admin nav → Settings →
Pipeline. Typically visited to adjust SLA thresholds or respond to a business
change (e.g. agency reduces Counseling SLA from 48h to 24h during peak season).

**What the super-admin can do:**
- Edit stage names inline (e.g. "Counseling" → "Consultation")
- Edit stall threshold in hours per stage
- Edit escalation threshold in hours per stage
- Cannot reorder stages — FSM sequence is locked, padlock icon explains this

**Critical propagation invariant — stage rename:**
When a stage name is changed here, it must update consistently across:
- C1 column headers
- F1 table stage column
- C2 pipeline section label
- B1 student stage tracker (mobile step indicator + desktop stepper)
- B3 automated event entries ("Your application advanced to Consultation")
- D1 funnel visualization stage labels
- C3 and F4 stage references

The rename does NOT retroactively change historical activity_logs entries —
those are append-only and store the stage name at time of event. Only the
live display label changes. This is a system behaviour, not a UX concern,
but the frontend must fetch stage names dynamically from
`stage_threshold_configs` rather than hardcoding them.

**Threshold change propagation:**
A threshold change takes effect on the next pg_cron cycle (within 60 seconds).
If a threshold is lowered (e.g. Counseling from 48h to 24h), leads currently
in Counseling that have been inactive for 25–48h will be immediately flagged
on the next cycle. The super-admin should expect a burst of stall alerts after
a threshold reduction.

**Transitions out:**
→ Back / nav → **D1**
→ "Templates" nav → **F3**

---

### Step 7 → F3 — Communication Templates
**Route:** `/admin/settings/templates`
**Entry context:** Super-admin navigates here to edit automated messages
or to submit a WhatsApp template for Meta approval.

**What the super-admin sees:**
- List of templates: Welcome Email, Welcome WhatsApp, Stage Advance WhatsApp,
  Document Rejected WhatsApp, Consultant Reassigned WhatsApp
- Each with channel chip, Active/Draft status, Meta approval status for WhatsApp
- Edit view: plain text editor, variable chips, live preview pane

**WhatsApp approval flow:**
Templates used for outbound first-contact messages must be Meta-approved.
The F3 screen shows approval status per template. If "Not submitted," a
"Submit for approval" link is visible. If "Pending," a countdown or date
estimate is shown. If "Rejected by Meta," the reason (from Meta's API) is shown.
Without at least the Welcome WhatsApp and Consultant Reassigned WhatsApp
templates approved, Moments 2 and Decision 2 (student reassignment notification)
are broken in production.

**Transitions out:**
→ Back / nav → **D1**
→ "Pipeline" nav → **F2**

---

## Journey 4 — The Demo (Operator-Only)

The demo is not a user journey — it is a sales tool operated by the agency
presenting the platform to a prospective client. It is self-contained.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DEMO SEQUENCE — E1 (/demo/split)                                           │
│                                                                             │
│  MOMENT 3 (open screen)    MOMENT 1 (submit)    MOMENT 2 (auto-response)   │
│  Pre-seeded funnel    →    Form submit     →    Email + WhatsApp            │
│  shows pipeline shape      card appears          delivery ticks             │
│       ↓                     < 100ms               2–4 seconds              │
│  MOMENT 4 (stall demo)                                                      │
│  Age Lead → Run Cron → Brick dot → Log Contact → dot clears                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

The E1 screen is self-contained. No navigation into other screens during a demo.
See README §10 for the complete presentation script and pre-flight checklist.

---

## Cross-Journey State Connections

These are the moments where one user's action in their journey directly changes
what another user sees — without either party doing anything to trigger the update.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  WHO ACTS          → WHAT CHANGES FOR WHOM                                        │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Student submits     Consultant's C1 Kanban: new card slides in (<100ms)          │
│  inquiry (A2)        Consultant's C1: audio chime plays                           │
│                      Student's B1: moves from "matching" state to active state    │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Consultant advances Student's B1: stage tracker updates (Realtime)              │
│  stage (C2)          Student's B3: new system event entry appears                │
│                      Student receives WhatsApp/email notification (§17.5)        │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Consultant logs     Consultant's C1: Brick dot clears on that card              │
│  contact (C2)        Consultant's C3: lead removed from stalled queue            │
│                      Student's B3: contact log entry appears (if summary given)   │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Consultant approves Student's B2: document status changes to Verified (Fern)    │
│  a document (D5)     Student's B3: "Your [document] was verified" event entry    │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Consultant rejects  Student's B2: Brick "Rejected — [reason]" appears           │
│  a document (D5)     Student receives WhatsApp notification with rejection reason │
│                      Student's B3: "Your [document] needs re-upload" event entry  │
├──────────────────────────────────────────────────────────────────────────────────┤
│  pg_cron detects     Consultant's C1: Brick pulsing dot appears on card          │
│  stall breach        Consultant's C3: lead appears in stalled queue              │
│                      Admin's D1: lead appears in escalation list after +4h       │
│                      (No change to student's B1 — stall is hidden from students) │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Admin reassigns     Old consultant's C1: card fades out                         │
│  a lead (D2)         New consultant's C1: card slides in                         │
│                      Student's B1: consultant name updates (Realtime)            │
│                      Student's B3: "Your case has been transferred" event entry  │
│                      Student receives WhatsApp notification (Decision 2)         │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Admin deactivates   All affected students: WhatsApp notification sent           │
│  a consultant (D2)   D1 attention list: all affected leads appear as Unassigned  │
│                      All super-admins: in-app notification ("12 leads need       │
│                      reassignment after [consultant name] was deactivated")       │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Stitch Prompt — Arrange Screens Into Flow

Paste the following into Stitch after your screens are generated to arrange
them into a connected flow presentation:

```
Using the screens already generated for Apex, arrange them
into three separate connected user flow diagrams — one per role. Use the
screens exactly as generated; add directional arrows and transition labels
between them.

STUDENT FLOW (arrange left to right, mobile frames):
A2 → A1 → B1 → (branch) → B2
                      └──→ B3

Transition labels:
A2 → A1: "Magic link in welcome email"
A1 → B1: "Auth successful — role: student"
B1 → B2: "Documents navigation / 'X docs need attention' CTA"
B1 → B3: "Contact history link"
B2 → B1: "Back"
B3 → B1: "Back"

CONSULTANT FLOW (arrange left to right, desktop frames):
A1 → C1 → C2 → (D5 panel overlay within C2)
          └──→ C3 → C2

Transition labels:
A1 → C1: "Auth successful — role: consultant"
C1 → C2: "Click any Kanban card"
C2 → D5: "Click 'Review' on Pending document (panel within C2)"
D5 → C2: "Approve or Reject confirmed (panel closes)"
C1 → C3: "Left nav: Stalled"
C3 → C2: "Click student name or Log contact"

SUPER-ADMIN FLOW (arrange left to right, desktop frames):
A1 → D1 → D2 → D4 → C2 (super-admin) → D3 (panel overlay)

Transition labels:
A1 → D1: "Auth successful — role: super_admin"
D1 → D4: "Click consultant row in capacity strip"
D1 → D2: "Nav: Consultants"
D1 → C2: "Click student in attention list"
D2 → D4: "Click consultant name"
D2 → C2: "Click student name in engagements table"
D4 → C2: "Click engagement row"
C2 → D3: "Click 'Move back to [stage]' (super-admin only)"
D3 → C2: "Confirm regression or Cancel (panel closes)"

CROSS-ROLE CONNECTION NOTE:
Add a subtle horizontal connector between flows to show:
- Student submits A2 → card arrives on Consultant's C1 (WebSocket, <100ms)
- Consultant advances stage in C2 → Student's B1 and B3 update (Realtime)
- pg_cron stall detection → Consultant's C1 card + Admin's D1 list (automated)
Label this connector: "Live Realtime — no page refresh required"
```

---

## Section 6 — Pre-Code UX Logic Check

Walk each case below against the Stitch screens before writing backend code.
Mark PASS or FAIL. A failure here is a design gap — fix the screen, not the code.

Sections C and E failures are launch blockers. Sections A, B, D, G are your best
proxy for whether the demo (README §10) holds up in front of a corporate lead.

---

### A — Student Flow

| # | Case | Screen(s) | What to check | Pass? |
|---|------|-----------|---------------|-------|
| A1 | Submit inquiry with valid data | A2 | Success state shows reference number + "what's next" 3-step summary | ☐ |
| A2 | Submit with invalid email / empty required field | A2 | Inline error on the specific field, form does not navigate away | ☐ |
| A3 | Check status using reference number immediately after submit | B0 (if built) or B1 | Stage shows "Inquiry," timeline shows only the submission event | ☐ |
| A4 | Check status after consultant moves the stage | B1 / B3 | Stage tracker reflects new stage without student action | ☐ |
| A5 | Confirm status screen shows no internal data | B3 | No consultant internal notes, no stall data, no other student data | ☐ |

**Gap note A3:** If the public status lookup screen (B0) is not built, a student
who loses their magic link email cannot check status without contacting the agency.
Decision required: build B0 or accept that students must call in.

---

### B — Consultant Core Actions

| # | Case | Screen(s) | What to check | Pass? |
|---|------|-----------|---------------|-------|
| B6 | Login as Consultant A | A1 → C1 | Dashboard shows only A's leads — not org-wide list | ☐ |
| B7 | Move a lead to next stage | C2 → C1, F1, B1, B3 | Change reflects on Kanban, table, student dashboard, student timeline | ☐ |
| B8 | Log contact on a stalled lead | C2 | Timeline updates, Brick dot clears on C1 card and C3 queue | ☐ |
| B9 | Open same lead from Kanban and from table | C1 → C2 and F1 → C2 | Both entry points reach identical C2 state | ☐ |

---

### C — Consultant Permission Boundaries *(launch blocker if fail)*

| # | Case | Screen(s) | What to check | Pass? |
|---|------|-----------|---------------|-------|
| C10 | Consultant A guesses Consultant B's lead URL | C2 | Returns 403 / not found — not B's lead data. RLS enforces this, not just UI hiding | ☐ |
| C11 | Log out as A, log in as B | C1 | B sees completely different, non-overlapping lead set | ☐ |

**Note:** C10 is a backend RLS test, not a UI test. But if the frontend shows
a broken layout rather than a clean "not found" state when the RLS returns
empty, that is a UX gap. C2 needs a "lead not found" state designed.

---

### D — Admin Flow

| # | Case | Screen(s) | What to check | Pass? |
|---|------|-----------|---------------|-------|
| D12 | Login as Admin | A1 → D1 | Dashboard shows all consultants' data, not scoped to one | ☐ |
| D13 | Reassign lead A→B, verify both views | D2 → C1 (A) → C1 (B) | Lead gone from A's Kanban, appears on B's Kanban | ☐ |
| D14 | Rename a stage in F2, verify propagation | F2 → C1, F1, B1, B3, D1 | New label appears in ALL locations — not just F2 | ☐ |
| D15 | Lower stall threshold, verify flag appears | F2 → C1, D1 | Stall indicator appears for correct consultant + admin view, no refresh needed | ☐ |

**Gap note D14:** Stage name is currently hardcoded in several components
(PipelineKanban.tsx STAGES array, stateDiagram in README §3). If stage names
are to be admin-configurable, they must be fetched dynamically from
`stage_threshold_configs`. This is a frontend architecture decision, not just
a settings screen decision.

---

### E — Cross-Role Access Control *(launch blocker if fail)*

| # | Case | Screen(s) | What to check | Pass? |
|---|------|-----------|---------------|-------|
| E16 | Consultant navigates to `/admin` directly | Middleware | Redirected to `/crm/consultant`, not shown admin content | ☐ |
| E17 | Unauthenticated user navigates to `/crm/consultant` | Middleware | Redirected to `/auth/login`, not a broken/empty dashboard | ☐ |

**Note:** E16 and E17 are enforced by `src/middleware.ts` (README §9.1). The
UX check here is that the redirect destination is correct and the redirect
itself does not flash the protected content before redirecting. If the page
renders for even 200ms before middleware redirects, that is a security and
UX failure.

---

### F — Empty and Error States

| # | Case | Screen(s) | What to check | Pass? |
|---|------|-----------|---------------|-------|
| F18 | Consultant dashboard with zero leads | C1 | Real empty state — not blank columns, not a broken layout | ☐ |
| F19 | Auto-response email/WhatsApp delivery fails | C2 | Failure visible in auto-response delivery log (Brick status) — not silently swallowed | ☐ |
| F20 | Admin analytics before any leads exist | D1 | Funnel shows a sensible zero state — not a broken chart | ☐ |

---

### G — Responsive Pass *(repeat key cases on mobile viewport)*

| # | Case | Screen(s) | What to check | Pass? |
|---|------|-----------|---------------|-------|
| G21 | Consultant pipeline on mobile | C1 (mobile) | Stage chip/tab + filtered list — NOT a horizontal Kanban | ☐ |
| G22 | Lead detail on mobile | C2 (mobile) | Full-screen view with "← Back" — NOT an off-screen drawer | ☐ |
| G23 | Admin reassignment on mobile | D2 (mobile) | Reassign action reachable by touch — no hover-only controls | ☐ |
| G24 | Stage rename on mobile | F2 (mobile) | Inline edit fields work on touch, save state visible | ☐ |
| G25 | Student document upload on mobile | B2 (mobile) | File picker opens, three-state (uploading/confirming/confirmed) renders correctly | ☐ |

---

### Additional gaps surfaced by this check (not in original test script)

| # | Gap | Affected screens | Action |
|---|-----|-----------------|--------|
| X1 | C2 has no "lead not found" state | C2 | Design a 404/empty state for when RLS returns no data for a guessed URL |
| X2 | Stage names may be hardcoded in frontend | C1, F1, B1, B3 | Fetch stage names dynamically from stage_threshold_configs |
| X3 | Public status lookup (B0) not in spec | A2 success state | Decide: build B0 or accept agency-calls-only for statusless students |
| X4 | Nudge consultant has no visible destination | D1 → F4 | F4 must exist and show admin nudge notifications — without it the nudge silently disappears |
| X5 | F1 permission scope not stated | F1 | Table view must be RLS-scoped same as C1 — not an "all leads" view |
| X6 | D14 stage rename requires dynamic labels | F2 → all screens | Frontend must not hardcode stage names — fetch from DB |

---

## Screen Index


| ID | Screen name | Route | Role | Theme | Priority |
|---|---|---|---|---|---|
| A1 | Login | `/auth/login` | All roles | Light | Tier 1 |
| A2 | Student Inquiry Form | `/portal/student/apply` | Student (public) | Light | Tier 1 |
| B0 | Status Lookup (unauthenticated) | `/portal/check` | Student (public) | Light | Tier 2 |
| B1 | Student Dashboard | `/portal/student` | Student | Light | Tier 1 |
| B2 | Documents | `/portal/student/documents` | Student | Light | Tier 2 |
| B3 | Activity Timeline | `/portal/student/activity` | Student | Light | Tier 2 |
| C1 | Consultant Kanban Dashboard | `/crm/consultant` | Consultant | Dark | Tier 1 |
| C2 | Engagement Case View | `/crm/consultant/[id]` | Consultant + Super-Admin | Dark | Tier 1 |
| C3 | Follow-Up Queue | `/crm/consultant/stalled` | Consultant | Dark | Tier 2 |
| D1 | Admin Dashboard | `/admin` | Super-Admin | Dark | Tier 1 |
| D2 | Consultant & Engagement Management | `/admin/consultants` | Super-Admin | Dark | Tier 2 |
| D3 | Stage Regression Panel | Inside C2 (super-admin) | Super-Admin | Dark | Tier 3 |
| D4 | Consultant Portfolio Detail | `/admin/consultants/[id]` | Super-Admin | Dark | Tier 2 |
| D5 | Document Rejection Input | Panel inside C2 | Consultant | Dark | Tier 3 |
| E1 | Live Sales Demo | `/demo/split` | Operator only | Mixed | Tier 1 |
| F1 | Leads Table View | `/crm/consultant?view=table` | Consultant | Dark | Tier 2 |
| F2 | Pipeline Stage Settings | `/admin/settings/pipeline` | Super-Admin | Dark | Tier 3 |
| F3 | Communication Templates | `/admin/settings/templates` | Super-Admin | Dark | Tier 3 |
| F4 | Notification Centre | `/crm/consultant/notifications` | Consultant | Dark | Tier 2 |
