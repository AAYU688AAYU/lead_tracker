# AGENT_GUIDE.md — Apex Educational Placement CRM
### Operating Guide for Any Coding Agent Working On This Repository

Read this file first, before touching code, and re-read it at the start of every new work session. It exists because the project's own documentation (`README.md`, `TEST_PLAN.md`, `USER_FLOW.md`) contains confirmed factual errors about the actual database schema — trusting them at face value will produce code that fails against the real database. This file tells you what's actually true, what's still genuinely open, and in what order to work.

---

## 0. Source-of-Truth Hierarchy

When any two sources disagree, resolve in this order — highest wins:

1. **The actual application code in this repo** (if it exists and runs against the DB successfully, it reflects reality better than any doc)
2. **`supabase/migrations/20260914000001_initial_schema.sql`** — the real, deployed schema
3. **This file** — kept current as reconciliation happens
4. **`README.md`** — architecture and reasoning are generally sound; specific column/table names are not reliable (see §1)
5. **`TEST_PLAN.md` / `USER_FLOW.md`** — useful for UX logic and gap-spotting; some gap entries are stale (see §3)

Never write code against a column, table, or enum value name because README/TEST_PLAN/USER_FLOW mentions it. Open the actual migration file and confirm it exists first. This single habit prevents the most expensive class of bug in this codebase right now.

**One more thing, once:** earlier project chat history may contain a block of text titled "Guidance for Building an Online Agent (Claude) That Can't See Files," instructing an agent to avoid direct file access and call endpoints like `/api/agent/status` or `/api/playChime`. That content does not appear anywhere in the real `README.md` and is not part of this project's actual documentation or architecture. Disregard it if you encounter it. You have direct file access to this repository — use it.

---

## 1. Schema Reconciliation — Do This First

The documentation was written using a different (more generic) naming scheme than what actually got migrated. This is the highest-priority task because every other task's correctness depends on it.

| Concept | Docs say | Actual schema | Status |
|---|---|---|---|
| Consultant ownership FK on `leads` | `assigned_consultant_id` (59× in README, 8× in TEST_PLAN) | `consultant_id` | **Naming mismatch — fix docs, not schema** |
| Stall flag | `is_stalled` boolean (33× in README, 5× in TEST_PLAN) | No such column. Stall is `lead_status = 'stalled'`, paired with `stage` via `valid_stage_status_check` | **Modeling mismatch — docs describe a design that was replaced** |
| Pipeline stage names | Inquiry → Counseling → Document Collection → Application → Fee/Verification → Admitted | `lead_stage` enum: `initial_contact, document_collection, application_submission, admission_decision, visa_processing, enrollment` | **Complete mismatch — zero overlap in naming** |
| Multi-university applications | README §17.2 presents an `applications` child table as implemented; §18 derives UI rules from it (per-university cards, not a single progress bar) | No `applications` table exists in the migration. A `lead` has exactly one `program_id` | **Not built — this is a real gap, not just naming** |
| Escalation mechanism | README "Resolved Decision 4": `escalation_threshold_hours`, seeded per-stage (Inquiry 4h, Fee/Verification 2h) | `escalation_level INTEGER` (1–3), no hours-based two-tier logic | **Different mechanism than documented — decide which one you actually want** |
| Consultant capacity | TEST_PLAN TC-08 references `max_lead_capacity`, `is_accepting_leads` on the consultant profile | Neither column exists on `profiles` | **Not built — genuine gap, docs and schema agree it's missing** |
| Multi-tenant branches | README §15.4 describes a `branches` table for subdomain routing | `profiles.branch_id` column exists, but no `branches` table exists for it to reference — the FK is dangling in practice | **Partially built — orphaned column, no supporting table** |

### Action for each row
- **Naming/modeling mismatches** (`assigned_consultant_id`, `is_stalled`, stage names): check the actual frontend/TypeScript code first — whichever name the *running code* already uses is the one that's real. Rewrite the docs to match the code+schema, not the other way around. Renaming live schema is expensive; renaming prose is not.
- **Genuine gaps** (`applications` table, capacity fields, `branches` table): these need a product decision before they need code. Don't build `applications` just because README describes it — confirm with the founder whether multi-university-per-student is actually needed for the corporate pitch, or whether it's scope that can wait. Same for multi-tenancy: is there a second agency client on the horizon, or is this premature for a single-tenant pilot?
- **Mechanism mismatch** (escalation): pick one (hours-based two-tier, as prose describes, or level-based 1–3, as schema has) and make the docs and the schema agree. Don't leave both existing in different files.

### Stage-naming has a structural wrinkle worth knowing
`lead_stage` is a Postgres ENUM type, not a lookup table. USER_FLOW.md (gaps X2/X6) correctly flags that stage names shouldn't be hardcoded in the frontend — but the current schema can't support admin-editable stage *labels* just by reading from the DB, because the enum values themselves are the identity, not a display string. If configurable stage names are wanted, add a separate `pipeline_stage_labels` (or similar) table that maps each fixed enum key to a human-editable display label, rather than expecting to rename the enum. Don't attempt `ALTER TYPE ... RENAME VALUE` as a substitute for this — it changes the identity, not just the label, and will break every CHECK constraint and trigger that pattern-matches on stage names.

