# STITCH_UI_UX_PROMPT.md — Apex
## Student Pipeline Platform — Complete Screen Generation Guide

**How to use:** Paste the MASTER PROMPT into Stitch once as context. Then
paste each screen prompt individually. Review and steer one screen at a time.
Never paste all screen prompts together — Stitch produces better results per
screen when the master context is already set.

**What this file is:** A complete, paste-ready UI generation brief reflecting:
- The full system architecture (README.md)
- All 12 use-case test scenarios (TEST_PLAN.md)
- All gaps identified through walkthrough analysis
- Dribbble reference directions per screen type

---

## Brand Foundation

| Role | Token name | Value | Use |
|---|---|---|---|
| Primary action | Apex green | `#147A63` | CTAs, active stage, progress markers, links |
| Primary hover | Deep apex | `#0D604C` | Button hover / pressed state |
| Dark accent | Eucalyptus | `#65D9B8` | Active selection, focused control, single chart highlight — never a full wash |
| Light canvas | Paper | `#F8F6F1` | Student portal and login background |
| Light surface | Ivory | `#FFFEFB` | Cards, forms, sheets |
| Light heading | Deep pine | `#17342D` | Headings and high-emphasis copy |
| Light muted | Moss gray | `#66756F` | Secondary labels, metadata |
| Light border | Reed | `#DDE5DE` | Dividers, quiet input borders |
| Dark canvas | Night pine | `#0D1512` | CRM and Admin application background |
| Dark panel | Spruce | `#17231E` | Sidebar, columns, table rows |
| Dark hover | Lichen | `#21322B` | Hovered or selected rows |
| Dark text | Bone | `#F0F3EC` | Primary text on dark surfaces |
| Dark muted | Sage gray | `#9AACA3` | Secondary text on dark surfaces |
| Warning | Marigold | `#D69A45` | Due-soon, pending, non-critical attention |
| Danger | Brick | `#D9564D` | Stall dot, error, destructive action — nothing else |
| Success | Fern | `#3C9B68` | Verified document, enrolled, completed outcome |

**Color discipline:** Green = forward motion and primary actions. Eucalyptus = dark-mode active signal only. Marigold = needs attention. Brick = genuine risk or error. Fern = good outcome. Never use any semantic color as a decorative fill or a primary button shade.

**Typography:** Pair one humanist serif (Instrument Serif or Lora) for display moments — screen titles, large numbers, the student welcome — with a neutral UI sans (Inter or Manrope) for everything functional. Sentence case throughout. No all-caps labels.

**Layout principles:** Composed, not modular-by-default. Let a generous page title, an operational timestamp, and one decisive primary action establish the hierarchy before cards appear. Prefer thin rules and purposeful whitespace over floating equal cards. Radii 10–14px. Avoid identical card grids, ornamental charts, and glassmorphism. Every screen must use real names (Fatima Al-Rasheed, Kwame Asante-Mensah), real universities (UCL, University of Toronto, TU Munich), and real course names (MSc Data Science, MBA, BEng Software Engineering).

**Accessibility baseline:** 44px minimum tap targets on mobile. Visible keyboard focus ring. WCAG AA contrast on all text and icons. Labels beside unfamiliar icons. Tooltips on icon-only buttons.

---

## Dribbble Reference Directions

Study the behavior and hierarchy in these references. Do not copy their compositions — build something that reads as an education advisory practice, not a re-skinned sales CRM.