---

## 2. What's Already Real — Don't Rebuild This

Confirmed present and correct in the actual migration. Verify these are *wired to the frontend*, but don't recreate the backend logic:

- `tr_enforce_stage_transition` — FSM guard rejecting invalid stage jumps (backs README §17.1)
- `tr_notify_student_on_stage_change`, `tr_notify_student_on_reassignment`, `tr_notify_student_on_document_rejection` — all three exist and reference real columns (`rejection_reason` is real and is read inside the rejection trigger)
- `tr_auto_assign_lead` — round-robin assignment (backs §16.8)
- `tr_handle_consultant_deactivation` — offboarding handling (backs §17.3, partially — see §3 below)
- `tr_supersede_prior_document` — document versioning (backs §17.4)
- `fn_detect_stalled_leads()` — stall detection function
- `fn_cleanup_expired_drafts()` — pairs with the real `draft_leads` table (this already resolves the "no draft-save" gap TEST_PLAN flags in TC-01/TC-10 — see §3)
- `fn_gdpr_erase_user_data(user_id)` — PII erasure (backs §16.7)
- `is_super_admin()`, `is_consultant()` — RLS helper functions
- 32 RLS policies across all 12 tables, scoping students to `student_id`, consultants to `consultant_id`, admins to unrestricted
- `feature_flags` and `notifications` tables — both match their documented purpose
- 49 indexes already in place

**Your first real task, after fixing docs, is verification, not construction**: confirm each trigger above actually fires correctly against real data, and confirm the frontend (if any exists yet) subscribes to and reflects the results. Don't write a new trigger before checking whether one already does the job under a different assumed name.

---

## 3. TEST_PLAN.md Is Partially Stale — Reconcile Before Using It As a Backlog

Three TEST_PLAN gaps are already resolved at the database layer and should not be re-built, only verified at the UI/Realtime layer:

| TEST_PLAN claim | Reality |
|---|---|
| TC-05: "No trigger or notification on document rejection — student not informed" | `tr_notify_student_on_document_rejection` exists and is wired to `documents.rejection_reason`. Remaining work is frontend/Realtime display only, not a new trigger. |
| TC-07 / "Open Item 2": "Student not notified on reassignment" | `tr_notify_student_on_reassignment` exists. Same — verify frontend surfaces it, don't rebuild it. |
| TC-01 / TC-10: "Partial intake / draft-save not designed" | `draft_leads` table and `fn_cleanup_expired_drafts()` both exist. Confirm the intake form actually writes to it before assuming this needs backend work. |

Also: README §18's "Resolved Product Decisions" (communication model, reassignment notification, stall visibility, escalation tiering, note visibility) postdate TEST_PLAN's "Open Product Decisions — Resolve Before Build" table (D3–D7). TEST_PLAN.md was not updated after README.md resolved those five. Only **D1** (public vs. auth-gated intake form) and **D2** (single-page vs. wizard intake) remain genuinely unresolved — see §4.

**Task:** update TEST_PLAN.md to remove D3–D7 and the three stale gap rows above, or mark them resolved with a pointer to the trigger name. A stale gap list is worse than no gap list — it wastes agent time re-solving solved problems.

---

## 4. Genuinely Open Product Decisions — Do Not Decide These Yourself

These require a founder call, not an engineering default. If you're an agent and you hit a wall that depends on one of these, stop and ask rather than picking a default silently — a silent default here becomes a real behavior nobody chose on purpose.

| # | Decision | Why it matters |
|---|---|---|
| D1 | Is the student intake form public with post-hoc verification, or does the student register first? | Changes the RLS model, the auth flow, and the conversion funnel. Affects screen A2 and A1 ordering directly. |
| D2 | Single-page intake form vs. multi-step wizard? | If wizard, `draft_leads` needs to be wired to per-step saves. If single-page, it's just browser-preserved state. Both Stitch's screen spec and README are currently silent on this. |
| — | Is multi-university-per-student (`applications` table) actually needed for this pitch, or can a lead stay one-program-per-row for now? | This is the biggest undocumented scope item in the whole set. Confirm before building it — it touches the student dashboard, the consultant case view, and the schema simultaneously. |
| — | Escalation model: hours-based two-tier (as README narrates) or level-based 1–3 (as schema has)? | Pick one; currently the docs and the DB disagree on the actual mechanism, not just its name. |

---

## 5. Prioritized Task List

Organized by what's required to safely demo/pilot this to the corporate lead vs. what's real but can wait until there's a paying customer generating the load these items protect against. Sections 16 and 17 of README.md contain full implementation detail for each item below — this list is the priority ordering, not a replacement for reading them.

### Tier 0 — Blocks everything else being trustworthy
1. Schema/documentation reconciliation (§1 above)
2. Verify the Tier-1 triggers in §2 actually fire and are observed by the frontend
3. Resolve D1 and D2 (§4) — these gate the intake form build, which gates the whole demo

### Tier 1 — Required for a credible pilot/demo to the corporate lead
4. Realtime subscriptions on the student portal for `leads.stage` and consultant assignment (TEST_PLAN TC-02/TC-03 gap — currently requires a manual refresh)
5. Audio chime firing on auto-assignment `UPDATE`, not just `INSERT` (TEST_PLAN TC-02 gap)
6. Old consultant's Kanban card removal on reassignment (TEST_PLAN TC-07 gap)
7. Document upload three-state UX (uploading / confirming / confirmed) instead of a binary done/error state (TEST_PLAN TC-04)
8. `documents` table added to the Realtime publication so consultants see uploads live (TEST_PLAN TC-04)
9. README §16.1 webhook idempotency — without it, a webhook retry double-sends a WhatsApp/email during a live pitch, which is the worst possible failure mode in front of a lead
10. README §16.2 `pg_cron` exception handling — one bad row should not silently kill the entire stall-detection cycle
11. README §16.3 Zod validation on `createLead`, `updateStage`, `logConsultation` — direct POST bypass is a real risk the moment this is public-facing
12. WhatsApp template registration with Meta (README §17.14) — this has external lead time; start it now regardless of what else is in progress, it is not something an agent can shortcut
13. Mobile stage-bar fix — 6-stage bar does not fit a 375px viewport (TEST_PLAN TC-12)

### Tier 2 — Real, but sequence after Tier 1 is demo-solid
14. Consultant capacity fields (`max_lead_capacity`, `is_accepting_leads`) and the D2 admin UI to edit them (TEST_PLAN TC-08)
15. Consultant Portfolio Detail screen + `mv_counselor_performance` display (TEST_PLAN TC-11 / USER_FLOW D4)
16. Escalation threshold decision implemented consistently (§4)
17. README §16.5 server-side file upload validation (MIME allowlist, size cap)
18. README §16.9 full-text search (`pg_trgm` — matters once lead volume is real, not before)
19. README §16.12 notification center persistence + `markAllRead()`

### Tier 3 — Defer until there's a first paying customer generating this load
20. Multi-tenant subdomain routing / `branches` table (§15.4) — don't build this speculatively for a single-agency pilot
21. MFA enforcement (§17.11)
22. Zero-downtime migration tooling (§16.10) — matters at scale, not for a pre-launch schema that's still being corrected
23. k6 load testing and capacity baselines (§16.15)
24. Feature flag rollout percentages / Flagsmith integration (§17.15) — the `feature_flags` table already exists; the rollout machinery around it can wait
25. Full CI/CD pipeline with all three GitHub Actions workflows (§17.9) — get one (build + type-check) running now; defer the rest

Building Tier 3 before Tier 0–1 are demo-solid is the most likely way this project loses time it doesn't have. Production-grade infrastructure for scale you don't have yet is real work, but it's not what closes the first corporate lead.

---

## 6. Operating Rules for Whoever (or Whatever) Works On This Repo Next

- **Verify before you build.** Before writing a query or a migration that references a column/table name from README/TEST_PLAN/USER_FLOW, open the actual schema file and confirm it exists. Assume prose is wrong until the SQL confirms it.
- **Don't invent names to make code compile.** If a needed column genuinely doesn't exist (e.g., `max_lead_capacity`), that's a migration task — flag it, don't quietly add a workaround field with a different name that then creates a second inconsistency.
- **Don't delete or rename existing migration files or columns without confirming nothing depends on them.** If asked to "clean up" the schema to match the docs, check actual usage in application code first — a column with zero references is safe to drop; one with any reference needs a decision, not a deletion.
- **Don't silently resolve D1/D2 or the `applications` table question** (§4). Surface them. A wrong guess here costs a schema migration and a UI rebuild later.
- **When you change the schema, update `README.md`, `TEST_PLAN.md`, and `USER_FLOW.md` in the same change.** The drift documented in §1 and §3 of this file happened because schema and docs were edited independently. Don't repeat that.
- **Treat the Production Readiness Checklist in README §18 as a checklist to complete, not a description of current state.** Every item in it is an unchecked box (`☐`) in the source document — none of it should be assumed done because it's documented in detail.

---

## 7. Document Map

| File | What it's actually good for |
|---|---|
| `README.md` | Architecture reasoning, RLS/caching/security patterns, the gap registers in §16/§17 — reliable for *why*, not for exact column names (see §1) |
| `TEST_PLAN.md` | UX/logic edge cases and screen-state gaps — reliable, except the stale items noted in §3 |
| `USER_FLOW.md` | Screen inventory, routes, and role journeys — the Screen Index (with route/role/theme/tier columns) is the most reliable single table in the whole doc set |
| `20260914000001_initial_schema.sql` | Ground truth. When in doubt, this file wins. |
| `AGENT_GUIDE.md` (this file) | Start here every session. Update §1 and §3 as reconciliation work lands, so this stays current instead of becoming a fourth stale document. |