| Screen type | Reference | What to borrow |
|---|---|---|
| Login | [Login UI Dashboard collection — Dribbble](https://dribbble.com/search/login-ui-dashboard) | Economy of the form, trustworthy entry-point feel, editorial split or quiet full-height layout |
| Student dashboard | [Student Dashboard — Dribbble](https://dribbble.com/tags/student_dashboard) | Mobile readability, progress clarity, case-journey framing — not course-consumption UI |
| Dark admin / ops | [Dark Theme Admin Dashboard — Dribbble](https://dribbble.com/search/dark-theme-admin-dashboard) | Dense table hierarchy, restrained contrast, one attention color — not neon charts |
| CRM Kanban | [CRM Pipeline Dashboard — Dribbble](https://dribbble.com/shots/27438010-CRM-Pipeline-Dashboard-UI-AI-Deal-Scoring-Dark-Light-Mode) | Scannable working board, single attention signal per card — discard its color language and AI framing |
| Document management | [Document Management UI — Dribbble](https://dribbble.com/search/document-management-ui) | Status-first list view, version-aware design, clear action placement |
| Mobile form | [Mobile Onboarding Form — Dribbble](https://dribbble.com/search/mobile-onboarding-form) | Single-page flow, progress reassurance, frictionless submit |
| Data table / CRM list | [CRM Table UI — Dribbble](https://dribbble.com/search/crm-table-ui) | Dense sortable columns, inline actions, filter controls — not cards |
| Settings screen | [Settings UI — Dribbble](https://dribbble.com/search/settings-ui-dashboard) | Labeled rows, inline editing, no decoration — utility first |
| Template editor | [Email Template Editor — Dribbble](https://dribbble.com/search/email-template-editor) | Split edit/preview pane, plain-text focused, not a page builder |
| Mobile CRM | [Mobile CRM — Dribbble](https://dribbble.com/search/mobile-crm-app) | Stacked list replacing Kanban, stage chip-tabs, thumb-reachable actions |
| Notification centre | [Notification Center UI — Dribbble](https://dribbble.com/search/notification-center-ui) | Grouped by recency, one action per item, unread count management |

---

## 1. MASTER PROMPT

```
Design a B2B2C SaaS platform called "Apex — Student Pipeline"
for an educational placement agency that helps students secure university
admissions abroad (UK, Canada, Germany, Australia, USA). Modeled on agencies
like Chuolink, IDP, and ApplyBoard.

PRODUCT CONTEXT
Real software for a paying agency client — not a portfolio piece.
The agency is established, international, and quietly ambitious: trustworthy
enough for an anxious parent reviewing a child's application, operationally
sharp enough for a director overseeing 1,000 active cases. This tension — warm
and human for students, precise and dense for staff — must drive every screen.

Two visual registers, deliberately different:
- Student-facing (/portal/student): light, warm Paper/Ivory theme. Humanistic,
  reassuring. A stressed, hopeful applicant is the user — not a tech-savvy
  professional. Every screen should feel like a calm personal case file.
- Consultant (/crm/consultant) and Admin (/admin): dark Night pine / Spruce
  operational console. Dense, precise, built for all-day use. Think an editorial
  operations tool — not a marketing site. Eucalyptus is a sparse signal color
  for active/selected states only; not decoration.

BRAND AND VISUAL SYSTEM
- Primary action: Apex green #147A63, hover #0D604C. Never use green as fill
  on a dark surface; use Eucalyptus #65D9B8 only for active/selected indicators.
- Student canvas: Paper #F8F6F1. Cards: Ivory #FFFEFB. Headings: Deep pine #17342D.
- CRM/Admin canvas: Night pine #0D1512. Panels: Spruce #17231E. Text: Bone #F0F3EC.
- Semantic colors are strictly functional: Marigold #D69A45 (needs attention /
  pending), Brick #D9564D (stall breach / error / destructive only), Fern #3C9B68
  (verified / completed). Never decorative.
- Typography: Instrument Serif or Lora for display moments (screen titles, key
  numbers, the student welcome). Inter or Manrope for all functional UI. Sentence
  case. No all-caps labels.
- Layout: composed, not card-grid-by-default. Let a title, timestamp, and one
  primary action establish hierarchy. Thin rules, 10–14px radii, purposeful
  whitespace. No glassmorphism, gradients, ornamental charts, or pill buttons
  everywhere.
- Real data in every mock: real student names (Fatima Al-Rasheed, Kwame
  Asante-Mensah, Priya Sundaram), real universities (UCL, University of Toronto,
  TU Munich, University of Melbourne), real programs (MSc Data Science, MBA,
  BEng Software Engineering, LLM International Law). Never lorem ipsum.
- Accessibility: 44px minimum targets on mobile. Visible focus rings. WCAG AA
  contrast. Labels beside unfamiliar icons.

MOBILE NAVIGATION PATTERNS
- Student portal (/portal/student): use a bottom navigation bar (4 items max:
  Dashboard, Documents, Activity, Account). Fixed to viewport bottom. No
  hamburger menu — students are on mobile and need one-thumb navigation.
- Consultant CRM (/crm/consultant): left sidebar collapses to icon-only at
  tablet width (768–1024px), fully off-canvas on mobile with a hamburger toggle.
  The Kanban board is replaced with a stage chip/tab row + filtered list on
  mobile (see C1 mobile spec). Never attempt horizontal Kanban on small screens.
- Admin (/admin): same sidebar collapse as Consultant. Admin screens are
  desktop-primary — a "view on desktop for full experience" nudge is acceptable
  on mobile, but core data must still be readable.

EMPTY AND LOADING STATES
Every screen must handle three states explicitly:
1. Empty state (no data yet — new account, fresh install): show a brief
   explanatory message and a primary action. Never show a blank table or an
   empty Kanban with no guidance.
2. Loading state: use a skeleton layout matching the screen's structure — not
   a spinner floating in white space.
3. Error state: a plain inline message with a retry action — not a modal.

THREE ROLES, THREE ROUTES
/auth/login routes by role after sign-in:
- Student → /portal/student (mobile-first, light theme)
- Consultant → /crm/consultant (desktop-first, dark theme)
- Super-Admin → /admin (desktop-first, dark theme)

ENGAGEMENT vs APPLICATION — THE KEY STRUCTURAL RULE
One student inquiry creates ONE "engagement" (one Kanban card). That engagement
tracks WHERE THE CONSULTING PROCESS IS via 6 pipeline stages:
Inquiry → Counseling → Document Collection → Application → Fee/Verification → Admitted

The same engagement can have MULTIPLE per-university applications nested inside it:
UCL (Conditional Offer), Manchester (Applied), Edinburgh (Shortlisted).
Each application has its own status: Shortlisted → Applied → Conditional Offer
→ Unconditional Offer → Rejected/Withdrawn → Enrolled.

These are TWO separate data layers. NEVER merge them into one status. The pipeline
stage tracks the consulting workflow; the application list tracks university outcomes.

STAGE TRANSITION RULES — enforced by the database
Consultants: can only advance one stage forward at a time. The UI shows ONE
"Advance to [next stage] →" button — no dropdown, no stage picker, no skip.
The database rejects any attempt to jump stages. Super-admins only: can move
a stage backward (for rejection/resubmission), with a required reason that gets
logged. Make the backward-move control visually distinct and less prominent than
the forward advance.

STALL DETECTION VISUAL LANGUAGE
Each stage has an SLA threshold (Inquiry 24h, Counseling 48h, Document Collection
72h, Application 48h, Fee/Verification 24h). A breached engagement shows:
ONE small pulsing Brick red dot (#D9564D) + "Nh inactive" label on the Kanban card.
Nothing else pulses, glows, or animates on a loop in this interface. The pulsing
dot is reserved exclusively for live stall breaches — its rarity is what makes it
effective. An optional audio chime (off by default in production, on by default
in the /demo/split route) accompanies a new breach.

DOCUMENTS — VERSIONING AWARE
Students re-upload documents when a version is rejected. Only the CURRENT version
matters in the primary view. Previous versions are accessible via a "view prior
version" link — not listed inline. Upload has three visual states: uploading →
confirming (server-side validation in progress) → confirmed/rejected. Never show
"uploaded" before server confirmation because the backend can delete a file that
fails MIME/size checks.

REALTIME BEHAVIOR
The consultant's Kanban board receives live updates via WebSocket. New cards arrive,
stall flags change, and reassigned cards disappear — all without a page reload.
Design states must account for:
- A card arriving mid-session (INSERT event — plays audio chime if enabled)
- A card leaving mid-session (reassigned away from this consultant — it disappears)
- A stall badge appearing on an existing card (UPDATE event)
- A stall badge clearing after contact is logged (UPDATE event)

Now generate the following screens, one frame each.
```

---

## 2. Screen Prompts

---

### A. Shared / Auth

---

**A1 — Login (`/auth/login`)**

```
Design the Apex login screen. One role-agnostic screen — the
system routes by role after authentication, not before. Fields: email address,
password, "Forgot password" link.

Visual direction: use the Paper canvas. Either a quiet full-height centered form
or an editorial split composition with the Apex wordmark and a brief
one-line positioning statement on one side, and the form on the other. No stock
photography, no imagery, no illustration. The wordmark is the only brand element.
Calm and minimal — this is a utility screen.

Reference: Login UI Dashboard collection on Dribbble — borrow its economy and
trustworthiness, not its decorative flourishes.

State to show: default empty form. Also design the error state (wrong credentials
— show an inline error message that does not specify whether the email or the
password was wrong, for security).
```

---

**A2 — Student Inquiry Form (`/portal/student/apply`)**

```
Design the Apex student inquiry form. This is a PUBLIC-FACING page —
no login required. A prospective student fills this out to start their journey.

CRITICAL: Design this as a SINGLE-PAGE form (not a multi-step wizard). All fields
visible on one scroll. This eliminates the draft-save complexity of a wizard and
lets the browser preserve field values if the student closes and returns.

Fields:
- Full name
- Email address
- Phone number (with country code selector)
- Target destination countries (multi-select: UK, Canada, USA, Germany, Australia,
  Ireland, Netherlands — allow up to 3)
- Program interest (free text + optional category: MSc / MBA / BSc / PhD / Diploma)
- Preferred intake (Fall 2026 / Spring 2027 / Fall 2027 — radio buttons)
- How did you hear about us? (optional dropdown)
- Brief note (optional textarea, max 300 chars)

After the form fields, one calm reassurance line:
"Submit your inquiry and we'll match you with a dedicated consultant — you'll get
a confirmation by email and WhatsApp within minutes."

On submit: success state showing a reference number (format: AB-2026-XXXX),
the student's name, and a note that they'll receive an email and WhatsApp shortly.

Mobile-first. Light Paper/Ivory theme. The submit button is full-width Apex green
on mobile.

Reference: Mobile Onboarding Form collection on Dribbble — borrow single-page
flow, progress reassurance copy, frictionless submit.
```

---

### B. Student Flow (light theme, mobile-first)

---

**B1 — Student Dashboard (`/portal/student`)**

```
Design the student's home dashboard. Mobile-first (375px primary). Light Paper
canvas, Ivory card surfaces.

SECTION 1 — Engagement pipeline (top of page):
Show the student's position in the 6-stage consulting process:
Inquiry → Counseling → Document Collection → Application → Fee/Verification → Admitted

On mobile (375px): do NOT attempt a 6-column horizontal bar. Use a step indicator
that shows current stage prominently with the previous and next stage visible as
context. For example: "< Counseling  [Document Collection]  Application >" with
the current stage larger and in Apex green. Or a compact "Stage 3 of 6:
Document Collection" label with a thin segmented progress bar beneath it.
On wider screens (768px+): a full horizontal stepper is acceptable.

SECTION 2 — University applications:
Below the stage indicator, a section titled "Your Applications." List each
university as a separate row: university name, program name, and a compact status
chip (Shortlisted / Applied / Conditional Offer / Unconditional Offer / Enrolled /
Rejected). Do NOT roll these into the pipeline stage above. These are outcomes per
university, separate from the consulting process stage.

Use restrained dividers between rows. Each row taps into a future university detail
view. Real data: e.g. UCL — MSc Data Science — Conditional Offer (Fern green chip),
University of Manchester — MSc Data Science — Applied (Marigold chip),
University of Edinburgh — MSc Data Science — Shortlisted (neutral chip).

SECTION 3 — Assigned consultant:
Consultant name, role title, and a "Contact history" link that goes to B3.

UNASSIGNED STATE: when auto-assignment is still pending (rare), show a calm
placeholder: "We're matching you with a consultant — you'll be notified shortly."
No spinner, no broken layout. This state should feel reassuring, not technical.

Overall composition: personal case file, not a mini CRM. Generous vertical rhythm,
one clear primary status per section, warm and human copy throughout.

Reference: Student Dashboard collection on Dribbble — borrow mobile readability
and progress clarity.
```

---

**B2 — Documents (`/portal/student/documents`)**

```
Design the student document center. Mobile-first, light theme.

Show each required document type as a list row:
- Passport / National ID
- Academic Transcript(s)
- English Proficiency (IELTS / TOEFL / Duolingo)
- Statement of Purpose (SOP)
- Curriculum Vitae / Resume
- Letters of Recommendation (if applicable)

Each row shows:
1. Document name and icon
2. CURRENT status only (one of: Not uploaded / Uploading / Confirming / Pending
   review / Verified / Rejected — needs re-upload)
3. Upload action (only if Not uploaded or Rejected)
4. A small "view prior version" link (only if a previous version exists)

UPLOAD THREE-STATE: when a student taps upload:
State 1 — "Uploading..." (progress indicator, cannot tap again)
State 2 — "Confirming..." (brief server-side validation, still locked)
State 3 — "Pending review" (confirmed) OR "Upload failed — [reason]" (rejected by server)
Never show "Uploaded" before State 3 is reached. This prevents a false-positive
where the backend deletes the file due to MIME/size failure.

REJECTED STATE: show the rejection reason inline in one line beneath the document
name. Example: "Rejected — transcript must be a PDF under 10MB. Please re-upload."
The re-upload button is clearly labeled and distinct from the rejection notice.

Reference: Document Management UI collection on Dribbble — borrow status-first
list view and version-aware design.
```

---

**B3 — Contact History (`/portal/student/activity`)**

```
Design a read-only activity timeline for the student. Light theme. Mobile-first.

IMPORTANT: this is NOT a messaging inbox. There is no in-app chat. The student
sees a timeline of things that have happened on their case.

Two types of entries appear in the same timeline, visually distinguished:

Type 1 — Consultant contact logs (when consultant logs a call/meeting):
Show: icon (phone / in-person / WhatsApp), date, and a brief shared note if one
exists. Example: "Phone call · Jan 14 · Discussed IELTS requirements and shortlist."
Whether the full note content is shared with the student or kept internal is a
product decision — design the component to support both: a note preview with a
"details available from your consultant" fallback if the note is private.

Type 2 — Automated system events (stage changes, document status changes):
Show: system icon, date, plain-language description. Examples:
"Your application advanced to Document Collection · Jan 15"
"Your transcript was reviewed and verified · Jan 17"
"Your application reached Fee/Verification stage · Jan 22"
These entries come from the trigger in the backend — design them to read as
agency communications, not system log entries.

Chronological order, most recent first. No pagination needed for MVP — a simple
scroll is fine.
```

---

### C. Consultant Flow (dark theme, desktop-first)

---

**C1 — Consultant Kanban Dashboard (`/crm/consultant`)**

```
Design the consultant's primary working screen. Dark Night pine / Spruce theme.
Desktop-first (1280px primary).

PRIMARY VIEW — 6-column Kanban board:
Columns: Inquiry | Counseling | Document Collection | Application | Fee/Verification | Admitted
Each column header: stage name + count of cards.

Card design: dense enough to scan quickly. Show:
- Student full name (primary)
- Target countries (1–3, compact)
- Days in current stage (e.g. "Day 3")
- ONLY for breached cards: one small Brick red pulsing dot (#D9564D) + "72h inactive"
  label. Nothing else pulses or glows anywhere in the interface. Most cards show
  no indicator at all.

STATS STRIP: one compact horizontal line above the board (not a row of oversized
KPI cards): "38 active · 5 stalled · 4 new this week"

VIEW TOGGLE: a compact toggle (top right) to switch to a sortable/filterable
table view showing the same engagements.

REALTIME STATES TO DESIGN:
- New card arrival: card slides into the correct column with a brief entrance
  (not a flash or explosion). Audio chime plays if enabled.
- Stall flag appears: the Brick dot fades in on an existing card.
- Card disappears: when a lead is reassigned away, the card fades out cleanly.

Navigation: narrow left sidebar — Apex wordmark, Kanban (active), Stalled,
Notifications bell with unread count badge.

Composition cue: full-width working board. Stats strip is a compact briefing line.
Column headers on one baseline. Cards dense enough to compare at a glance.

Reference: CRM Pipeline Dashboard — Dribbble shot 27438010 — borrow scannable
board structure and single attention signal. Discard its neon color language.
Reference: Dark Theme Admin Dashboard on Dribbble — borrow dense hierarchy.
```

---

**C2 — Engagement Case View (`/crm/consultant/[id]`)**

```
Design the consultant's detail view for a single student engagement. Dark theme.
This is the most important and complex screen in the product — design it as an
organized working file, not a single long scroll.

LAYOUT: Use a fixed two-column layout on desktop:
- Left column (60%): case content — pipeline, applications, documents, activity
- Right column (40%): actions sidebar — advance stage, log contact, auto-response log

LEFT COLUMN sections (each clearly bounded, not flowing together):

SECTION 1 — Student identity:
Name (Bone text, serif for name display), target countries, engagement reference
number, date created. Compact — two lines maximum.

SECTION 2 — Pipeline position:
Show current stage name prominently. One action only:
[  Advance to Document Collection →  ] — Apex green button.
This button must be DISABLED while a Server Action is in-flight (no double-submit).
No stage picker, no dropdown. When disabled during submission, show a brief
loading state on the button itself.

On stall breach: show the Brick dot + "72h inactive" beneath the stage name.
Logging contact clears this immediately (optimistic update).

SECTION 3 — University applications:
A compact table or card list showing each application:
University | Program | Status | Last updated
Status is editable inline (dropdown per row): Shortlisted → Applied →
Conditional Offer → Unconditional Offer → Rejected/Withdrawn → Enrolled

SECTION 4 — Documents:
Each document type and current status. Compact rows:
Passport — Verified (Fern) | Transcript — Pending review (Marigold) | IELTS — Not uploaded

RIGHT COLUMN (actions sidebar — sticky on scroll):

ACTION 1 — Log Contact:
Channel selector (Phone / WhatsApp / In-Person / Email), a note textarea (required,
min 5 chars), and a "Log contact" button. This clears any stall flag and resets
the inactivity timer. Note: this note may or may not be shared with the student
on their B3 timeline — show a "Visible to student" toggle.

ACTION 2 — Auto-response delivery log:
Compact accordion. Shows: "Welcome email — Delivered · Jan 12" and
"WhatsApp confirmation — Delivered · Jan 12." If failed, show Brick status.

BOTTOM — Activity timeline:
Chronological log of all events: stage transitions, document reviews, contact
logs, stall events. This is an append-only audit trail. Most recent first.

Reference: Dark Theme Admin Dashboard on Dribbble — borrow zone separation and
table density.

MOBILE PATTERN FOR C2:
On mobile, this screen is NOT a drawer — it becomes a full-screen view. The
two-column desktop layout collapses into a single scrollable page with clearly
separated sections and a sticky bottom action bar containing the two most
important actions: [ Log Contact ] and [ Advance Stage → ]. The right-column
sidebar becomes an expandable accordion at the bottom of the scroll. A clear
"← Back to pipeline" link sits in the top-left of the mobile header.
```

---

**C3 — Follow-Up Queue (`/crm/consultant/stalled`)**

```
Design the consultant's stalled-engagements list. Dark theme.

A sortable table sorted by hours inactive descending. Columns:
Student name | Current stage | Hours inactive | Last contact date | Action

Each row: one "Log contact" button that opens the Log Contact panel for that
engagement directly (same as the right sidebar in C2), or navigates directly
into the Case View. The fastest path to clearing a stall should be two clicks:
this list → log contact.

Show a zero-state: "No stalled engagements. All cases are within their SLA."
Use Fern green for the zero-state message — this is good news.

Compact header: "5 engagements need follow-up · Sorted by time inactive"
```

---

### D. Super-Admin Flow (dark theme, desktop-first)

---

**D1 — Admin Dashboard (`/admin`)**

```
Design the agency-owner's overview screen. Dark Night pine theme. Desktop-first.

This is an executive control room, not a report gallery.

OPENING LINE: one sentence of agency health + operational timestamp.
"38 active engagements · 5 stalled · 2 unassigned · Last evaluated 60s ago"

FUNNEL VISUALIZATION:
A horizontal funnel across the 6 stages. Show student count per stage. Use
muted Spruce bars with one active segment highlighted in Apex green (the stage
with most engagements). Keep quiet — no rainbow coloring per stage.

PER-CONSULTANT CAPACITY STRIP:
A compact table showing each consultant: Name | Active | Stalled | Capacity (e.g.
"28 / 30" format — NOT just a raw number) | Status (Accepting / Paused).
Clicking a consultant row goes to D4 (consultant detail screen).

ATTENTION LIST (two visually distinct sections):
Section A — "Escalated stalls" (consultant has not acted beyond the escalation
threshold, e.g. 4h after first stall alert): student name, consultant name, stage,
hours stalled. Action: nudge consultant.
Section B — "Unassigned" (auto-assignment failed — no capacity): student name,
target country, reference number. Action: manually assign.
Keep these sections labeled and visually distinct — they need different actions.

Reference: Dark Theme Admin Dashboard on Dribbble — borrow the executive
briefing hierarchy and restrained use of chart color.
```

---

**D2 — Consultant & Engagement Management (`/admin/consultants`)**

```
Design the admin's management screen. Dark theme. Two panels on the same page.

PANEL 1 — Consultants table:
Columns: Name | Active engagements | Capacity (editable inline, format "28 / 30")
| Stalled | Status toggle (Accepting / Paused) | Actions (Deactivate)

CAPACITY IS EDITABLE: clicking the capacity number opens an inline edit field.
This is required for adding new consultants and adjusting limits. No modal needed
— edit in place.

IS_ACCEPTING_LEADS TOGGLE: when set to Paused, show a visible Marigold pill
"Not accepting new leads" on the row and in any assignment dropdown that references
this consultant. The admin must never be able to accidentally assign to a paused
consultant without a warning.

DEACTIVATE action: clicking Deactivate shows a confirmation modal that says:
"[Name] has 12 active engagements. Deactivating them will flag all 12 for
reassignment and notify all super-admins. This cannot be undone. Continue?"
Two buttons: Cancel | Deactivate and flag leads. This maps directly to the
tr_consultant_deactivation trigger in the backend.

PANEL 2 — Agency-wide engagements table:
Searchable. Columns: Student name | Stage | Consultant | Target country | Days
in stage | Stall status | Actions (Reassign)

REASSIGN action: clicking Reassign opens a dropdown of consultants showing their
current load (e.g. "Priya Nair — 22/30 · Accepting" vs "Ben Okafor — 30/30 ·
Full — cannot assign"). Selecting a paused or full consultant shows a warning
before confirming. Single-engagement reassignment requires a one-click confirm
("Reassign to [Name]?") — not a heavy modal, but not zero confirmation either.
```

---

**D3 — Stage Regression (super-admin — inside Case View)**

```
Design the super-admin's version of the Case View stage control.

The Case View layout is identical to C2 but the pipeline section (Section 2)
shows TWO controls:

Primary action (Apex green, prominent):
[  Advance to Fee/Verification →  ]

Secondary action (smaller, less prominent, separated by visible spacing):
[  ← Move back to Application  ] — use a muted Spruce button, not Apex green.
Brick or destructive styling would overstate it — this is an administrative
correction, not a dangerous action.

Clicking the backward move opens a required-reason panel INLINE (not a modal):
A textarea: "Reason for moving back to Application:" with a character minimum
of 10. Submit button: "Confirm regression." The reason is written to activity_logs.
Cancel link dismisses the panel.

The backward option must be visually distinct from and less prominent than the
forward advance. A consultant visiting this screen should naturally read the
forward button first.
```

---

**D4 — Consultant Portfolio Detail (`/admin/consultants/[id]`)**

```
[NEW SCREEN — required by TC-11 gap in TEST_PLAN.md]

Design the admin's drill-in view for a single consultant. Accessed by clicking
a consultant row in D2 or the capacity strip in D1.

HEADER: consultant name, role, join date, current status (Accepting / Paused),
capacity display ("28 / 30 active"), and a Deactivate button (which triggers
the same confirmation flow as in D2).

PERFORMANCE SUMMARY (from mv_counselor_performance materialized view):
Compact horizontal metric strip:
Conversion rate (Admitted / total assigned) | Avg lead age in days |
Total admitted (last 30 days) | Currently stalled

Keep this strip factual and quiet — Bone numbers, Sage gray labels, no chart
decoration unless a sparkline adds genuine meaning.

PORTFOLIO TABLE: all engagements assigned to this consultant.
Columns: Student name | Stage | Days in stage | Stall status | Target country | Actions
Filterable by stage and stall status. Clicking a row goes to the Case View for
that engagement.

REASSIGN SELECTED: when one or more rows are checked, a "Reassign selected" button
appears above the table — useful for bulk transfer during a consultant handover.
```

---

**D5 — Document Rejection Input (modal/panel inside C2)**

```
[NEW SCREEN — required by TC-05 gap in TEST_PLAN.md]

This is an inline panel or compact modal triggered from the document status row
in C2's documents section when the consultant clicks "Review" on a Pending document.

REVIEW PANEL layout:
- Document name and type
- "Preview document" link (opens signed URL in a new tab)
- Two action buttons: [  Approve  ] (Fern) | [  Reject  ]

When "Reject" is clicked:
- The buttons replace with a textarea: "Rejection reason (shown to student):"
  with a character minimum of 5 chars.
- A brief copy note below the field: "This reason will appear on the student's
  document screen as a one-line explanation."
- Two buttons: [  Cancel  ] | [  Confirm rejection  ] (Brick colored — this
  is a destructive action on the document)

On confirm: document status updates to Rejected (optimistic), panel closes,
the consultant sees Brick "Rejected" status on the document row, and a
notification is queued to the student (email/WhatsApp) containing the reason.
```

---

### F. Additional Screens (from gap analysis)

---

**F1 — Consultant Leads Table View (`/crm/consultant?view=table`)**

```
Design the consultant's ALTERNATE dense data-table view of their pipeline.
Accessed via the view toggle on C1 (Kanban ↔ Table). Same data, different
presentation — for consultants who prefer scanning rows over columns.

This is a REAL data table, not cards. Columns:
Student name | Course / Program | Stage | Days in stage | Last activity |
Stall status | Actions

COLUMN BEHAVIOUR:
- Student name: clickable, opens C2 Case View
- Stage: compact chip, color corresponds to semantic tokens (no rainbow —
  use Bone text on Spruce background for most, Brick for stalled only)
- Days in stage: plain number, turns Marigold if approaching threshold
- Last activity: relative time ("2 days ago"), absolute on hover
- Stall status: empty for clean leads; Brick dot + "Stalled" label only when
  is_stalled = TRUE — same visual language as C1, not a new pattern
- Actions: compact icon row — View (→), Log contact (✎), nothing else

ABOVE THE TABLE:
Search input (left) + filter chips: All stages | Stalled only | [Stage name]
Sort controls on column headers. Row count: "38 leads"

TABLE DENSITY: aim for 12–16 rows visible without scrolling at 1280px.
This is a working tool — information density matters more than breathing room.
Rows are 44px tall (minimum tap target). Alternating Spruce/Lichen row shading.
Hovered row uses Lichen background.

EMPTY STATE:
"No leads match your filters." with a "Clear filters" link. Never an
illustration — just plain Sage gray copy and one action.

MOBILE:
Table collapses into a stacked list. Each item becomes a compact two-line card:
Line 1: Student name (Bone, medium weight) + Stage chip (right-aligned)
Line 2: Course (Sage gray, small) + Last activity (Sage gray, small, right-aligned)
Brick dot appears on the card left border for stalled leads — not inline.
Tap anywhere on the card opens C2. No swipe actions needed for MVP.

Reference: CRM Table UI collection on Dribbble — borrow dense column hierarchy
and inline action placement.
```

---

**F2 — Admin Pipeline & Stage Settings (`/admin/settings/pipeline`)**

```
Design the admin settings screen for configuring pipeline stages and SLA
thresholds. Accessed from Admin nav: Settings → Pipeline.

This must look like a professional settings form — NOT a drag-and-drop page
builder, NOT a visual canvas. Labeled rows with inline-editable fields.

LAYOUT: single-column, max-width ~720px, left-aligned on wide screens.
Section heading: "Pipeline stages" with a brief sub-label:
"Changes apply to all new engagements from the next pg_cron cycle."

STAGE ROWS: one row per stage, in order:
Each row contains:
- Stage number (1–6, not editable — order is fixed in the FSM)
- Stage name (inline editable text input — click to edit)
- Stall threshold (number input + "hours" label suffix)
- Escalation threshold (number input + "hours after stall" label suffix)
- Severity badge (HIGH / MEDIUM / CRITICAL / NONE — dropdown)
- Save indicator: each row has its own subtle save state
  (unsaved: faint Marigold left border, saved: Fern checkmark fades in)

IMPORTANT: Stage ORDER is NOT reorderable via drag. The FSM enforces a fixed
sequence. Do not show drag handles. A locked padlock icon on the order column
with a tooltip "Stage order is enforced by the system" makes this explicit
without being heavy-handed.

EXAMPLE ROWS (use real values from the schema):
1. Inquiry            | 24h | +4h escalation | HIGH
2. Counseling         | 48h | +4h escalation | MEDIUM
3. Document Collection| 72h | +4h escalation | MEDIUM
4. Application        | 48h | +4h escalation | HIGH
5. Fee/Verification   | 24h | +2h escalation | CRITICAL
6. Admitted           | —   | —              | NONE (read-only row, grey out)

BELOW THE TABLE:
A "Save all changes" primary button (only active when unsaved changes exist).
A "Reset to defaults" text link (muted, not prominent).

MOBILE: the row becomes a stacked card — stage name on top, threshold inputs
below as labeled fields. Save is per-card, not global on mobile.

Reference: Settings UI Dashboard collection on Dribbble — utility-first,
labeled rows, no decoration.
```

---

**F3 — Admin Communication Templates (`/admin/settings/templates`)**

```
Design the admin screen for managing automated email and WhatsApp message
templates. Accessed from Admin nav: Settings → Templates.

This is where the admin edits the messages that fire automatically on:
- New lead created (welcome email + WhatsApp)
- Stage advance (student notification)
- Document rejected (student notification with reason)
- Consultant reassigned (student notification)

LIST VIEW (left panel, ~35% width on desktop):
A vertical list of template entries. Each entry:
- Template name (e.g. "Welcome — Email", "Stage advance — WhatsApp")
- Channel chip: EMAIL or WHATSAPP (use a small icon, not just text)
- Status chip: Active / Draft (Fern / Marigold)
- Last edited date

Active template is highlighted with Eucalyptus left border. Click to edit.

EDIT VIEW (right panel, ~65% width on desktop):
Opens when a template is selected. Contains:
- Template name (editable)
- Channel (read-only — a template's channel cannot change)
- Subject line (email only, not shown for WhatsApp)
- Body editor: a PLAIN TEXT / SIMPLE MARKDOWN editor — not a rich-text page
  builder, not a WYSIWYG drag-and-drop. The copy should be the focus.
  Available variables shown as clickable chips below the editor:
  {{student_name}} {{reference_number}} {{stage_name}} {{consultant_name}}
  {{target_country}} {{agency_name}}
  Clicking a variable chip inserts it at cursor position.
- PREVIEW PANE: live preview beside the editor showing how the template renders
  with sample data (Kwame Asante-Mensah, AB-2026-0042, MSc Data Science etc.)
  Email preview shows an approximate email client rendering.
  WhatsApp preview shows a phone message bubble — grey background, message
  bubble on the right, formatted text rendered.
- Save button + "Revert to saved" link

WHATSAPP CONSTRAINT NOTE: a small info banner on WhatsApp templates:
"This template requires Meta approval before it can be sent to new contacts.
Status: [Approved / Pending / Not submitted]" — with a "Submit for approval"
link if not yet submitted. This is important — unapproved templates cause
delivery failures (§17.14 in README).

MOBILE: list becomes full-screen, tapping a template opens the edit view as
a full-screen overlay with a back action. No split-pane on mobile.

Reference: Email Template Editor collection on Dribbble — split edit/preview
pane, plain-text focused.
```

---

**F4 — Consultant Notification Centre (`/crm/consultant/notifications`)**

```
Design the consultant's notification centre. Accessed from the bell icon in
C1's left sidebar when the unread count badge is > 0.

This is the persistent record of everything that has happened on the
consultant's portfolio — new leads arrived, stalls detected, admin actions,
system alerts. NOT a chat inbox.

LAYOUT: single-column list, desktop and mobile share the same layout
(this is a secondary screen — desktop-first is not required here).

HEADER:
"Notifications" title + "Mark all read" text link (right-aligned, only shown
when unread items exist).

NOTIFICATION TYPES — each has a distinct icon and copy pattern:

New lead assigned (Eucalyptus dot on icon):
  "Kwame Asante-Mensah was assigned to your portfolio · 2 min ago"
  Action: [ View lead → ]

Stall breach (Brick dot on icon):
  "Fatima Al-Rasheed has been inactive in Counseling for 72 hours"
  Action: [ Log contact → ] (one tap, goes directly to C2 Log Contact)

Stall resolved (Fern dot on icon):
  "Stall cleared — Priya Sundaram · Document Collection"
  No action needed — informational only

Lead reassigned away (Sage gray, muted):
  "Lucas Oliveira has been reassigned to Amara Diallo"
  No action needed — informational only

Admin message (Marigold dot on icon):
  "Admin: SLA threshold for Fee/Verification changed to 24h"
  No action needed — informational only

GROUPING: group by recency — "Today", "Yesterday", "Earlier this week".
Not paginated — infinite scroll is acceptable for MVP.

UNREAD STATE: unread items have a subtle Lichen left-border highlight.
Read items are flush with the background. No bold text difference — the
left border is the only visual distinction.

EMPTY STATE:
"You're all caught up." — Fern icon, one line of Sage gray copy.
This is a positive state — make it feel like good news.

MOBILE: identical layout. The bell icon in the mobile nav bottom bar shows
the unread count. Tapping opens this screen full-screen.

Reference: Notification Center UI collection on Dribbble — grouped by recency,
one action per item, unread distinction without aggression.
```

---

### E. Not Customer-Facing

---

**E1 — Live Sales Demo (`/demo/split`)**

```
Design the side-by-side live presentation mode for pitching Apex to
agency clients. Deliberately more dramatic than the production screens. This
screen must demonstrate four specific moments in order.

LAYOUT: full-width split. Left 40% = student side. Right 60% = CRM side.
Top bar = persistent demo toolbar.

─── TOP BAR (demo toolbar, always visible) ───────────────────────────────────
One status pill: ● CONNECTED (Eucalyptus) or ● DISCONNECTED (Brick)
Four action buttons spaced across the bar:
  [ Seed 10 Leads ]  [ Age Selected Lead –3d ]  [ Run Stall Check ]  [ Reset Demo ]
Label below bar: "Demo mode — not visible to students or consultants in production"

─── LEFT PANEL — Student Inquiry Side ────────────────────────────────────────
SECTION 1 — Pre-filled inquiry form (same as A2 but pre-populated):
Pre-filled with: Kwame Asante-Mensah | kwame@example.com |
+233 55 012 3456 | Target: Canada, United Kingdom | MSc Data Science
One large primary button: [ Submit Inquiry → ] (full-width, Apex green)

SECTION 2 — Auto-Response Sandbox (below the form, appears after submit):
Title: "Automated responses fired"
Two rows, each with channel icon + status:
  📧 Welcome email          ● Queued → ● Delivered  (animates on delivery)
  💬 WhatsApp confirmation  ● Queued → ● Delivered  (animates on delivery)
Two links per row: [ Preview message ] — opens a modal showing the actual
email HTML or WhatsApp template body with Kwame's real data filled in.
If FAILED: show Brick status with the error reason (e.g. "Template not approved").

This section is COLLAPSED before submit (shows a quiet placeholder:
"Confirmation messages will appear here after submission"). EXPANDS on submit
and animates in the status rows. This makes the moment of delivery feel dramatic
and real to the prospect watching.

─── RIGHT PANEL — Live Consultant CRM Side ───────────────────────────────────
SECTION 1 — The pipeline (MOMENT 3 — show this first):
A compact version of the 6-column Kanban C1, pre-populated with 10 seeded leads
spread across stages for visual funnel clarity:
  Inquiry (3 cards) | Counseling (2) | Document Collection (2) |
  Application (2) | Fee/Verification (1) | Admitted (0)
This establishes the funnel shape immediately before any action is taken.
Cards are real: Fatima Al-Rasheed (UK), Amara Diallo (Canada), Jin-woo Park (UK), etc.

One existing card in Counseling shows a subtle Marigold "Day 4" label to hint
at the stall story about to be told — not yet a Brick breach, just context.

SECTION 2 — New lead arrival (MOMENT 1 — fires after submit):
When the left-panel form submits, a new card ENTERS the Inquiry column with a
smooth slide-down entrance animation (300ms, ease-out). It is visually distinct
from the seeded cards — a brief Eucalyptus left-border highlight fades to normal
after 2 seconds to show it is brand new.
The audio chime plays on card arrival (always enabled on /demo route).

SECTION 3 — Stall breach (MOMENT 4 — after Age + Run Cron):
When "Age Selected Lead –3d" and "Run Stall Check" are clicked in sequence,
the targeted card (in Counseling) transitions:
  Before: normal card, "Day 4" label
  After:  Brick pulsing dot (the signature animation from C1), "72h inactive
          in Counseling" label appears with a brief scale-in entrance.
A "Log Contact" button appears prominently on the card (not normally visible
in production — here it is surfaced on the card itself for demo speed).
Clicking it makes the Brick dot and label fade out instantly (not transition
away — it disappears, which feels satisfying and immediate to a live audience).

─── VISUAL TONE ──────────────────────────────────────────────────────────────
This screen CAN be slightly more theatrical than the production CRM:
- Card entrance animation is visible and confident (production uses a subtler
  version)
- Auto-Response Sandbox delivery ticks animate sequentially (email first, then
  WhatsApp 1 second later) to make the moment feel real and not instantaneous
- The stall dot's pulse is slightly larger than in production to read well on
  a projected screen
But: no neon glows, no confetti, no over-designed celebration states. The drama
comes from the real system working in front of an audience, not from decoration.

Reference: this screen is the system's proof-of-concept moment — design it to
make a prospect lean forward, not look away.
```

---

## 3. Gaps Addressed in This Version

These are all gaps identified in TEST_PLAN.md that have been incorporated
into the screen prompts above. Check each one when walking the Stitch output
against the test plan.

| Gap from TEST_PLAN | Addressed in screen | How |
|---|---|---|
| 6-stage bar breaks at 375px (TC-12) | B1 | Explicit mobile step indicator spec replacing horizontal bar |
| Upload three-state UX missing (TC-04) | B2 | uploading → confirming → confirmed/rejected states specified |
| Document rejection reason not designed (TC-05) | D5 (new screen) | Full rejection input panel specified |
| Consultant detail screen missing (TC-11) | D4 (new screen) | Full consultant portfolio + performance metrics screen |
| Capacity column shows raw number (TC-08) | D2 | "28 / 30" format explicitly specified |
| No warning for unavailable consultant (TC-08) | D2 | Paused consultant warning in reassign dropdown specified |
| No UI to edit max_lead_capacity (TC-08) | D2 | Inline editable capacity field specified |
| Advance button double-click risk (TC-03) | C2 | Button disabled during Server Action in-flight, loading state specified |
| Stage FSM error is raw Postgres string (TC-03) | C2 | Implicit — button loading state prevents the error reaching the toast |
| Log Contact note visibility to student (TC-06) | C2 | "Visible to student" toggle on Log Contact panel |
| Unassigned leads vs escalated stalls mixed (TC-09) | D1 | Two visually distinct sections in the attention list |
| Deactivation warning missing (TC-07) | D2 | Confirmation modal with active engagement count |
| No reassignment confirmation (TC-07) | D2 | One-click confirm specified for single reassignment |
| Single-page vs multi-step intake unresolved (TC-10) | A2 | Explicitly single-page |
| "Matching consultant" state no fallback copy (TC-01) | B1 | Calm unassigned placeholder state specified |
| No document request mechanism (TC-04) | B2, C2 | Document list implies required types; further schema decision deferred |
| communication_logs not in Realtime pub | E1 (Auto-Response Sandbox) | Requires ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_logs (README §7.1) |
| fn_demo_seed_leads not implemented | E1 (Seed 10 Leads toolbar) | Added to README §10 — migration 20260911000023_demo_functions.sql |
| fn_demo_simulate_stall not implemented | E1 (Age Lead toolbar) | Added to README §10 — same migration, includes safety guard for demo-only leads |
| fn_demo_reset not implemented | E1 (Reset Demo toolbar) | Added to README §10 — deletes demo leads, resets state for next presentation |
| No table view for consultant pipeline | F1 (new screen) | Dense sortable table as toggle-alternate to C1 Kanban, with mobile stacked list |
| No pipeline stage settings screen | F2 (new screen) | Admin configures stage names, stall thresholds, escalation thresholds inline |
| No communication templates screen | F3 (new screen) | Admin edits email/WhatsApp templates with live preview and Meta approval status |
| No notification centre screen | F4 (new screen) | Persistent record behind the C1 bell icon — new leads, stalls, admin messages |
| C2 mobile pattern unspecified | C2 (updated) | Drawer on desktop → full-screen on mobile, sticky bottom action bar |
| No mobile nav pattern defined | Master prompt (updated) | Bottom nav bar for student portal, sidebar collapse for CRM/Admin |
| No empty/loading/error states | Master prompt (updated) | All three states required on every screen — skeleton, copy, retry action |

## 4. Product Decisions — Resolved

These five decisions were previously open. They are now resolved. Each decision
is stated, the reasoning is given, and the exact screen change it triggers is
listed. Update the relevant screen prompts in Section 2 accordingly when
regenerating in Stitch.

---

### Decision 1 — In-app messaging: External only. B3 is the final comms screen.

**Decision:** No in-app messaging. WhatsApp and phone are the communication
channels. The CRM logs contact; it does not replace it.

**Why:** Consultants at placement agencies already live in WhatsApp. Building
a third inbox means neither party checks it consistently — the consultant
forgets the CRM chat, the student replies on WhatsApp, the records diverge.
In-app messaging is also significant unbuilt scope: messages table, read
receipts, push notifications, Realtime on both portals. Shipping without it
and framing "WhatsApp is the channel, this is the record" is a cleaner product
story, not a compromise.

**Screen changes:**
- **B3** — The activity timeline is the definitive student-facing comms record.
  Design it to feel complete, not like a consolation prize for missing a chat
  feature. Consultant contact logs and automated system events in one clear
  chronological timeline.
- **C2** — The "Log Contact" panel is the consultant's single communication
  action. It is not a chat input — it is a structured record of what happened
  externally. Design it accordingly: channel selector (Phone / WhatsApp /
  In-Person / Email), note field, "Visible to student" toggle (see Decision 5).
- No Messages screen needed for B or C.

---

### Decision 2 — Student notified on consultant reassignment: Yes — notify.

**Decision:** When a consultant is reassigned or deactivated and their leads are
transferred, the student receives a WhatsApp notification. Email optional.

**Why:** The student's portal shows their consultant's name. Changing that name
silently while a student is actively watching their application damages trust.
In a high-stakes process (university admissions, visa timelines, financial
decisions), silent reassignment reads as disorganisation. One template message
fixes this: "Your dedicated advisor is now [name]. They'll be in touch shortly."
The cost is one pre-approved WhatsApp template. The benefit is the student never
wonders why their consultant name changed without explanation.

**Screen changes:**
- **B1** — The assigned consultant section must update in real time when
  reassignment happens (Realtime subscription on `leads.assigned_consultant_id`).
  Do not require a page reload for the consultant name to update.
- **B3** — Add a system event entry for reassignment: "Your case has been
  transferred to [new consultant name] · [date]". This is an automated entry,
  not a logged call.
- No new screen needed — this is a trigger + template, not a UI feature.

---

### Decision 3 — Student sees stall status on B1: No — hide it.

**Decision:** The student's B1 dashboard shows no stall indicator. Stall status
is an internal operational concept only.

**Why:** "Your application has been inactive for 72 hours" is accurate as a
database fact and anxiety-inducing as a student notification. It tells the
student their consultant hasn't acted — context they cannot use and that may
be misleading (the consultant may be working on other parts of the case). The
student's experience must feel managed and calm. Stall is a consultant and
admin concern. The student's signal that their case is progressing is the
automated stage-advance notification (Decision 1 / §17.5) — that is the right
feedback loop, not a raw SLA timer.

**Screen changes:**
- **B1** — No stall indicator, no "needs attention" badge. Stage section
  unchanged. The student sees progress when it happens, not absence when it
  doesn't.
- **C1** — The Brick pulsing dot remains on the consultant's Kanban card.
  This does not change.
- **D1** — Admin attention list remains. This does not change.

---

### Decision 4 — Admin escalation threshold: 4 hours after first stall alert.

**Decision:** A stalled lead appears in the D1 admin attention list only after
the consultant has not acted for 4 hours following the first stall flag. The
only exception is Fee/Verification stage, which escalates after 2 hours.

**Why:** If every `is_stalled = TRUE` lead immediately reaches the admin, the
D1 attention list mirrors the consultant's stalled queue — which the consultant
is already managing. The admin's list is for leads that consultants have failed
to act on, not leads they are about to handle. The 4-hour buffer filters out
self-resolving stalls and keeps the admin's attention on genuinely stuck cases.
Fee/Verification gets 2 hours because a missed conditional offer deadline is
irreversible — faster escalation is warranted.

**The values:**

| Stage | Stall threshold | Escalates to admin |
|---|---|---|
| Inquiry | 24h | +4h = 28h total |
| Counseling | 48h | +4h = 52h total |
| Document Collection | 72h | +4h = 76h total |
| Application | 48h | +4h = 52h total |
| Fee/Verification | 24h | +2h = 26h total |

**Screen changes:**
- **D1** — The attention list section "Escalated stalls" only shows leads where
  `hours_since_stall_flagged >= escalation_threshold_hours`. A lead that was
  flagged 1 hour ago does not appear here yet. Add a timestamp to each row:
  "Stalled 6h ago — consultant not responded." This communicates urgency
  proportionally.
- **C3** — The consultant's Follow-Up Queue shows ALL stalled leads assigned
  to them immediately on `is_stalled = TRUE`. The admin's list is the
  escalation layer, the consultant's queue is the first line.

---

### Decision 5 — Consultant note visible to student: Summary yes, full note no.

**Decision:** Consultant notes have two parts: a full internal note (consultant
and admin only) and an optional short shareable summary. Only the summary
appears on the student's B3 timeline. If no summary is provided, B3 shows
"[Channel] contact logged · [date]" — enough to signal activity, nothing
operationally sensitive.

**Why:** A consultant's working note serves two audiences with incompatible
needs. "Called Priya — hasn't started SOP, pushing back on Canada shortlist,
seems uncertain about the whole process" is operationally useful and would be
alarming shown verbatim to Priya. The split-field model gives consultants full
expressive freedom internally while giving students a curated sense of
involvement. The "Visible to student" toggle in C2 controls whether the summary
field is published to B3.

**Screen changes:**
- **C2 Log Contact panel** — Two fields:
  1. Internal note (always saved, never shown to student): textarea, required,
     min 5 chars. Label: "Internal note (not shared)"
  2. Student-visible summary (optional): short textarea, max 120 chars. Label:
     "Summary for student timeline (optional)". Pre-placeholder: e.g. "Discussed
     university shortlist and IELTS requirements."
  The "Visible to student" toggle from the previous spec becomes a more explicit
  two-field layout. No toggle ambiguity — the field separation makes the
  distinction visually clear.
- **B3 activity timeline** — Each contact log entry shows:
  - If a summary exists: channel icon + date + summary text (e.g. "Phone call ·
    Jan 14 · Discussed IELTS requirements and university shortlist")
  - If no summary: channel icon + date + "Your advisor logged a contact" (neutral,
    reassuring, no operational detail leaked)
  These appear alongside automated system events in the same timeline.

---

## 5. Screen Generation Order

**Tier 1 — generate these first (core demo and daily-use screens):**

1. **C2** — Engagement Case View. Most complex, most used. Desktop two-column + mobile full-screen pattern.
2. **B1** — Student Dashboard. Mobile stage indicator and two-layer application structure.
3. **A2** — Inquiry Form. Single-page, mobile-first, public-facing.
4. **C1** — Consultant Kanban. Desktop board + mobile chip/tab list pattern.
5. **D1** — Admin Dashboard. Funnel + attention list split.
6. **E1** — Live Sales Demo. Goes in front of a paying prospect — get the four-moment sequence right.

**Tier 2 — generate after Tier 1 is approved:**

7. **A1** — Login. Simplest screen — leave until visual language is set.
8. **B2** — Documents. Three-state upload UX.
9. **B3** — Activity Timeline. Resolved decisions (Decision 1, 5) define exactly what appears here.
10. **F1** — Leads Table View. Dense table alternate for C1.
11. **C3** — Follow-Up Queue. Simple stalled list.
12. **D2** — Consultant Management. Two-panel admin screen.
13. **D4** — Consultant Portfolio Detail. Drill-in from D1/D2.
14. **F4** — Notification Centre. Bell icon destination.

**Tier 3 — generate last (settings and operational back-office):**

15. **F2** — Pipeline Stage Settings. Admin configuration.
16. **F3** — Communication Templates. Admin template editor.
17. **D3** — Stage Regression Panel. Super-admin panel inside C2.
18. **D5** — Document Rejection Panel. Consultant panel inside C2.

**Regeneration rule:** If a screen comes back generic, add one concrete missing
constraint rather than re-rolling blind. The prompts are specific — use them.
