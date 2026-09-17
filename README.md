# Lead Tracker — B2B2C Educational Placement CRM

A cloud-native, enterprise-grade educational placement and advisory agency platform. Built with Next.js 15, Supabase (PostgreSQL 16), and Deno Edge Functions.

**Status:** Production-Ready | **License:** Proprietary | **Latest Phase:** 10 (Complete)

---

## 🚀 Quick Start

### One-Command Setup

```bash
# Clone and install frontend
git clone https://github.com/your-org/lead_tracker
cd lead_tracker/frontend
npm install
npm run dev              # Starts on http://localhost:3000

# In another terminal: start local Supabase
cd ../supabase
supabase start
supabase db push         # Apply migrations
```

For detailed setup, see [SETUP.md](SETUP.md).

---

## 📚 Documentation

All documentation is organized in the `/docs` directory:

| Section | Purpose |
|---------|---------|
| **[📖 docs/README.md](docs/README.md)** | Complete documentation index |
| **[🏗️ Architecture](docs/architecture/)** | System design, real-time features, data flows |
| **[🚀 Development](docs/development/)** | Implementation guides, UI/UX standards |
| **[📊 Phases](docs/phases/)** | Development phase reports (Phase 3–10) |
| **[✅ Testing](docs/testing/)** | QA procedures and test coverage |
| **[📖 Guides](docs/guides/)** | Agent workflows, operational guides |

**New to the project?** Start with [docs/README.md](docs/README.md) for a complete navigation guide.

---

## 🏗️ Project Structure

```
lead_tracker/
├── frontend/                          # Next.js 15 Application
│   ├── app/                          # App Router routes & components
│   ├── lib/                          # Utilities, hooks, schemas
│   ├── public/                       # Static assets
│   └── package.json
│
├── supabase/                         # Database & Backend Infrastructure
│   ├── migrations/                   # PostgreSQL migration files
│   ├── functions/                    # Deno Edge Functions (webhooks, jobs)
│   └── config.toml
│
├── docs/                             # Documentation (organized)
│   ├── architecture/
│   ├── development/
│   ├── phases/
│   ├── testing/
│   └── guides/
│
└── README.md (this file)
```

---

## 🎯 Key Features

### For Students
- 📋 Self-service intake form with document upload
- 🗂️ Secure document vault (transcripts, test scores, recommendations)
- 📍 Real-time application status tracking
- 🔔 Instant notifications on milestones

### For Consultants
- 📊 Real-time Kanban board (6-stage pipeline)
- ⏰ Automated stall detection & audio alerts
- 📞 Interaction logging (calls, emails, WhatsApp)
- 🎯 Performance metrics & conversion tracking

### For Admins
- 👥 Team management & workload balancing
- 📈 Analytics & funnel visualization
- ⚙️ Configurable SLA thresholds
- 🏫 University catalog management

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **Backend** | Supabase (PostgreSQL 16), Deno Edge Functions |
| **Real-Time** | Supabase Realtime (WebSockets) |
| **Auth** | Supabase Auth (PKCE, JWT) |
| **Storage** | Supabase Storage (S3-compatible) |
| **Hosting** | Vercel (frontend), Supabase Cloud (backend) |

---

## 🚀 Deployment

### Development
```bash
npm run dev              # Local development with hot reload
```

### Production
```bash
npm run build            # Build optimized bundle
npm run start            # Start production server
```

Automatic deployment to Vercel on push to `main` branch.

See [SETUP.md](SETUP.md) and [docs/phases/PHASE10/DEPLOYMENT_CHECKLIST.md](docs/phases/PHASE10/DEPLOYMENT_CHECKLIST.md) for detailed procedures.

---

## 📖 Understanding the Architecture

### 3-Domain Model
The platform is divided into three independent portals:

1. **Student Portal** (`/portal/student`)
   - Self-service intake and document upload
   - Real-time progress tracking
   - Notification center

2. **Consultant CRM** (`/crm/consultant`)
   - Live Kanban pipeline board
   - Interaction logging
   - Stall detection & remediation

3. **Admin Dashboard** (`/admin`)
   - Global analytics & reporting
   - Team management
   - Configuration & university catalog

### Real-Time Architecture
- **WebSocket Subscriptions:** Frontend connects to Supabase Realtime
- **Database Publication:** PostgreSQL publishes changes via replication stream
- **Zero-Polling:** UI updates instantly when data changes (no polling)
- **Multi-Tab Sync:** Changes sync across browser tabs automatically

### Security
- **Row-Level Security (RLS):** Authorization enforced at database layer
- **JWT Authentication:** PKCE flow with HTTP-only cookies
- **Encrypted Vault:** Documents stored with anti-tamper metadata
- **Audit Logging:** All operations logged for compliance

For architectural deep-dive, see [docs/architecture/README.md](docs/architecture/README.md).

---

## 🔧 Common Tasks

### Running Tests
```bash
cd frontend
npm run test             # Run test suite
npm run type-check       # TypeScript validation
```

### Creating Migrations
```bash
cd supabase
supabase migration new <name>     # Create migration
supabase db push                   # Apply locally
supabase db push --remote --linked # Apply to production
```

### Updating Dependencies
```bash
cd frontend
npm update
npm audit fix
```

---

## 📋 Development Phases

This project was built incrementally through 10 phases:

- **Phase 3:** Core foundation (schema, auth, CRM)
- **Phase 8–9:** Feature expansion & testing
- **Phase 10:** Security, performance, analytics

See [docs/phases/README.md](docs/phases/README.md) for detailed reports from each phase.

---

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting PRs.

**Key Guidelines:**
- Create feature branches from `main`
- Write tests for new features
- Run `npm run type-check` before committing
- Follow the component patterns in [docs/development/STITCH_UI_UX_PROMPT.md](docs/development/STITCH_UI_UX_PROMPT.md)

---

## 📞 Support

- **Documentation:** See [docs/README.md](docs/README.md)
- **Phase Reports:** See [docs/phases/README.md](docs/phases/README.md)
- **Agent Guide:** See [docs/guides/AGENT_GUIDE.md](docs/guides/AGENT_GUIDE.md)

---

## 📝 License

Proprietary — All rights reserved.

---

## 📊 Project Stats

- **Frontend:** ~15 components, ~30 pages/routes
- **Backend:** ~50 migrations, ~10 Edge Functions
- **Database:** ~15 tables, comprehensive RLS policies
- **Documentation:** ~20 guide documents
- **Development Time:** 10 phases (Sep 2024 – Sep 2026)

**Last Updated:** September 2026 (Phase 10 Completion)
├─────────────────────────┼──────────────────────────────┼─────────────────────────────────────────┤
│ Work 1:                 │ PostgreSQL 16 +              │ Form inserts directly to `leads` table. │
│ Real-Time Ingestion     │ Supabase Realtime Engine     │ PostgreSQL WAL publication broadcasts   │
│                         │ (postgres_changes)           │ row to Consultant WebSocket channel     │
│                         │                              │ without an intermediary application tier│
├─────────────────────────┼──────────────────────────────┼─────────────────────────────────────────┤
│ Work 2:                 │ PostgreSQL Database Webhooks │ Row creation triggers an async HTTP POST│
│ Instant Auto-Response   │ + Deno Supabase Edge         │ to `auto-respond-lead` Edge Function.   │
│                         │ Functions + Resend / Twilio  │ Function formats templates and pushes to│
│                         │                              │ Resend (Email) & Twilio (WhatsApp API). │
├─────────────────────────┼──────────────────────────────┼─────────────────────────────────────────┤
│ Work 3:                 │ Relational PostgreSQL Engine │ 6 strict stages governed by SQL Enum.   │
│ Stage Tracking & Funnel │ + Optimized Materialized SQL │ Relational foreign keys track university│
│                         │ Views & Generated Aggregates │ applications. Optimistic updates in UI  │
│                         │                              │ update state in <50ms.                  │
├─────────────────────────┼──────────────────────────────┼─────────────────────────────────────────┤
│ Work 4:                 │ pg_cron Extension +          │ pg_cron executes a stored procedure     │
│ Stall Reminder Engine   │ Stored SQL Procedures +      │ every minute. Breached rows are flagged,│
│                         │ Realtime Alert Pub/Sub       │ generating a `reminders` entry and      │
│                         │                              │ pushing an audio alert to counselors.   │
└─────────────────────────┴──────────────────────────────┴─────────────────────────────────────────┘
```

### Work 1: Real-Time Ingestion (Zero-Latency Lead Capture)
When a student completes an inquiry or an agency landing form submits, the Next.js frontend posts directly to Supabase via authenticated Server Actions or the client SDK with Row-Level Security:
1. The lead record is written to `public.leads` in PostgreSQL.
2. The PostgreSQL replication stream captures the `INSERT` via the `supabase_realtime` publication.
3. Supabase Realtime multiplexes the change across active WebSocket connections established by consultants.
4. The consultant assigned to that student receives the full payload in `<100ms`, rendering an entry card on their Kanban board and incrementing their active lead count without polling or custom ASGI web servers.

### Work 2: Instant Multi-Channel Auto-Response
Immediate engagement is critical to preventing prospective students from defecting to competing agencies:
1. An `AFTER INSERT` database webhook fires on `public.leads`.
2. Supabase dispatches a payload to a serverless Deno **Edge Function** (`auto-respond-lead`).
3. The Edge Function concurrently executes:
   - **Personalized HTML Email via Resend**: Sends an official onboarding guide, counselor direct contact details, and a magic link to activate their `/portal/student` dashboard.
   - **Direct WhatsApp Notification via Twilio / Meta Cloud API**: Delivers a verified business template containing reference numbers, program summary, and an instant interactive reply button.
4. The Edge Function logs the transmission status into `public.communication_logs`, linking directly to the student record for auditability.

### Work 3: Admission Stage Tracking & Funnel CRM
The agency workflow follows **6 strictly ordered relational stages**:
$$\text{Inquiry} \longrightarrow \text{Counseling} \longrightarrow \text{Document Collection} \longrightarrow \text{Application} \longrightarrow \text{Fee/Verification} \longrightarrow \text{Admitted}$$

```mermaid
stateDiagram-v2
    [*] --> Inquiry: Student Submits Web Portal Inquiry
    Inquiry --> Counseling: Consultant Assigned & Initial Consultation Call
    Counseling --> Document_Collection: Destination & Degree Shortlisted
    Document_Collection --> Application: Transcripts, SOP & IELTS Verified
    Application --> Fee_Verification: University Issues Conditional Offer Letter
    Fee_Verification --> Admitted: Tuition Deposit Paid & Student Visa Approved
    Admitted --> [*]: Successful Placement Milestone Reached
```

- Every stage progression requires database-enforced integrity (foreign keys linking `student_id`, `assigned_consultant_id`, and `target_university_id`).
- Automated database triggers log every stage transition into `public.activity_logs`, recording `previous_stage`, `new_stage`, `changed_by_user_id`, and `dwell_time_seconds`.
- Conversion analytics and drop-off metrics are computed via high-performance database views without taxing the client tier.

### Work 4: Automated Stall Detection & Inactivity Remediation
To eliminate lead drop-offs caused by consultant delays, inactivity tracking is embedded natively in PostgreSQL:
1. The **`pg_cron`** extension schedules execution of `fn_detect_stalled_leads()` every minute.
2. The procedure scans all non-terminal leads and compares:
 
$$
\text{Inactivity Duration} = \text{NOW}() - \max(\texttt{last\_contacted\_at},\ \texttt{updated\_at})
$$
3. If inactivity exceeds the threshold defined in `stage_threshold_configs` for that specific stage, the procedure:
   - Marks the lead `is_stalled = TRUE`.
   - Inserts an actionable entry in `public.reminders`.
   - Records `STALL_DETECTED` in `public.activity_logs`.
4. Supabase Realtime detects the update and pushes a `STALL_ALERT` event down to the consultant's browser, triggering a visual warning badge and playing an audio alert chime.
5. When the consultant logs a call or communication, a trigger automatically sets `is_stalled = FALSE`, resolves the pending reminder, and resets the timer.

---

## 3. The 12-Factor App Methodology Alignment

This serverless Next.js and Supabase architecture is systematically engineered to adhere to the gold standard of cloud-native software: **The Twelve-Factor App**.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 12-FACTOR APP ALIGNMENT MATRIX                                   │
├───────┬───────────────────────────┬──────────────────────────────────────────────────────────────┤
│ No.   │ Factor Name               │ Architectural Realization in Next.js + Supabase              │
├───────┼───────────────────────────┼──────────────────────────────────────────────────────────────┤
│ I     │ One Codebase, One Tracking│ Unified Git monorepo tracking explicit Next.js App Router    │
│       │                           │ domains (/portal/student, /crm/consultant, /admin).          │
│       │                           │ Same repository deployed across Local, Staging, Production.  │
├───────┼───────────────────────────┼──────────────────────────────────────────────────────────────┤
│ II    │ Explicit Dependencies     │ Strict isolation via package.json lockfiles (pnpm-lock.yaml) │
│       │                           │ executed with `npm ci` / `pnpm install --frozen-lockfile`.   │
│       │                           │ Deno Edge Functions declare pinned URL imports (std@0.224.0).│
├───────┼───────────────────────────┼──────────────────────────────────────────────────────────────┤
│ III   │ Config in Environment     │ Zero hardcoded secrets. All credentials injected at runtime  │
│       │                           │ via Vercel and Supabase vaults. Client permissions validated │
│       │                           │ cryptographically via Supabase JWT claims (app_metadata).    │
├───────┼───────────────────────────┼──────────────────────────────────────────────────────────────┤
│ IV    │ Backing Services as       │ PostgreSQL, Supabase Storage, Resend API, and Twilio WhatsApp│
│       │ Attached Resources        │ treated as attached cloud handles swappable via env URLs     │
│       │                           │ without changing application source code.                    │
├───────┼───────────────────────────┼──────────────────────────────────────────────────────────────┤
│ V     │ Strict Build, Release,    │ GitHub Actions CI validates types, runs tests, and creates   │
│       │ Run Separation            │ immutable Next.js builds. Release bundles are versioned and  │
│       │                           │ deployed atomically to Vercel and Supabase Edge infrastructure│
├───────┼───────────────────────────┼──────────────────────────────────────────────────────────────┤
│ VI    │ Stateless Processes       │ Next.js instances run 100% stateless on serverless edge nodes│
│       │                           │ Session state is persisted in encrypted, HTTP-Only cookies;  │
│       │                           │ shared operational state lives in PostgreSQL.                │
├───────┼───────────────────────────┼──────────────────────────────────────────────────────────────┤
│ VII   │ Port Binding              │ Next.js exports self-contained web services by binding to    │
│       │                           │ $PORT (default :3000) locally, while Vercel Serverless binds │
│       │                           │ directly to dynamic HTTP execution runtimes.                 │
├───────┼───────────────────────────┼──────────────────────────────────────────────────────────────┤
│ VIII  │ Concurrency & Scaling     │ Frontend scales horizontally across global edge locations.   │
│       │                           │ Supabase handles DB concurrency via Supavisor connection     │
│       │                           │ pooling, handling thousands of concurrent client requests.   │
├───────┼───────────────────────────┼──────────────────────────────────────────────────────────────┤
│ IX    │ Disposability             │ Serverless Edge Functions spin up in <50ms and shut down     │
│       │                           │ immediately after request resolution. DB transactions use    │
│       │                           │ strict timeouts to prevent connection exhaustion.            │
├───────┼───────────────────────────┼──────────────────────────────────────────────────────────────┤
│ X     │ Dev/Prod Parity           │ Supabase CLI runs exact Docker container versions of         │
│       │                           │ PostgreSQL 16, pg_cron, and Auth locally, eliminating        │
│       │                           │ disparities between developer laptops and production.        │
├───────┼───────────────────────────┼──────────────────────────────────────────────────────────────┤
│ XI    │ Logs as Event Streams     │ Application logs and database write events are treated as    │
│       │                           │ continuous event streams, ingested by Supabase Logflare,     │
│       │                           │ Axiom, or Datadog without local logfile dependencies.        │
├───────┼───────────────────────────┼──────────────────────────────────────────────────────────────┤
│ XII   │ Admin Processes as        │ Database migrations, batch lead re-assignments, and seed     │
│       │ One-Off Tasks             │ routines run as automated CLI tasks (`supabase db push`) or  │
│       │                           │ authenticated isolated scripts, never via ad-hoc UI buttons. │
└───────┴───────────────────────────┴──────────────────────────────────────────────────────────────┘
```

---

## 4. End-to-End System Architecture & Cloud Topology

```mermaid
flowchart TB
    subgraph Client_Tier ["Client Tier (Next.js 15 App Router)"]
        STUDENT_APP["Student Portal (/portal/student)\n- KYC & Preferences\n- Document Upload Vault\n- Placement Tracker"]
        CONSULTANT_CRM["Consultant CRM (/crm/consultant)\n- 6-Stage Real-Time Kanban\n- Interaction Logger\n- Audio Alert Chime Listener"]
        ADMIN_PORTAL["Super-Admin (/admin)\n- Workload & Placement Analytics\n- Dynamic Stall Threshold Config\n- University Catalog Manager"]
        DEMO_SPLIT["Demo Presentation Suite (/demo/split)\n- Side-by-Side Ingestion & CRM\n- Interactive Stall Simulator"]
    end

    subgraph Edge_Gateway ["Edge Gateway & Ingress Layer (Vercel & Next.js Middleware)"]
        MW["Next.js SSR Middleware\n- Session Validation (@supabase/ssr)\n- JWT Role RBAC Route Guard\n- Security Headers (CSP, CORS)"]
        SERVER_ACTIONS["Next.js Server Actions\n- Safe Mutation Gateway\n- Form Input Validation (Zod)"]
    end

    subgraph Supabase_Cloud ["Supabase Managed Cloud Infrastructure"]
        AUTH["Supabase Auth Service\n- PKCE Session Tokens\n- Role Claims Injection"]
        
        subgraph Realtime_PubSub ["Realtime Engine (Elixir / Phoenix)"]
            WS_BROADCASTER["WebSocket Multiplexer\n- postgres_changes Publisher\n- Consultant Channel Filters"]
        end

        subgraph Postgres_Core ["PostgreSQL 16 Engine"]
            RLS["Row-Level Security (RLS) Engine\n- Tenant Isolation\n- Role Boundaries"]
            
            subgraph Tables ["Relational Storage"]
                T_PROFILES[("profiles\n(Users, Roles, Branches)")]
                T_LEADS[("leads\n(Student Applications)")]
                T_DOCS[("documents\n(Academic Portfolios)")]
                T_LOGS[("activity_logs\n(Audit Trail)")]
                T_COMM[("communication_logs\n(Email & WhatsApp Status)")]
                T_REM[("reminders\n(Stall Warnings)")]
                T_CONF[("stage_threshold_configs\n(SLA Rules)")]
            end

            PG_CRON["pg_cron Scheduler\n- Inactivity Evaluator (every 1m)\n- Breach Flagging Engine"]
            DB_TRIGGER["Database Webhooks\n- AFTER INSERT on public.leads"]
        end

        STORAGE_BUCKET[("Supabase Storage\n(S3-Compatible Bucket: 'student-docs')\n- Signed URLs (60m expiry)\n- MIME-type whitelisting")]
    end

    subgraph Serverless_Edge_Compute ["Serverless Edge Compute (Deno Runtime)"]
        EF_AUTORESPOND["Edge Function: auto-respond-lead\n- Payload Verification\n- Multi-Channel Formatting"]
        EF_STALLNOTIF["Edge Function: send-stall-digest\n- Daily Counselor Summary"]
    end

    subgraph External_Comms ["External Communication Gateways"]
        RESEND["Resend API\n(Transactional HTML Email)"]
        TWILIO["Twilio / Meta Cloud API\n(Interactive WhatsApp Message)"]
    end

    %% Client to Edge
    STUDENT_APP --> MW
    CONSULTANT_CRM --> MW
    ADMIN_PORTAL --> MW
    DEMO_SPLIT --> MW

    MW --> SERVER_ACTIONS
    SERVER_ACTIONS -->|Direct Postgres Query with RLS| Postgres_Core
    STUDENT_APP -->|Direct S3 Upload with Signed URL| STORAGE_BUCKET

    %% Realtime
    Postgres_Core -->|"Replication Stream (WAL)"| WS_BROADCASTER
    WS_BROADCASTER -.->|Bi-directional WebSockets| CONSULTANT_CRM
    WS_BROADCASTER -.->|Bi-directional WebSockets| DEMO_SPLIT

    %% Webhook to Edge Function
    DB_TRIGGER -->|"Async HTTP POST (Signed)"| EF_AUTORESPOND
    EF_AUTORESPOND -->|Send Email| RESEND
    EF_AUTORESPOND -->|Send WhatsApp| TWILIO
    EF_AUTORESPOND -->|Log Result with Service Key| T_COMM

    %% Cron
    PG_CRON -->|"Executes fn_detect_stalled_leads()"| T_LEADS
    PG_CRON -->|Creates Reminder Row| T_REM
```

---

## 5. Low-Level Sequence Diagrams

### 5.1 Sequence 1: Student Submission → Supabase Ingestion → Realtime Sync & Auto-Response

```mermaid
sequenceDiagram
    autonumber
    actor Student as Prospective Student
    participant Portal as Next.js Student Portal
    participant SupaDB as Supabase PostgreSQL
    participant RT as Supabase Realtime Engine
    participant CRM as Consultant CRM (Kanban)
    participant WH as Database Webhook
    participant EdgeFn as Edge Function (auto-respond-lead)
    participant Resend as Resend Email Gateway
    participant Twilio as Twilio WhatsApp API

    Student->>Portal: Fills Profile, Target Country & Degree Program
    Portal->>SupaDB: INSERT INTO public.leads (student_id, target_country, stage='Inquiry')
    Note over SupaDB: RLS verifies authenticated student or creates verified lead
    
    par Real-Time Broadcast
        SupaDB->>RT: WAL Replication Event (INSERT on public.leads)
        RT->>CRM: WebSocket Push: postgres_changes {eventType: 'INSERT', new: {...}}
        CRM->>CRM: Play Audio Chime + Prepend Card to "Inquiry" Column
    and Database Webhook Execution
        SupaDB->>WH: Trigger on_lead_created
        WH->>EdgeFn: POST https://project.supabase.co/functions/v1/auto-respond-lead
        activate EdgeFn
        EdgeFn->>Resend: POST /emails (Welcome Dossier & Advisor Contact)
        EdgeFn->>Twilio: POST /Messages (WhatsApp Template with Action Buttons)
        EdgeFn->>SupaDB: INSERT INTO public.communication_logs (status='delivered')
        deactivate EdgeFn
    end

    SupaDB-->>Portal: 201 Created (lead_id: UUID)
    Portal-->>Student: Display Application Milestone Dashboard
```

### 5.2 Sequence 2: Scheduled Stall Evaluation, Alerting & Counselor Resolution

```mermaid
sequenceDiagram
    autonumber
    participant Cron as PostgreSQL pg_cron (Every 60s)
    participant SQLProc as Procedure: fn_detect_stalled_leads()
    participant LeadsTable as Table: public.leads
    participant RemTable as Table: public.reminders
    participant RT as Supabase Realtime
    actor Consultant as Assigned Educational Counselor
    participant CRM as Consultant CRM Dashboard

    Cron->>SQLProc: EXECUTE fn_detect_stalled_leads()
    activate SQLProc
    SQLProc->>LeadsTable: SELECT leads WHERE stage != 'Admitted' AND is_stalled = FALSE
    loop For Every Active Lead
        SQLProc->>SQLProc: Calculate: NOW() - COALESCE(last_contacted_at, updated_at)
        alt Inactivity > Stage Config Threshold (e.g. Counseling > 48h)
            SQLProc->>LeadsTable: UPDATE leads SET is_stalled = TRUE, reminder_status = 'PENDING'
            SQLProc->>RemTable: INSERT INTO reminders (lead_id, consultant_id, hours_inactive)
        end
    end
    deactivate SQLProc

    LeadsTable->>RT: WAL Replication Event (UPDATE on public.leads)
    RT->>CRM: WebSocket Push: {eventType: 'UPDATE', new: {is_stalled: true, ...}}
    CRM->>Consultant: Highlight Card in Amber/Red + Play Audio Alert
    
    Consultant->>CRM: Opens Lead Drawer & Clicks "Log Phone Consultation"
    CRM->>LeadsTable: UPDATE leads SET last_contacted_at = NOW(), is_stalled = FALSE
    LeadsTable->>RemTable: UPDATE reminders SET is_resolved = TRUE, resolved_at = NOW()
    LeadsTable->>RT: WAL Replication Event (UPDATE is_stalled: false)
    RT->>CRM: WebSocket Push: Update Card State (Clear Warning Badge)
```

---

## 6. Complete PostgreSQL Relational Database Schema & Data Models

The entire persistence tier is executed in PostgreSQL 16 using native UUIDs, TIMESTAMPTZ, JSONB for metadata flexibility, and strict foreign keys.

```mermaid
erDiagram
    PROFILES ||--o{ LEADS : "assigned_to_consultant"
    PROFILES ||--o{ LEADS : "student_applicant"
    UNIVERSITIES ||--o{ PROGRAMS : "offers"
    PROGRAMS ||--o{ LEADS : "applied_for"
    LEADS ||--o{ DOCUMENTS : "attaches"
    LEADS ||--o{ ACTIVITY_LOGS : "generates"
    LEADS ||--o{ COMMUNICATION_LOGS : "receives"
    LEADS ||--o{ REMINDERS : "triggers"
    STAGE_THRESHOLD_CONFIGS ||--o{ LEADS : "governs_sla"

    PROFILES {
        uuid id PK
        string email
        string full_name
        string role "student | consultant | super_admin"
        string phone
        string branch_location
        timestamptz created_at
    }

    UNIVERSITIES {
        uuid id PK
        string name
        string country
        string city
        string partnership_tier
        boolean is_active
    }

    PROGRAMS {
        uuid id PK
        uuid university_id FK
        string degree_level "BSc | MSc | MBA | PhD"
        string program_name
        numeric annual_tuition_usd
        string intake_seasons
    }

    LEADS {
        uuid id PK
        uuid student_id FK
        uuid assigned_consultant_id FK
        uuid program_id FK
        string target_country
        string stage "Inquiry..Admitted"
        boolean is_stalled
        string reminder_status
        jsonb metadata "IELTS, GPA, Budget"
        timestamptz last_contacted_at
        timestamptz created_at
        timestamptz updated_at
    }

    DOCUMENTS {
        uuid id PK
        uuid lead_id FK
        string document_type "TRANSCRIPT | IELTS | PASSPORT | SOP"
        string storage_path
        string verification_status "PENDING | VERIFIED | REJECTED"
        timestamptz uploaded_at
    }

    ACTIVITY_LOGS {
        uuid id PK
        uuid lead_id FK
        uuid actor_id FK
        string action_type
        jsonb change_payload
        timestamptz created_at
    }

    COMMUNICATION_LOGS {
        uuid id PK
        uuid lead_id FK
        string channel "EMAIL | WHATSAPP"
        string recipient
        string template_id
        string status "QUEUED | DELIVERED | FAILED"
        timestamptz sent_at
    }

    REMINDERS {
        uuid id PK
        uuid lead_id FK
        uuid consultant_id FK
        string stage_at_stall
        numeric hours_inactive
        boolean is_resolved
        timestamptz created_at
        timestamptz resolved_at
    }

    STAGE_THRESHOLD_CONFIGS {
        uuid id PK
        string stage PK
        integer threshold_hours
        string severity
    }
```

### 6.1 Database Schema DDL (`supabase/migrations/20260911000001_core_schema.sql`)

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Create Enums
CREATE TYPE user_role AS ENUM ('student', 'consultant', 'super_admin');
CREATE TYPE admission_stage AS ENUM (
    'Inquiry', 
    'Counseling', 
    'Document Collection', 
    'Application', 
    'Fee/Verification', 
    'Admitted'
);
CREATE TYPE doc_type AS ENUM ('TRANSCRIPT', 'IELTS_SCORECARD', 'PASSPORT', 'STATEMENT_OF_PURPOSE', 'RESUME');
CREATE TYPE doc_status AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE comm_channel AS ENUM ('EMAIL', 'WHATSAPP', 'SMS');
CREATE TYPE comm_status AS ENUM ('QUEUED', 'DELIVERED', 'FAILED', 'READ');

-- 1. Profiles Table (Linked to Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    phone TEXT,
    branch_location TEXT DEFAULT 'Global Online',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 2. Partner Universities & Degree Programs Catalog
CREATE TABLE public.universities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    city TEXT NOT NULL,
    ranking_global INTEGER,
    partnership_tier TEXT DEFAULT 'Standard', -- 'Standard', 'Preferred', 'Direct Agreement'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE public.programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    program_name TEXT NOT NULL,
    degree_level TEXT NOT NULL, -- 'BSc', 'MSc', 'MBA', 'Diploma'
    annual_tuition_usd NUMERIC(10, 2),
    intake_seasons TEXT[] DEFAULT ARRAY['Fall', 'Spring'],
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Leads (Student Applications Pipeline)
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_consultant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
    target_country TEXT NOT NULL,
    stage admission_stage NOT NULL DEFAULT 'Inquiry',
    is_stalled BOOLEAN NOT NULL DEFAULT FALSE,
    reminder_status TEXT NOT NULL DEFAULT 'NONE', -- 'NONE', 'PENDING', 'RESOLVED'
    notes TEXT,
    metadata JSONB DEFAULT '{
        "gpa": null,
        "ielts_overall": null,
        "target_intake": "Fall 2027",
        "budget_range_usd": "25k-40k"
    }'::jsonb,
    last_contacted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Indexes for performance
CREATE INDEX idx_leads_student ON public.leads(student_id);
CREATE INDEX idx_leads_consultant ON public.leads(assigned_consultant_id);
CREATE INDEX idx_leads_stage ON public.leads(stage);
CREATE INDEX idx_leads_stalled ON public.leads(is_stalled) WHERE is_stalled = TRUE;
CREATE INDEX idx_leads_updated ON public.leads(updated_at);

-- 4. Academic Documents Vault
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    document_type doc_type NOT NULL,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    verification_status doc_status NOT NULL DEFAULT 'PENDING',
    review_notes TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 5. Activity Audit Trail
CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL, -- 'CREATED', 'STAGE_TRANSITION', 'NOTE_ADDED', 'CALL_LOGGED', 'STALL_TRIGGERED'
    details TEXT NOT NULL,
    change_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 6. Communication Logs
CREATE TABLE public.communication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    channel comm_channel NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT,
    content_snippet TEXT NOT NULL,
    external_message_id TEXT,
    status comm_status NOT NULL DEFAULT 'QUEUED',
    sent_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 7. Stall Reminders
CREATE TABLE public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    consultant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    stage_at_stall admission_stage NOT NULL,
    hours_inactive NUMERIC(6, 1) NOT NULL,
    message TEXT NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    resolved_at TIMESTAMPTZ
);

-- 8. Configurable Stage SLA Thresholds
CREATE TABLE public.stage_threshold_configs (
    stage                      admission_stage PRIMARY KEY,
    threshold_hours            INTEGER NOT NULL,
    -- escalation_threshold_hours: how many hours after the FIRST stall flag
    -- before the lead escalates to the super-admin D1 attention list.
    -- Fee/Verification gets 2h (tighter — missed offer deadlines are irreversible).
    -- All other stages default to 4h (filters out self-resolving stalls).
    escalation_threshold_hours INTEGER NOT NULL DEFAULT 4,
    severity                   TEXT NOT NULL DEFAULT 'MEDIUM',
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Seed Default SLA Thresholds
-- escalation_threshold_hours defines when admin D1 attention list shows the lead
-- (separate from threshold_hours which defines when the consultant first gets alerted)
INSERT INTO public.stage_threshold_configs
    (stage, threshold_hours, escalation_threshold_hours, severity) VALUES
('Inquiry',             24,     4, 'HIGH'),
('Counseling',          48,     4, 'MEDIUM'),
('Document Collection', 72,     4, 'MEDIUM'),
('Application',         48,     4, 'HIGH'),
('Fee/Verification',    24,     2, 'CRITICAL'),  -- 2h escalation — deadline-sensitive
('Admitted',            999999, 999, 'NONE');
```

---

### 6.2 Complete Row-Level Security (RLS) Policies

Row-Level Security guarantees zero data leakage across our multi-tenant 3-role persona model. All queries are evaluated dynamically against the cryptographically verified `auth.jwt()`.

```sql
-- Enable RLS across all sensitive tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_threshold_configs ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current user is Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
    );
$$;

-- Helper function: Check if current user is Consultant
CREATE OR REPLACE FUNCTION public.is_consultant()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'consultant'
    );
$$;

--------------------------------------------------------------------------------
-- 1. PROFILES POLICIES
--------------------------------------------------------------------------------
-- Users can view their own profile
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_super_admin() OR public.is_consultant());

-- Users can update only their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

--------------------------------------------------------------------------------
-- 2. LEADS POLICIES (CORE 3-ROLE ENFORCEMENT)
--------------------------------------------------------------------------------
-- Role 1 (Student): Read own application records
CREATE POLICY "Students can view own applications"
    ON public.leads FOR SELECT
    USING (auth.uid() = student_id);

-- Role 1 (Student): Create inquiry
CREATE POLICY "Students can insert own application"
    ON public.leads FOR INSERT
    WITH CHECK (auth.uid() = student_id);

-- Role 2 (Consultant): View assigned student leads
CREATE POLICY "Consultants can view assigned leads"
    ON public.leads FOR SELECT
    USING (auth.uid() = assigned_consultant_id);

-- Role 2 (Consultant): Update stage, notes, and contact time for assigned leads
CREATE POLICY "Consultants can update assigned leads"
    ON public.leads FOR UPDATE
    USING (auth.uid() = assigned_consultant_id);

-- Role 3 (Super Admin): Full unrestricted access
CREATE POLICY "Super Admins have full access to leads"
    ON public.leads FOR ALL
    USING (public.is_super_admin());

--------------------------------------------------------------------------------
-- 3. DOCUMENTS VAULT POLICIES
--------------------------------------------------------------------------------
-- Students can view their uploaded files
CREATE POLICY "Students view own documents"
    ON public.documents FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.leads 
        WHERE leads.id = documents.lead_id AND leads.student_id = auth.uid()
    ));

-- Students can insert documents for their applications
CREATE POLICY "Students upload documents to own applications"
    ON public.documents FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.leads 
        WHERE leads.id = documents.lead_id AND leads.student_id = auth.uid()
    ));

-- Consultants can review documents for assigned students
CREATE POLICY "Consultants view assigned student documents"
    ON public.documents FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.leads 
        WHERE leads.id = documents.lead_id AND leads.assigned_consultant_id = auth.uid()
    ));

CREATE POLICY "Consultants verify assigned student documents"
    ON public.documents FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.leads 
        WHERE leads.id = documents.lead_id AND leads.assigned_consultant_id = auth.uid()
    ));

-- Super Admin: Full documents access
CREATE POLICY "Admins full document access"
    ON public.documents FOR ALL
    USING (public.is_super_admin());

--------------------------------------------------------------------------------
-- 4. REMINDERS POLICIES
--------------------------------------------------------------------------------
-- Consultants can view and resolve their own reminders
CREATE POLICY "Consultants manage own reminders"
    ON public.reminders FOR ALL
    USING (auth.uid() = consultant_id OR public.is_super_admin());
```

---

### 6.3 Automation Procedures, Triggers, & pg_cron Scheduling

```sql
--------------------------------------------------------------------------------
-- 1. Automatic Timestamp & Stage Transition Audit Trigger
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_audit_lead_changes()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    
    -- Detect stage change and record audit log
    IF (OLD.stage IS DISTINCT FROM NEW.stage) THEN
        INSERT INTO public.activity_logs (
            lead_id, 
            actor_id, 
            action_type, 
            details,
            change_payload
        ) VALUES (
            NEW.id,
            auth.uid(),
            'STAGE_TRANSITION',
            FORMAT('Stage moved from %s to %s', OLD.stage, NEW.stage),
            jsonb_build_object('old_stage', OLD.stage, 'new_stage', NEW.stage)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_audit_lead_changes
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_audit_lead_changes();

--------------------------------------------------------------------------------
-- 2. Stored Procedure: Inactivity & Stall Evaluator (Executed by pg_cron)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_detect_stalled_leads()
RETURNS void AS $$
DECLARE
    r RECORD;
    v_threshold INTEGER;
    v_hours_inactive NUMERIC;
    v_now TIMESTAMPTZ := TIMEZONE('utc', NOW());
BEGIN
    -- Query all active, non-admitted leads that are not currently marked stalled
    FOR r IN 
        SELECT l.id, l.student_id, l.assigned_consultant_id, l.stage,
               p.full_name AS student_name,
               COALESCE(l.last_contacted_at, l.updated_at) AS reference_time
        FROM public.leads l
        JOIN public.profiles p ON l.student_id = p.id
        WHERE l.stage != 'Admitted' AND l.is_stalled = FALSE
    LOOP
        -- Fetch threshold for this specific stage
        SELECT threshold_hours INTO v_threshold
        FROM public.stage_threshold_configs
        WHERE stage = r.stage;

        IF v_threshold IS NOT NULL THEN
            -- Calculate elapsed hours
            v_hours_inactive := ROUND(EXTRACT(EPOCH FROM (v_now - r.reference_time)) / 3600.0, 1);

            IF v_hours_inactive >= v_threshold THEN
                -- 1. Mark the lead as stalled
                UPDATE public.leads 
                SET is_stalled = TRUE, 
                    reminder_status = 'PENDING',
                    updated_at = v_now
                WHERE id = r.id;

                -- 2. Insert reminder if no active unresolved reminder exists
                IF NOT EXISTS (
                    SELECT 1 FROM public.reminders 
                    WHERE lead_id = r.id AND stage_at_stall = r.stage AND is_resolved = FALSE
                ) THEN
                    INSERT INTO public.reminders (
                        lead_id,
                        consultant_id,
                        stage_at_stall,
                        hours_inactive,
                        message
                    ) VALUES (
                        r.id,
                        r.assigned_consultant_id,
                        r.stage,
                        v_hours_inactive,
                        FORMAT('SLA Breach: %s has been inactive in %s for %s hours. Urgent advisory contact required.', 
                               r.student_name, r.stage, v_hours_inactive)
                    );

                    -- 3. Log audit event
                    INSERT INTO public.activity_logs (
                        lead_id,
                        actor_id,
                        action_type,
                        details
                    ) VALUES (
                        r.id,
                        NULL,
                        'STALL_TRIGGERED',
                        FORMAT('Automated SLA breach detected: %s hrs inactive in %s', v_hours_inactive, r.stage)
                    );
                END IF;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

--------------------------------------------------------------------------------
-- 3. Schedule with pg_cron (Every 60 Seconds in Production)
--------------------------------------------------------------------------------
SELECT cron.schedule(
    'evaluate-stalled-leads-every-minute',
    '* * * * *',
    'SELECT public.fn_detect_stalled_leads();'
);
```

---

## 7. Supabase Realtime Protocol & WebSocket Subscriptions

The platform uses native **Supabase Realtime** backed by PostgreSQL's logical replication stream (`wal2json` / `pgoutput`). Consultants and operators establish persistent WebSocket connections authenticated via Supabase JWTs.

### 7.1 Enable Table Replication
```sql
-- Register sensitive tables with the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reminders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_logs;
-- communication_logs: required for the Auto-Response Sandbox in /demo/split
-- and for real-time delivery status updates in the student portal (§10, Moment 2)
```

### 7.2 Realtime Subscription Payloads

#### Payload 1: `NEW_LEAD` (`INSERT` on `public.leads`)
```json
{
  "schema": "public",
  "table": "leads",
  "commit_timestamp": "2026-09-11T04:15:20.123Z",
  "eventType": "INSERT",
  "new": {
    "id": "7b6b1580-c247-495d-bca7-eef4d2f09101",
    "student_id": "99ea7cb1-4475-476c-8eb1-46bb9e2bf405",
    "assigned_consultant_id": "a4d33932-d85c-4a3e-b52b-7c001e4a1122",
    "program_id": "3c3ef841-8608-4bf8-bfa3-0d1275bbfa88",
    "target_country": "Canada",
    "stage": "Inquiry",
    "is_stalled": false,
    "reminder_status": "NONE",
    "metadata": {
      "gpa": "3.85",
      "ielts_overall": "7.5",
      "target_intake": "Fall 2027"
    },
    "last_contacted_at": null,
    "created_at": "2026-09-11T04:15:20.100Z",
    "updated_at": "2026-09-11T04:15:20.100Z"
  },
  "old": null,
  "errors": null
}
```

#### Payload 2: `STALL_ALERT` (`UPDATE` on `public.leads`)
```json
{
  "schema": "public",
  "table": "leads",
  "commit_timestamp": "2026-09-11T04:16:00.005Z",
  "eventType": "UPDATE",
  "new": {
    "id": "7b6b1580-c247-495d-bca7-eef4d2f09101",
    "stage": "Counseling",
    "is_stalled": true,
    "reminder_status": "PENDING",
    "updated_at": "2026-09-11T04:16:00.000Z"
  },
  "old": {
    "id": "7b6b1580-c247-495d-bca7-eef4d2f09101",
    "is_stalled": false,
    "reminder_status": "NONE"
  }
}
```

### 7.3 Production Client-Side Subscription Hook (`src/hooks/useSupabaseRealtime.ts`)
Handles strict channel unsubscription, memory leak prevention, optimistic updates, and audio chime triggering:

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/services/supabase/client';
import type { Lead } from '@/types/database';

interface RealtimeConfig {
  consultantId?: string;
  onLeadInsert?: (lead: Lead) => void;
  onLeadUpdate?: (lead: Lead) => void;
  onStallBreach?: (lead: Lead) => void;
}

export function useSupabaseRealtime({
  consultantId,
  onLeadInsert,
  onLeadUpdate,
  onStallBreach,
}: RealtimeConfig) {
  const supabase = createClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Lazy-load alert sound chime
    audioRef.current = new Audio('/audio/lead-chime.mp3');

    // Scoped channel filter: Listen only to relevant events
    const filter = consultantId
      ? `assigned_consultant_id=eq.${consultantId}`
      : undefined;

    const channel = supabase
      .channel('consultant-crm-pipeline')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter,
        },
        (payload) => {
          const newLead = payload.new as Lead;
          audioRef.current?.play().catch(() => {}); // Graceful handling of browser autoplay policies
          onLeadInsert?.(newLead);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
          filter,
        },
        (payload) => {
          const updatedLead = payload.new as Lead;
          if (updatedLead.is_stalled && !payload.old?.is_stalled) {
            audioRef.current?.play().catch(() => {});
            onStallBreach?.(updatedLead);
          }
          onLeadUpdate?.(updatedLead);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.info('Connected to Supabase Realtime Pipeline Channel');
        }
      });

    // Mandatory clean-up to prevent duplicate event subscriptions
    return () => {
      supabase.removeChannel(channel);
    };
  }, [consultantId, onLeadInsert, onLeadUpdate, onStallBreach]);
}
```

---

## 8. Serverless Edge Functions & Auto-Response Engine

Supabase Edge Functions are powered by the **Deno** runtime, running globally at the edge with cold-start times under 50 milliseconds.

```mermaid
flowchart LR
    LEAD_INSERT[("New Lead Created<br/>(public.leads)")] -->|Postgres Webhook| EDGE_FN["Deno Edge Function<br/>(auto-respond-lead)"]
    
    subgraph Edge_Function_Internal ["Edge Function Pipeline"]
        EDGE_FN --> VERIFY["Verify Webhook Signature"]
        VERIFY --> TEMPLATE["Render HTML & WhatsApp Templates"]
        TEMPLATE --> PAR_DISPATCH["Parallel Dispatch"]
    end

    PAR_DISPATCH -->|Async HTTPS POST| RESEND["Resend API<br/>(HTML Email Dossier)"]
    PAR_DISPATCH -->|Async HTTPS POST| TWILIO["Twilio API<br/>(WhatsApp Message)"]

    RESEND --> LOG_DB[("Insert into<br/>public.communication_logs")]
    TWILIO --> LOG_DB
```

### 8.1 Edge Function Implementation (`supabase/functions/auto-respond-lead/index.ts`)

```typescript
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Service Role client to bypass RLS for internal logging
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    const payload = await req.json();
    const { record: lead } = payload; // Supabase Webhook payload format

    if (!lead || !lead.id) {
      return new Response("Missing lead record", { status: 400 });
    }

    // Fetch student profile details
    const { data: student, error: studentErr } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name, phone")
      .eq("id", lead.student_id)
      .single();

    if (studentErr || !student) {
      throw new Error(`Student not found: ${studentErr?.message}`);
    }

    // Parallel Outbound Execution: Resend Email + Twilio WhatsApp
    const [emailRes, whatsappRes] = await Promise.allSettled([
      // 1. Send HTML Email via Resend
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Global Admissions Office <admissions@apexcrm.com>",
          to: student.email,
          subject: `Application Dossier Received – Welcome, ${student.full_name}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2>Welcome to Global Study Admissions, ${student.full_name}!</h2>
              <p>Your admission inquiry for target destination <strong>${lead.target_country}</strong> has been registered with Reference ID: <code>#${lead.id}</code>.</p>
              <p>Your designated Educational Advisor will contact you within 24 hours to schedule your preliminary university matching interview.</p>
              <p><a href="https://apexcrm.com/portal/student" style="background:#2563eb;color:#fff;padding:10px 18px;text-decoration:none;border-radius:6px;display:inline-block;">Access Student Portal</a></p>
            </div>
          `,
        }),
      }),

      // 2. Send WhatsApp Notification via Twilio
      student.phone
        ? fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
            method: "POST",
            headers: {
              Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              From: `whatsapp:${TWILIO_PHONE_NUMBER}`,
              To: `whatsapp:${student.phone}`,
              Body: `🎓 *Admissions Dossier Confirmed, ${student.full_name}!*\n\nWe received your inquiry for ${lead.target_country} (Ref: #${lead.id.substring(0, 8)}).\n\nYour assigned consultant is reviewing university admission requirements. Access your portal to upload marksheets and IELTS scorecards.`,
            }),
          })
        : Promise.resolve(null),
    ]);

    // Record Logs in public.communication_logs
    await supabaseAdmin.from("communication_logs").insert([
      {
        lead_id: lead.id,
        channel: "EMAIL",
        recipient: student.email,
        subject: `Application Dossier Received – Welcome, ${student.full_name}`,
        content_snippet: `Welcome dossier dispatched with ID #${lead.id}`,
        status: emailRes.status === "fulfilled" ? "DELIVERED" : "FAILED",
      },
      ...(student.phone
        ? [
            {
              lead_id: lead.id,
              channel: "WHATSAPP",
              recipient: student.phone,
              subject: "WhatsApp Instant Acknowledgement",
              content_snippet: `WhatsApp notification dispatched to ${student.phone}`,
              status: whatsappRes.status === "fulfilled" ? "DELIVERED" : "FAILED",
            },
          ]
        : []),
    ]);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
```

---

## 9. Next.js 15 Application Frontend Architecture

The frontend is structured around the **Next.js 15 App Router** leveraging React 19 Server Components, SSR Cookie Validation (`@supabase/ssr`), and optimistic client components for Kanban operations.

### 9.1 Middleware Authentication & RBAC Guard (`src/middleware.ts`)
Protects routes, refreshes auth session cookies, and directs users according to their persona role:

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh auth session
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // Unauthenticated users attempting to access protected domains
  if (!user && (path.startsWith('/portal') || path.startsWith('/crm') || path.startsWith('/admin'))) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  if (user) {
    // Fetch profile role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role;

    // RBAC Route Boundary Enforcement
    if (path.startsWith('/admin') && role !== 'super_admin') {
      return NextResponse.redirect(new URL('/crm/consultant', request.url));
    }

    if (path.startsWith('/crm') && role === 'student') {
      return NextResponse.redirect(new URL('/portal/student', request.url));
    }

    if (path.startsWith('/portal') && (role === 'consultant' || role === 'super_admin')) {
      // Allow agency staff to preview student portal or redirect
    }
  }

  return response;
}

export const config = {
  matcher: ['/portal/:path*', '/crm/:path*', '/admin/:path*'],
};
```

### 9.2 Optimistic UI Kanban Implementation (`src/components/crm/PipelineKanban.tsx`)
Enables drag-and-drop or one-click stage movements with **0ms UI latency** using optimistic React state updates with automatic rollback on network failure:

```tsx
'use client';

import React, { useOptimistic, useTransition } from 'react';
import { updateLeadStageAction } from '@/app/actions/leadActions';
import type { Lead, AdmissionStage } from '@/types/database';

const STAGES: AdmissionStage[] = [
  'Inquiry',
  'Counseling',
  'Document Collection',
  'Application',
  'Fee/Verification',
  'Admitted',
];

interface KanbanProps {
  initialLeads: Lead[];
}

export function PipelineKanban({ initialLeads }: KanbanProps) {
  const [, startTransition] = useTransition();

  // Optimistic UI state handler
  const [optimisticLeads, setOptimisticLeads] = useOptimistic(
    initialLeads,
    (state, update: { leadId: string; newStage: AdmissionStage }) => {
      return state.map((lead) =>
        lead.id === update.leadId ? { ...lead, stage: update.newStage } : lead
      );
    }
  );

  const handleStageMove = async (leadId: string, newStage: AdmissionStage) => {
    // 1. Instant Optimistic Render (0ms perceived latency)
    startTransition(() => {
      setOptimisticLeads({ leadId, newStage });
    });

    // 2. Asynchronous Server Action Execution
    const result = await updateLeadStageAction(leadId, newStage);
    if (!result.success) {
      alert(`Failed to update stage: ${result.error}`);
      // State automatically rolls back if server action fails
    }
  };

  return (
    <div className="grid grid-cols-6 gap-4 overflow-x-auto pb-4">
      {STAGES.map((stage) => {
        const stageLeads = optimisticLeads.filter((l) => l.stage === stage);
        return (
          <div key={stage} className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{stage}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                {stageLeads.length}
              </span>
            </div>
            
            <div className="space-y-2 min-h-[400px]">
              {stageLeads.map((lead) => (
                <div
                  key={lead.id}
                  className={`p-3 rounded-lg border transition-all ${
                    lead.is_stalled 
                      ? 'bg-red-950/40 border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.2)]' 
                      : 'bg-slate-800/80 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  <div className="text-sm font-medium text-white">{lead.metadata?.student_name || 'Student Lead'}</div>
                  <div className="text-xs text-slate-400 mt-1">Target: {lead.target_country}</div>
                  
                  {lead.is_stalled && (
                    <div className="mt-2 text-[10px] font-bold text-red-400 bg-red-900/50 px-2 py-0.5 rounded border border-red-500/40 inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                      STALL BREACH
                    </div>
                  )}

                  {/* Stage Shift Button */}
                  <button
                    onClick={() => {
                      const nextStageIdx = STAGES.indexOf(stage) + 1;
                      if (nextStageIdx < STAGES.length) {
                        handleStageMove(lead.id, STAGES[nextStageIdx]);
                      }
                    }}
                    className="mt-3 w-full py-1 text-[11px] bg-slate-700/60 hover:bg-slate-700 text-slate-300 rounded transition"
                  >
                    Advance Stage →
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

---

## 10. Presentation & Demo Suite

The platform ships with a dedicated **Side-by-Side Presentation Mode** at `/demo/split` built specifically to demonstrate the four moments the marketing team needs to show live: real-time lead capture, instant multi-channel auto-response, the visual pipeline funnel, and automated stall detection firing end-to-end.

This route is never shown to students or consultants in production. It exists solely for pitching the platform to agency clients.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                         SIDE-BY-SIDE PRESENTATION MODE  (/demo/split)                       │
│                    "The Four Moments" — Marketing Demo Sequence                             │
├──────────────────────────────────────────┬──────────────────────────────────────────────────┤
│  LEFT PANEL: Student Inquiry Side        │  RIGHT PANEL: Live Consultant CRM                │
│                                          │                                                  │
│  [ Student Form — pre-filled ]           │  ● WEBSOCKET CONNECTED          [Eucalyptus dot] │
│  Name:    Kwame Asante-Mensah            │                                                  │
│  Email:   kwame@example.com              │  MOMENT 3 — Funnel View (on load):               │
│  Phone:   +233 55 012 3456              │  ┌──────────────────────────────────────────────┐ │
│  Target:  Canada, UK                    │  │ Inquiry(3) Counsel(4) Docs(2) App(3) Fee(1)  │ │
│  Program: MSc Data Science              │  │ ← 10 pre-seeded leads across all stages      │ │
│                                          │  └──────────────────────────────────────────────┘ │
│  [ SUBMIT →  ]                           │                                                  │
│                                          │  MOMENT 1 (after submit, <100ms):               │
│  ─────────────────────────────────────   │  → New card slides into Inquiry column           │
│  MOMENT 2 — Auto-Response Sandbox:       │  → Audio chime plays                            │
│  ┌───────────────────────────────────┐   │                                                  │
│  │ Email: ✓ Delivered  (Resend)      │   │  DEMO TOOLBAR:                                  │
│  │ WhatsApp: ✓ Delivered  (Twilio)   │   │  [ Seed 10 Leads ] [ Age Lead –3d ] [ Run Cron ]│
│  │ [ Preview email ] [ Preview WA ]  │   │                                                  │
│  └───────────────────────────────────┘   │  MOMENT 4 (after Age + Run Cron):               │
│                                          │  → Brick pulsing dot appears on aged card        │
│                                          │  → "72h inactive in Counseling"                  │
│                                          │  → [ Log Contact → clears stall instantly ]      │
└──────────────────────────────────────────┴──────────────────────────────────────────────────┘
```

---

### The Four Demo Moments — What Each Requires

#### Moment 1 — Form submit → card appears in real time

**What happens:** Student submits the left-panel form. Within 80ms a new Kanban card slides into the `Inquiry` column on the right panel. Audio chime plays.

**Backend path:**
1. Server Action writes to `public.leads`
2. PostgreSQL WAL event → Supabase Realtime → WebSocket push to the demo channel
3. `RealtimeProvider` receives INSERT event → prepends card to Inquiry column
4. Audio chime fires (always enabled on `/demo/split`)

**What must be true for this to work:**
- `supabase_realtime` publication includes `public.leads` ✓ (README §7.1)
- Demo route has `RealtimeProvider` mounted with no `consultantId` filter — it must receive ALL leads, not just assigned ones, because the demo lead arrives unassigned before the auto-assignment trigger fires
- Form submit must complete in < 300ms total (Server Action + DB write) for the demo to feel instant

```typescript
// src/app/demo/split/page.tsx — RealtimeProvider with no filter for demo
<RealtimeProvider consultantId={null} initialLeads={seededLeads}>
  <DemoKanban />
</RealtimeProvider>
```

---

#### Moment 2 — Auto-response fires seconds after submission

**What happens:** Within 2–4 seconds of submit, the left panel's Auto-Response Sandbox updates to show green delivery ticks for both the email (Resend) and WhatsApp (Twilio). The operator can click "Preview email" to see the actual HTML that was sent.

**Backend path:**
1. `AFTER INSERT` webhook fires on `public.leads`
2. Supabase dispatches to `auto-respond-lead` Edge Function
3. Edge Function sends via Resend + Twilio and writes delivery status to `public.communication_logs`
4. `communication_logs` is subscribed via Realtime → left panel sandbox updates

**What must be true:**
- `public.communication_logs` must be added to the `supabase_realtime` publication
- The sandbox polls or subscribes to `communication_logs WHERE lead_id = [just-submitted lead]`
- WhatsApp template must be pre-approved (README §17.14) — otherwise Moment 2 fails silently every time
- Resend custom domain must be live (README §17.13) — otherwise email lands in spam and delivery tick is misleading

```sql
-- Add to §7.1 publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_logs;
```

```typescript
// src/components/demo/AutoResponseSandbox.tsx
// Subscribes to communication_logs for the just-submitted lead_id
// Shows status: QUEUED → DELIVERED (with green tick) or FAILED (with Brick ✗)
// "Preview email" opens the stored content_snippet in a modal
// "Preview WhatsApp" shows the approved template body with variables filled
```

**Gap:** `public.communication_logs` is not currently in the Realtime publication. Add it.

---

#### Moment 3 — Pre-populated funnel with leads at every stage

**What happens:** When the operator opens `/demo/split`, the right-panel Kanban already shows 10 realistic pre-seeded leads spread across all 6 stages so the viewer immediately understands the funnel shape visually without waiting for anything.

**Backend path:**
1. Demo toolbar "Seed 10 Leads" button calls `public.fn_demo_seed_leads()`
2. OR: leads are seeded automatically on `/demo/split` page load if the demo Kanban is empty
3. Leads have real-sounding names, real target countries, real programs

**The missing piece — `fn_demo_seed_leads()`:**

```sql
-- supabase/migrations/20260911000023_demo_functions.sql

-- Demo-only: seed realistic leads spread across all stages
CREATE OR REPLACE FUNCTION public.fn_demo_seed_leads()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_consultant_id UUID;
BEGIN
    -- Get any active consultant for assignment
    SELECT id INTO v_consultant_id FROM public.profiles
    WHERE role = 'consultant' AND is_active = TRUE LIMIT 1;

    -- Delete any existing demo leads first (idempotent)
    DELETE FROM public.leads WHERE metadata->>'is_demo' = 'true';

    -- Insert 10 leads across all stages
    INSERT INTO public.leads (student_id, assigned_consultant_id, target_country,
                               stage, metadata, last_contacted_at, created_at)
    SELECT
        (SELECT id FROM public.profiles WHERE role = 'student' LIMIT 1 OFFSET (ordinality - 1) % 3),
        v_consultant_id,
        country, stage,
        jsonb_build_object(
            'is_demo', true,
            'student_name', name,
            'gpa', gpa,
            'ielts_overall', ielts,
            'target_intake', 'Fall 2027'
        ),
        NOW() - (hours_ago * INTERVAL '1 hour'),
        NOW() - (days_ago * INTERVAL '1 day')
    FROM (VALUES
        ('Fatima Al-Rasheed',   'United Kingdom', 'Inquiry',             '3.8', '7.5',  2,   0),
        ('Kwame Asante-Mensah', 'Canada',         'Inquiry',             '3.6', '7.0',  5,   0),
        ('Priya Sundaram',      'Germany',        'Inquiry',             '3.9', '8.0',  8,   1),
        ('Lucas Oliveira',      'Australia',      'Counseling',          '3.7', '7.5', 12,   2),
        ('Amara Diallo',        'Canada',         'Counseling',          '3.5', '6.5', 30,   4),
        ('Jin-woo Park',        'United Kingdom', 'Document Collection', '3.8', '7.0', 18,   5),
        ('Nadia Hassan',        'USA',            'Document Collection', '3.9', '8.5', 45,   7),
        ('Carlos Mendez',       'Canada',         'Application',         '3.6', '7.5', 20,   9),
        ('Anika Sharma',        'Germany',        'Application',         '4.0', '8.0', 10,  12),
        ('Emmanuel Osei',       'Australia',      'Fee/Verification',    '3.7', '7.0',  6,  15)
    ) AS t(name, country, stage, gpa, ielts, hours_ago, days_ago)
    WITH ORDINALITY;
END;
$$;

-- Demo-only: age a specific lead to simulate a stall breach
-- Called by the "Age Lead –3d" toolbar button
CREATE OR REPLACE FUNCTION public.fn_demo_simulate_stall(p_lead_id UUID, p_hours_ago INTEGER DEFAULT 72)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.leads
    SET last_contacted_at = NOW() - (p_hours_ago * INTERVAL '1 hour'),
        updated_at        = NOW() - (p_hours_ago * INTERVAL '1 hour')
    WHERE id = p_lead_id
      AND metadata->>'is_demo' = 'true'; -- Safety: only age demo leads
END;
$$;

-- Demo-only: reset all demo leads back to fresh state
CREATE OR REPLACE FUNCTION public.fn_demo_reset()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    DELETE FROM public.leads WHERE metadata->>'is_demo' = 'true';
    DELETE FROM public.reminders WHERE lead_id IN (
        SELECT id FROM public.leads WHERE metadata->>'is_demo' = 'true'
    );
END;
$$;
```

**Stage distribution for visual impact:** 3 in Inquiry, 2 in Counseling, 2 in Document Collection, 2 in Application, 1 in Fee/Verification, 0 in Admitted. This gives the funnel a natural narrowing shape from left to right — exactly what a viewer needs to see immediately.

---

#### Moment 4 — Stall automation fires end-to-end

**What happens:** Operator clicks "Age Lead –3d" on a card in Counseling (48h threshold). Then clicks "Run Cron." Within seconds, the Brick pulsing dot appears on that card, the reminder is inserted, and the stall badge reads "72h inactive in Counseling." Operator clicks "Log Contact" — the dot disappears instantly.

**Backend path:**
1. "Age Lead –3d" → calls `fn_demo_simulate_stall(lead_id, 72)` → sets `last_contacted_at` back 72h
2. "Run Cron" → calls `SELECT public.fn_detect_stalled_leads()` directly via RPC (not waiting for pg_cron's 60s schedule)
3. Procedure sets `is_stalled = TRUE`, inserts to `public.reminders`
4. WAL event → Realtime → WebSocket UPDATE → `RealtimeProvider` patches the lead in state
5. Card shows Brick pulsing dot + "72h inactive" label
6. "Log Contact" → calls `logConsultationAction` → sets `last_contacted_at = NOW()`, `is_stalled = FALSE`
7. WAL event → Realtime → WebSocket UPDATE → dot clears instantly

**What must be true:**
- `fn_detect_stalled_leads()` is callable via RPC from the browser with a demo-privileged token
- The EXCEPTION block (README §16.2) is in place — if any demo seed lead has bad data, the batch still completes
- `fn_demo_simulate_stall` has a safety guard (`metadata->>'is_demo' = 'true'`) so it cannot age real production leads

```typescript
// src/components/demo/DemoToolbar.tsx
async function handleAgeAndTrigger(leadId: string) {
  // Step 1: Age the selected lead
  await supabase.rpc('fn_demo_simulate_stall', {
    p_lead_id: leadId,
    p_hours_ago: 72,
  });

  // Step 2: Run stall detection immediately (no wait for pg_cron)
  await supabase.rpc('fn_detect_stalled_leads');

  // Realtime delivers the UPDATE to the Kanban automatically —
  // no manual state update needed here
}
```

---

### Complete Demo Script — Marketing Presentation Order

This is the script to run in sequence. Each step maps to one of the four marketing moments.

```
PRE-DEMO SETUP (before audience arrives, 2 minutes):
  1. Open /demo/split in a browser on the presentation display
  2. Confirm green "WEBSOCKET CONNECTED" pill in top-right of right panel
  3. Click "Seed 10 Leads" — Kanban populates with leads across all stages
  4. Confirm audio is unmuted on the presentation device
  5. WhatsApp template confirmed approved, Resend domain verified
  ─────────────────────────────────────────────────────────────────────

MOMENT 3 (show first — establish context before doing anything):
  "Here's what a live consultant pipeline looks like across all six
   admission stages. These are real applicants at different points in
   their journey — from first inquiry all the way to fee verification."
  → Point to the funnel shape: 3 Inquiry, 2 Counseling, 2 Docs, etc.
  → "The system is live. That WebSocket connection means anything that
     happens anywhere in the platform shows here instantly."

MOMENT 1 (the live capture):
  "Watch what happens when a student submits an inquiry right now."
  → Fill the left-panel form: Kwame Asante-Mensah, Canada, MSc Data Science
  → Click Submit
  → [card drops into Inquiry column, audio chime plays]
  "That card appeared in under 100 milliseconds. No page refresh. The
   consultant would hear that chime from any browser tab."

MOMENT 2 (the auto-response):
  "While that was happening, the system already sent Kwame a confirmation."
  → Point to the Auto-Response Sandbox on the left panel
  → [Email: ✓ Delivered, WhatsApp: ✓ Delivered]
  → Click "Preview email" — show the HTML welcome email with Kwame's name
  → Click "Preview WhatsApp" — show the template message
  "This fired automatically — no consultant action required. The student
   got a professional welcome message within seconds of submitting."

MOMENT 4 (the stall automation):
  "Now — what happens if a consultant goes quiet on a student for too long?"
  → Click on Lucas Oliveira's card (in Counseling, 2 days old)
  → Click "Age Lead –3d" on the toolbar
  → Click "Run Cron"
  → [Brick pulsing dot appears, "72h inactive in Counseling" label]
  "The system detected that this application has been sitting untouched
   for 72 hours — longer than the 48-hour SLA for Counseling. It flagged
   it automatically without anyone having to check."
  → Click "Log Contact" on Lucas's card, type one note
  → [Brick dot disappears instantly]
  "The moment the consultant logs contact, the flag clears. The SLA
   timer resets. The system tracks everything."
  ─────────────────────────────────────────────────────────────────────

POST-DEMO RESET (if running demo again):
  → Click "Reset demo" in the toolbar
  → fn_demo_reset() deletes all demo leads
  → Click "Seed 10 Leads" to re-populate for next audience
```

---

### Demo Infrastructure Checklist

Run this before every live presentation:

```
Pre-flight
  ☐ /demo/split loads without errors in the presentation browser
  ☐ "WEBSOCKET CONNECTED" green pill visible — if not, check Supabase Realtime status
  ☐ Audio is unmuted on the presentation device — test with "Seed 10 Leads"
  ☐ WhatsApp template approved in Meta Business Manager (§17.14)
  ☐ Resend custom domain verified and sending (§17.13) — test send to a real inbox
  ☐ Supabase project on Pro plan — Edge Function cold-start < 100ms required
  ☐ fn_demo_seed_leads() tested: seeds 10 leads, correct stage distribution
  ☐ fn_demo_simulate_stall() tested: ages one lead, does not touch non-demo leads
  ☐ fn_detect_stalled_leads() tested: flags stalled leads, EXCEPTION block intact

Communication delivery
  ☐ Send a test lead through /demo/split — confirm email arrives in inbox (not spam)
  ☐ Send a test lead — confirm WhatsApp arrives on a real phone
  ☐ communication_logs shows DELIVERED status for both channels
  ☐ Auto-Response Sandbox shows green ticks within 5 seconds of submit

Realtime
  ☐ Open two browser windows side-by-side — submit from left, confirm card appears on right
  ☐ Disconnect network for 5s, reconnect — confirm gap recovery re-syncs leads (§17.6)
  ☐ Age a lead and run cron — confirm Brick dot appears within 3 seconds
  ☐ Log contact on stalled card — confirm dot clears within 1 second
```

---

### Marketing Team — What Each Moment Proves

| Moment | What it demonstrates to a prospect |
|--------|-------------------------------------|
| 1 — Real-time capture | "Your consultants never miss a lead. The system is always watching." |
| 2 — Auto-response | "Every student gets a professional response in seconds — before any consultant lifts a finger." |
| 3 — Funnel view | "Your entire agency pipeline, live. You always know exactly where every application stands." |
| 4 — Stall automation | "The system enforces your SLAs automatically. Consultants get warned before students get frustrated." |


## 11. Standardized Project File Structure

A clean, modern monorepo separating Next.js application domains (`/src`) from database migrations, edge functions, and seed definitions (`/supabase`):

```
lead_tracker/
├── .github/
│   └── workflows/
│       ├── deploy-edge-functions.yml      # CI/CD: Supabase Edge Functions deploy
│       ├── run-database-migrations.yml    # CI/CD: Supabase DB diff & push
│       └── vercel-production-build.yml    # CI/CD: Next.js type check & deployment
│
├── supabase/
│   ├── config.toml                        # Supabase CLI configuration
│   ├── seed.sql                           # Seed data (universities, counselors, demo leads)
│   ├── migrations/
│   │   ├── 20260911000001_core_schema.sql # Relational tables, enums, indexes
│   │   ├── 20260911000002_rls_policies.sql# Row-Level Security policies for all 3 roles
│   │   ├── 20260911000003_functions.sql   # Audit triggers, stall detector, contact logger
│   │   └── 20260911000004_pg_cron.sql     # pg_cron job schedule definitions
│   └── functions/
│       ├── auto-respond-lead/             # Edge Function: Multi-channel dispatch (Email/WhatsApp)
│       │   ├── index.ts
│       │   └── deno.json
│       └── send-stall-digest/             # Edge Function: Daily consultant SLA digest
│           ├── index.ts
│           └── deno.json
│
├── src/
│   ├── middleware.ts                      # Next.js SSR Middleware (@supabase/ssr session + RBAC)
│   │
│   ├── app/
│   │   ├── layout.tsx                     # Root Layout: Theme, Audio Context, Fonts
│   │   ├── globals.css                    # Tailwind CSS design system tokens
│   │   ├── page.tsx                       # Redirect / Root Landing
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx             # Magic Link & Passwordless Authentication
│   │   │   └── callback/route.ts          # Supabase PKCE Auth exchange handler
│   │   │
│   │   ├── portal/
│   │   │   └── student/
│   │   │       ├── page.tsx               # Student Portal: KYC, Onboarding & Stage Progress
│   │   │       ├── documents/page.tsx     # Student Document Vault & Upload Uploader
│   │   │       └── universities/page.tsx  # University Directory & Program Search
│   │   │
│   │   ├── crm/
│   │   │   └── consultant/
│   │   │       ├── page.tsx               # Consultant Dashboard & 6-Stage Realtime Kanban
│   │   │       ├── leads/[id]/page.tsx    # Lead Detail, Timeline & Interaction Drawer
│   │   │       └── reminders/page.tsx     # Inactivity Reminders Center
│   │   │
│   │   ├── admin/
│   │   │   ├── page.tsx                   # Super-Admin: Conversion Funnel & Counselor Velocity
│   │   │   ├── thresholds/page.tsx        # Dynamic SLA Stall Threshold Configuration
│   │   │   └── universities/page.tsx      # Partner University Institutional Agreements
│   │   │
│   │   ├── demo/
│   │   │   └── split/
│   │   │       └── page.tsx               # Section 13 Side-by-Side Presentation Suite
│   │   │
│   │   └── actions/
│   │       ├── leadActions.ts             # Server Actions: Create, Advance Stage, Log Call
│   │       └── documentActions.ts         # Server Actions: Verify Document, Signed Upload URLs
│   │
│   ├── components/
│   │   ├── ui/                            # Atomic UI: Button, Input, Modal, Badge, Drawer
│   │   ├── portal/
│   │   │   ├── StudentForm.tsx            # B2C Onboarding & Country Preference Form
│   │   │   ├── DocumentUploader.tsx       # Direct-to-S3 Document Vault Component
│   │   │   └── MilestoneTracker.tsx       # 6-Stage Visual Progress Bar
│   │   ├── crm/
│   │   │   ├── PipelineKanban.tsx         # 6-Column Drag/Click Board with Optimistic UI
│   │   │   ├── FunnelChart.tsx            # Stage Conversion Drop-off Visualization
│   │   │   ├── StallAlertsBanner.tsx      # Dynamic Inactivity Warning Ticker
│   │   │   └── InteractionLoggerModal.tsx # Telephone & Consultation Logger
│   │   └── demo/
│   │       ├── DemoToolbar.tsx            # Seed Leads, Age Leads (-3d), Run Cron
│   │       └── AutoResponseSandbox.tsx    # Email & WhatsApp Live Previews
│   │
│   ├── hooks/
│   │   ├── useSupabaseRealtime.ts         # WebSocket Subscription & Cleanup Lifecycle Hook
│   │   ├── useAudioAlert.ts               # Web Audio API Chime Manager
│   │   └── useOptimisticKanban.ts         # Optimistic State Transition Reducer
│   │
│   ├── services/
│   │   └── supabase/
│   │       ├── client.ts                  # Browser Client (createBrowserClient)
│   │       ├── server.ts                  # Server Component Client (createServerClient)
│   │       └── admin.ts                   # Service-Role Admin Client (Privileged tasks)
│   │
│   └── types/
│       ├── database.ts                    # TypeScript types auto-generated via Supabase CLI
│       └── agency.ts                      # Domain models: Leads, Enums, Metrics
│
├── public/
│   ├── audio/
│   │   └── lead-chime.mp3                 # High-Fidelity Audio Alert Chime
│   └── brand/
│       └── logo.svg                       # Agency Platform Branding
│
├── package.json                           # Next.js 15, React 19, Supabase SSR, Lucide, Tailwind
├── tsconfig.json                          # Strict TypeScript Configuration
├── tailwind.config.ts                     # Curated Color Tokens (Dark Mode, Amber/Red Alerts)
└── README.md                              # This Complete Technical Specification Document
```

---

## 12. Security, Compliance & Data Governance

As a cross-border educational brokerage handling confidential student records (passports, financial solvency records, and official transcripts), the architecture guarantees enterprise-grade compliance:

1. **FERPA & GDPR Compliance**:
   - Personally Identifiable Information (PII) is encrypted at rest using AES-256 in PostgreSQL.
   - Academic transcripts in `Supabase Storage` are stored in private buckets accessible exclusively via **Short-Lived Signed URLs** (60-minute TTL).
   - Students possess a self-service "Right to be Forgotten" endpoint that cascades deletions across `public.leads`, `public.documents`, and S3 storage objects.
2. **Strict RLS Isolation**: No user can read or mutate records outside their cryptographically verified JWT scope (`auth.uid() = id`), eliminating IDOR vulnerabilities.
3. **Database Connection Pooling**: Next.js serverless invocations connect through **Supavisor**, guaranteeing zero socket starvation even under sudden viral inquiry surges.
4. **Audit Immutability**: All stage changes, file reviews, and communication dispatches generate tamper-proof append-only rows in `public.activity_logs`.

---

## 13. Verification, Automated Testing & QA Matrix

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              VERIFICATION & QA TEST SUITE                              │
├───────────────────────┬──────────────────────────────┬─────────────────────────────────┤
│ Layer                 │ Test Target                  │ Verification Criteria           │
├───────────────────────┼──────────────────────────────┼─────────────────────────────────┤
│ PostgreSQL RLS        │ Multi-Role Isolation         │ Asserts student cannot query    │
│                       │ (`supabase/tests/rls.test.sql`) other student rows; asserts     │
│                       │                              │ consultant only sees assigned.  │
├───────────────────────┼──────────────────────────────┼─────────────────────────────────┤
│ Database Functions    │ `fn_detect_stalled_leads()`  │ Seeds lead aged 73h in          │
│                       │                              │ Counseling; asserts lead is     │
│                       │                              │ marked stalled and reminder row │
│                       │                              │ is created without duplicates.  │
├───────────────────────┼──────────────────────────────┼─────────────────────────────────┤
│ Supabase Realtime     │ WebSocket WAL Stream         │ Connects WebSocket listener;    │
│                       │                              │ inserts row into `leads`;       │
│                       │                              │ asserts event payload arrives   │
│                       │                              │ in <100ms.                      │
├───────────────────────┼──────────────────────────────┼─────────────────────────────────┤
│ Edge Functions        │ `auto-respond-lead`          │ Invokes function with mock lead;│
│                       │                              │ verifies HTTP 200 and entry in  │
│                       │                              │ `communication_logs`.           │
├───────────────────────┼──────────────────────────────┼─────────────────────────────────┤
│ End-to-End Browser    │ Split-View Ingestion &       │ Form submission on left panel   │
│ (Playwright)          │ Stage Advancement            │ populates right Kanban board;   │
│                       │                              │ call log clears stall warning.  │
└───────────────────────┴──────────────────────────────┴─────────────────────────────────┘
```

### 13.1 SQL RLS Test Script (`supabase/tests/rls_verification.sql`)
```sql
BEGIN;
SELECT plan(4);

-- 1. Create Mock Student & Consultant
INSERT INTO auth.users (id, email) VALUES 
('11111111-1111-1111-1111-111111111111', 'student1@test.com'),
('22222222-2222-2222-2222-222222222222', 'student2@test.com'),
('33333333-3333-3333-3333-333333333333', 'counselor@test.com');

INSERT INTO public.profiles (id, email, full_name, role) VALUES
('11111111-1111-1111-1111-111111111111', 'student1@test.com', 'Student One', 'student'),
('22222222-2222-2222-2222-222222222222', 'student2@test.com', 'Student Two', 'student'),
('33333333-3333-3333-3333-333333333333', 'counselor@test.com', 'Counselor Priya', 'consultant');

-- 2. Insert Leads
INSERT INTO public.leads (id, student_id, assigned_consultant_id, target_country) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Canada'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', NULL, 'UK');

-- 3. Impersonate Student 1: Must only see Lead A
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';

SELECT results_eq(
    'SELECT target_country FROM public.leads',
    ARRAY['Canada'],
    'Student 1 should strictly only see their own application'
);

-- 4. Impersonate Student 2: Must only see Lead B
SET LOCAL "request.jwt.claim.sub" TO '22222222-2222-2222-2222-222222222222';
SELECT results_eq(
    'SELECT target_country FROM public.leads',
    ARRAY['UK'],
    'Student 2 should strictly only see their own application'
);

-- 5. Impersonate Counselor: Must only see Lead A (assigned)
SET LOCAL "request.jwt.claim.sub" TO '33333333-3333-3333-3333-333333333333';
SELECT results_eq(
    'SELECT target_country FROM public.leads',
    ARRAY['Canada'],
    'Consultant should strictly only see applications assigned to them'
);

SELECT * FROM finish();
ROLLBACK;
```

---

## 14. Caching Strategy

This system spans five distinct caching layers. Each layer has different data volatility, different invalidation triggers, and different consequences for serving stale data. The strategy below defines exactly what is cached, for how long, and the precise mechanism that purges it when the underlying data changes.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  CACHING LAYER OVERVIEW                                          │
├──────────────────────┬───────────────────────────────┬──────────────────────────────────────────┤
│ Layer                │ What Is Cached                │ Invalidation Mechanism                   │
├──────────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ 1. Next.js Data Cache│ Server Component Supabase     │ revalidateTag() inside Server Actions    │
│                      │ query results per route       │ after every mutation                     │
├──────────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ 2. Next.js Full Route│ Rendered HTML for static-safe │ On-demand via revalidatePath() after     │
│    Cache             │ pages (university catalog)    │ admin catalog updates                    │
├──────────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ 3. unstable_cache    │ Expensive aggregate queries   │ Tag-based purge on lead stage change or  │
│    (Analytics)       │ (conversion funnel metrics,   │ pg_cron stall detection cycle            │
│                      │  counselor velocity stats)    │                                          │
├──────────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ 4. Vercel CDN /      │ Static assets, signed URL     │ Immutable assets: cache forever.         │
│    Edge Cache        │ pre-flight responses          │ Signed URLs: Cache-Control: no-store     │
├──────────────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ 5. PostgreSQL /      │ Prepared statement plans,     │ Supavisor session pooling manages        │
│    Supavisor         │ Materialized View snapshots   │ lifetime. REFRESH MATERIALIZED VIEW      │
│                      │                               │ called by pg_cron on schedule            │
└──────────────────────┴───────────────────────────────┴──────────────────────────────────────────┘
```

---

### 14.1 The Core Problem: Realtime + Server Component Cache Coexistence

The Realtime WebSocket delivers live deltas to connected clients. But every page load begins with a **Server Component fetch** — and that fetch result is stored in Next.js's Data Cache. If that initial fetch is stale, the Kanban board renders incorrect data before Realtime even connects.

The rule is:

- **Live CRM routes** (`/crm/consultant`, `/portal/student`) → always fetch fresh from Supabase using `cache: 'no-store'`. Realtime handles the live delta layer on top.
- **Semi-static routes** (`/admin/universities`, `/admin/thresholds`) → use tag-based caching with explicit invalidation on mutation.
- **Analytics routes** (`/admin`) → use `unstable_cache` with a 60-second revalidation window, matching the `pg_cron` evaluation cadence.

---

### 14.2 Layer 1: Next.js Data Cache — Per-Route Fetch Configuration

#### Live Routes: Opt Out of Caching Entirely

CRM and student portal pages must never serve a cached snapshot because a consultant could open the Kanban and miss leads that arrived seconds ago.

```typescript
// src/services/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
      // Force every fetch through this client to bypass the Data Cache
      global: {
        fetch: (url, options) =>
          fetch(url, { ...options, cache: 'no-store' }),
      },
    }
  );
}
```

```typescript
// src/app/crm/consultant/page.tsx  (Server Component)
import { createSupabaseServerClient } from '@/services/supabase/server';

export const dynamic = 'force-dynamic'; // Belt-and-suspenders: never statically render this route

export default async function ConsultantDashboard() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // This fetch is always live — no cache entry created
  const { data: leads } = await supabase
    .from('leads')
    .select('*, profiles!student_id(full_name, email)')
    .eq('assigned_consultant_id', user!.id)
    .order('updated_at', { ascending: false });

  return <PipelineKanban initialLeads={leads ?? []} />;
}
```

#### Semi-Static Routes: Tag-Based Caching

The university catalog and SLA threshold config change rarely (only when a super-admin edits them), so these can be cached and purged on demand.

```typescript
// src/app/admin/universities/page.tsx  (Server Component)
import { unstable_cache } from 'next/cache';
import { createSupabaseServerClient } from '@/services/supabase/server';

const getCachedUniversities = unstable_cache(
  async () => {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from('universities')
      .select('*, programs(*)')
      .eq('is_active', true)
      .order('name');
    return data ?? [];
  },
  ['universities-catalog'],          // Cache key
  {
    tags: ['universities'],          // Invalidation tag
    revalidate: 3600,                // Fallback: revalidate every 1 hour regardless
  }
);

export default async function UniversitiesPage() {
  const universities = await getCachedUniversities();
  return <UniversityCatalog universities={universities} />;
}
```

---

### 14.3 Layer 1 Continued: Server Action Cache Invalidation

Every mutation Server Action must purge its associated cache tags immediately after the database write succeeds. This keeps the cache consistent for the next page load while Realtime handles the in-session live update.

```typescript
// src/app/actions/leadActions.ts
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { createSupabaseServerClient } from '@/services/supabase/server';

export async function updateLeadStageAction(leadId: string, newStage: string) {
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from('leads')
    .update({ stage: newStage, updated_at: new Date().toISOString() })
    .eq('id', leadId);

  if (error) return { success: false, error: error.message };

  // 1. Purge analytics cache — stage change affects funnel metrics
  revalidateTag('analytics-funnel');
  revalidateTag('counselor-velocity');

  // 2. Revalidate the admin overview path for next load
  revalidatePath('/admin');

  return { success: true };
}

export async function logConsultationAction(leadId: string, notes: string) {
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from('leads')
    .update({
      last_contacted_at: new Date().toISOString(),
      is_stalled: false,
      reminder_status: 'RESOLVED',
    })
    .eq('id', leadId);

  if (error) return { success: false, error: error.message };

  // Stall resolved — purge stall-related analytics
  revalidateTag('analytics-funnel');
  revalidatePath('/admin');

  return { success: true };
}

export async function updateUniversityAction(universityId: string, data: Partial<University>) {
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from('universities')
    .update(data)
    .eq('id', universityId);

  if (error) return { success: false, error: error.message };

  // University catalog changed — purge the cached page
  revalidateTag('universities');
  revalidatePath('/admin/universities');
  revalidatePath('/portal/student/universities'); // Students see the same catalog

  return { success: true };
}

export async function updateSlaThresholdAction(stage: string, thresholdHours: number) {
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from('stage_threshold_configs')
    .update({ threshold_hours: thresholdHours, updated_at: new Date().toISOString() })
    .eq('stage', stage);

  if (error) return { success: false, error: error.message };

  // SLA config changed — purge threshold cache
  revalidateTag('sla-thresholds');
  revalidatePath('/admin/thresholds');

  return { success: true };
}
```

---

### 14.4 Layer 3: Analytics Caching with `unstable_cache`

The super-admin dashboard aggregates conversion funnel metrics and counselor velocity stats across the entire leads table. These queries are expensive. They do not need to be live — a 60-second window is acceptable and matches the `pg_cron` stall evaluation cadence exactly.

```typescript
// src/services/analytics.ts
import { unstable_cache } from 'next/cache';
import { createSupabaseServerClient } from '@/services/supabase/server';

/**
 * Funnel conversion metrics — cached for 60s, tagged for on-demand purge.
 * Purged by: updateLeadStageAction, logConsultationAction
 */
export const getCachedFunnelMetrics = unstable_cache(
  async () => {
    const supabase = createSupabaseServerClient();

    const { data: stageCounts } = await supabase
      .from('leads')
      .select('stage')
      .then(({ data }) => ({
        data: data?.reduce((acc, row) => {
          acc[row.stage] = (acc[row.stage] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      }));

    const { count: stalledCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('is_stalled', true);

    return { stageCounts: stageCounts ?? {}, stalledCount: stalledCount ?? 0 };
  },
  ['analytics-funnel-data'],
  {
    tags: ['analytics-funnel'],
    revalidate: 60,   // Matches pg_cron interval — never more than 60s stale
  }
);

/**
 * Counselor velocity — cached for 5 minutes.
 * Purged by: updateLeadStageAction
 */
export const getCachedCounselorVelocity = unstable_cache(
  async () => {
    const supabase = createSupabaseServerClient();

    const { data } = await supabase
      .from('activity_logs')
      .select(`
        actor_id,
        profiles!actor_id(full_name),
        action_type,
        created_at
      `)
      .eq('action_type', 'STAGE_TRANSITION')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    return data ?? [];
  },
  ['counselor-velocity-data'],
  {
    tags: ['counselor-velocity'],
    revalidate: 300,  // 5-minute window — counselor stats don't need sub-minute freshness
  }
);

/**
 * SLA threshold configuration — cached until explicitly purged.
 * Purged by: updateSlaThresholdAction
 */
export const getCachedSlaThresholds = unstable_cache(
  async () => {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from('stage_threshold_configs')
      .select('*')
      .order('threshold_hours');
    return data ?? [];
  },
  ['sla-thresholds-data'],
  {
    tags: ['sla-thresholds'],
    revalidate: false,  // Never time-expire — only purge on explicit admin edit
  }
);
```

---

### 14.5 Layer 4: Vercel CDN & Edge Cache Headers

Static assets are immutable. Authenticated data responses must never be cached by a CDN edge node — a cached response from one user's session must never be served to another.

```typescript
// src/app/api/leads/route.ts  — example Route Handler with explicit cache headers
import { NextResponse } from 'next/server';

export async function GET() {
  // ... fetch logic

  return NextResponse.json(data, {
    headers: {
      // Authenticated data: no CDN caching, no browser caching
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
  });
}
```

```typescript
// next.config.ts — header rules applied at the Vercel edge
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Static assets in /_next/static are content-hashed — cache forever
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Public brand/audio assets — cache for 7 days
        source: '/public/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // All authenticated app routes — must never be CDN-cached
        source: '/(portal|crm|admin|demo)/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

**Supabase Storage Signed URL caching:** Signed URLs have a 60-minute TTL baked into the URL signature itself. The browser can cache the resource for the duration of that signature window, but the URL is single-use per session. Never cache signed URLs server-side — generate them fresh on each document page load.

```typescript
// src/app/actions/documentActions.ts
'use server';

export async function getSignedDocumentUrl(storagePath: string): Promise<string> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.storage
    .from('student-docs')
    .createSignedUrl(storagePath, 3600); // 60-minute TTL

  if (error || !data?.signedUrl) throw new Error('Could not generate signed URL');

  // Do NOT cache this URL — it contains a time-limited signature token.
  // The browser will cache the downloaded file for the TTL duration automatically
  // via the storage bucket's response headers.
  return data.signedUrl;
}
```

---

### 14.6 Layer 5: PostgreSQL-Level Caching

#### Materialized View for Funnel Analytics

The `pg_cron` job that evaluates stalled leads runs every 60 seconds. Piggyback on that same schedule to refresh a materialized view that pre-computes the funnel aggregates. This means the database does the heavy aggregation work once per minute rather than on every admin dashboard load.

```sql
-- supabase/migrations/20260911000005_analytics_views.sql

-- Materialized view: pre-computed funnel snapshot
CREATE MATERIALIZED VIEW public.mv_funnel_snapshot AS
SELECT
    stage,
    COUNT(*)                                          AS total_leads,
    COUNT(*) FILTER (WHERE is_stalled = TRUE)         AS stalled_leads,
    COUNT(*) FILTER (WHERE is_stalled = FALSE)        AS active_leads,
    ROUND(AVG(
        EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600.0
    ), 1)                                             AS avg_hours_in_stage
FROM public.leads
WHERE stage != 'Admitted'
GROUP BY stage
ORDER BY MIN(created_at);

-- Index on stage for fast point lookups
CREATE UNIQUE INDEX idx_mv_funnel_stage ON public.mv_funnel_snapshot(stage);

-- Materialized view: counselor conversion summary (last 30 days)
CREATE MATERIALIZED VIEW public.mv_counselor_performance AS
SELECT
    p.id            AS consultant_id,
    p.full_name,
    COUNT(l.id)                                                   AS total_assigned,
    COUNT(l.id) FILTER (WHERE l.stage = 'Admitted')               AS total_admitted,
    COUNT(l.id) FILTER (WHERE l.is_stalled = TRUE)                AS currently_stalled,
    ROUND(
        COUNT(l.id) FILTER (WHERE l.stage = 'Admitted')::numeric
        / NULLIF(COUNT(l.id), 0) * 100, 1
    )                                                             AS conversion_rate_pct,
    ROUND(AVG(
        EXTRACT(EPOCH FROM (l.updated_at - l.created_at)) / 3600.0
    ), 1)                                                         AS avg_lead_age_hours
FROM public.profiles p
LEFT JOIN public.leads l
    ON l.assigned_consultant_id = p.id
    AND l.created_at >= NOW() - INTERVAL '30 days'
WHERE p.role = 'consultant'
GROUP BY p.id, p.full_name;

CREATE UNIQUE INDEX idx_mv_counselor_perf ON public.mv_counselor_performance(consultant_id);
```

```sql
-- supabase/migrations/20260911000006_refresh_schedule.sql

-- Extend the existing pg_cron job to also refresh materialized views
-- Runs every minute — same cadence as stall detection
SELECT cron.schedule(
    'refresh-analytics-views-every-minute',
    '* * * * *',
    $$
        REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_funnel_snapshot;
        REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_counselor_performance;
    $$
);
```

> `CONCURRENTLY` is required here. Without it, `REFRESH MATERIALIZED VIEW` takes an `ACCESS EXCLUSIVE` lock that blocks all reads on that view for the duration of the refresh. With `CONCURRENTLY`, old data remains readable while the new snapshot is built — at the cost of slightly higher I/O. The unique indexes created above are a prerequisite for `CONCURRENTLY` to work.

#### Supavisor Connection Pool Configuration

Next.js serverless functions open a new database connection on every invocation. Without pooling, concurrent serverless requests pile up individual PostgreSQL connections. On Supabase Pro/Team, `max_connections` scales with the compute add-on (up to 490 direct connections on the largest instances), but even with that headroom, holding a connection open per serverless invocation is wasteful. Supavisor transaction-mode pooling collapses thousands of short-lived serverless requests into a fixed pool of long-lived PostgreSQL connections — the right pattern regardless of tier.

```
Transaction Mode  →  Use for: Server Actions, API Routes, Edge Functions
                     Each request borrows a connection for the duration of
                     a single transaction, then releases it immediately.
                     Connection string: postgresql://...?pgbouncer=true

Session Mode      →  Use for: Long-running migrations, supabase db push
                     Holds the connection for the full client session.
                     Not suitable for serverless — do not use in Next.js.
```

Configure the Supabase client to always use the transaction-mode pooler URL in serverless contexts:

```typescript
// src/services/supabase/server.ts — use the pooler URL from env
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL!;
// This must point to the Supavisor transaction-mode endpoint:
// postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

Add both URLs to your environment variables and never mix them up:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Transaction-mode pooler — use in all serverless Next.js code
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct connection — use only for migrations (supabase db push, pgTAP tests)
DIRECT_URL=postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres
```

---

### 14.7 Complete Cache Decision Flow

```mermaid
flowchart TD
    REQ["Incoming Page Request"] --> AUTH{"Is route\nauthenticated?"}

    AUTH -->|No - public page| STATIC["Serve from\nVercel CDN Edge Cache\nCache-Control: public, immutable"]

    AUTH -->|Yes - protected route| VOLATILE{"Is data\nvolatile?\ne.g. leads, reminders"}

    VOLATILE -->|Yes - CRM / Student Portal| NOSTORE["fetch with cache: no-store\nexport const dynamic = force-dynamic\nRealtime WebSocket delivers live deltas"]

    VOLATILE -->|No - semi-static| TAGGED{"Has data\nchanged recently?"}

    TAGGED -->|Cache HIT - tag valid| SERVE["Serve from\nNext.js Data Cache\nunstable_cache entry"]

    TAGGED -->|Cache MISS or tag purged| DBFETCH["Fetch from\nSupabase PostgreSQL\nvia Supavisor Pooler"]

    DBFETCH --> STORE["Store in Data Cache\nwith revalidation tag"]
    STORE --> SERVE

    MUTATION["Server Action\nMutation Completes"] --> PURGE["revalidateTag / revalidatePath\nPurge relevant cache entries"]
    PURGE --> TAGGED
```

---

### 14.8 Caching Rules Reference

```
┌─────────────────────────────────┬───────────────┬────────────────┬─────────────────────────────┐
│ Route / Data Type               │ Cache Mode    │ TTL            │ Purge Trigger               │
├─────────────────────────────────┼───────────────┼────────────────┼─────────────────────────────┤
│ /crm/consultant (Kanban)        │ no-store      │ —              │ n/a — always live           │
│ /portal/student (Dashboard)     │ no-store      │ —              │ n/a — always live           │
│ /admin (Funnel Overview)        │ unstable_cache│ 60 seconds     │ revalidateTag('analytics-   │
│                                 │               │                │ funnel') on stage change    │
│ /admin/universities (Catalog)   │ unstable_cache│ 3600 seconds   │ revalidateTag('universities')│
│                                 │               │                │ on catalog edit             │
│ /admin/thresholds (SLA Config)  │ unstable_cache│ never expires  │ revalidateTag('sla-         │
│                                 │               │                │ thresholds') on SLA update  │
│ /portal/student/universities    │ unstable_cache│ 3600 seconds   │ revalidateTag('universities')│
│ /_next/static/* (JS/CSS)        │ CDN immutable │ 1 year         │ Content hash in filename    │
│ /public/audio, /public/brand    │ CDN public    │ 7 days         │ Manual deploy               │
│ Supabase Storage Signed URLs    │ no-store      │ 60 min TTL     │ URL signature expiry        │
│ mv_funnel_snapshot (Postgres)   │ Materialized  │ ~60 seconds    │ pg_cron REFRESH CONCURRENTLY│
│ mv_counselor_performance        │ Materialized  │ ~60 seconds    │ pg_cron REFRESH CONCURRENTLY│
└─────────────────────────────────┴───────────────┴────────────────┴─────────────────────────────┘
```


---

## 15. Production Engineering Patterns

The five patterns below address real failure modes specific to this architecture. Each one is grounded in what this system already does — the Realtime-first CRM, the 3-role persona model, the B2B2C agency model — and covers the gap between a working prototype and a production deployment.

---

### 15.1 Authentication Architecture: Server vs. Client Components

The README establishes that `@supabase/ssr` with HTTP-Only PKCE cookies is the auth mechanism. This section explains *why* that choice was made and what breaks if you deviate from it.

#### The Trap: Client-Side Token Storage

If a session token is stored in `localStorage` or React component memory:

1. The Next.js Middleware runs **before** any React code executes. It cannot read `localStorage` — that only exists in the browser. So the Middleware cannot block an unauthenticated request to `/crm/consultant` at the edge. The page begins rendering, then React detects no session, then redirects. This causes a visible **flash of protected content**.
2. A Server Component fetching data from Supabase has no access to the client-side token at all. Every SSR data fetch would be unauthenticated, breaking RLS enforcement server-side.
3. Tokens in `localStorage` are readable by any JavaScript on the page, making them vulnerable to XSS attacks.

#### The Solution: HTTP-Only Cookie Synchronization

`@supabase/ssr` solves this by writing the session token into a `Set-Cookie: HttpOnly; Secure; SameSite=Lax` response header. HTTP-Only cookies:

- Are **invisible to JavaScript** — XSS cannot steal them
- Are **automatically attached** to every request including SSR fetches
- Are **readable by Next.js Middleware** before any page renders

This means the RBAC route guard in `src/middleware.ts` can verify the JWT and redirect unauthenticated users at the Vercel edge, before a single byte of the dashboard HTML is generated.

```
Request to /crm/consultant
        │
        ▼
┌───────────────────────┐
│  Next.js Middleware   │  ← Reads session from HTTP-Only cookie
│  (Vercel Edge Node)   │  ← Verifies JWT, checks role claim
└───────────┬───────────┘
            │
    ┌───────┴────────┐
    │                │
 No session      Has session + role = consultant
    │                │
    ▼                ▼
Redirect to    Render Server Component
/auth/login    (RLS-enforced Supabase query)
```

#### The Three Supabase Client Variants — When to Use Each

A common mistake is using the wrong client variant in the wrong context. Each serves a distinct purpose:

```typescript
// ✅ src/services/supabase/client.ts — Browser Client
// Use in: Client Components ('use client'), event handlers, useEffect
// Auth: reads session from cookie automatically via @supabase/ssr
import { createBrowserClient } from '@supabase/ssr';
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

// ✅ src/services/supabase/server.ts — Server Client
// Use in: Server Components, Server Actions, Route Handlers
// Auth: reads session from the incoming request's cookie store
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export const createSupabaseServerClient = () => {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(),
                 setAll: (c) => c.forEach(({ name, value, options }) =>
                   cookieStore.set(name, value, options)) } }
  );
};

// ✅ src/services/supabase/admin.ts — Service Role Client
// Use in: Edge Functions, internal automation only
// Auth: bypasses RLS entirely — NEVER expose to the browser
import { createClient } from '@supabase/supabase-js';
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Never prefix with NEXT_PUBLIC_
);
```

| Context | Client to Use | Why |
|---|---|---|
| Server Component data fetch | `createSupabaseServerClient()` | Reads cookie from SSR request context |
| Server Action mutation | `createSupabaseServerClient()` | Cookie available in server action scope |
| `useEffect` / event handler | `createClient()` (browser) | Runs in browser, cookie attached automatically |
| Next.js Middleware | `createServerClient` with `request.cookies` | Edge runtime, must use request object |
| Edge Function / pg_cron trigger | `supabaseAdmin` | Bypasses RLS, for system-level writes only |

---

### 15.2 WebSocket Connection Management: Preventing Multi-Tab Proliferation

Section 7.3 shows `useSupabaseRealtime` with correct `removeChannel` cleanup for a single component. The gap is what happens when a consultant opens multiple browser tabs or navigates between routes — each mounts its own hook, creating duplicate subscriptions.

#### The Problem

```
Tab 1: consultant opens /crm/consultant  → opens channel "consultant-crm-pipeline"
Tab 2: same consultant opens same URL   → opens second "consultant-crm-pipeline" channel
Tab 3: same consultant opens same URL   → opens third  "consultant-crm-pipeline" channel
```

Supabase charges by the number of concurrent Realtime connections. Three tabs = three connections billed. More critically, each tab independently plays the audio chime and re-renders its own Kanban — the consultant hears three simultaneous alert sounds.

#### The Solution: Singleton RealtimeProvider

Move the Supabase channel initialization out of individual component hooks and into a single React Context that lives at the layout level. Any component that needs live data reads from this context rather than opening its own subscription.

```typescript
// src/providers/RealtimeProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import type { Lead } from '@/types/database';

interface RealtimeContextValue {
  leads: Lead[];
  stalledLeadIds: Set<string>;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  leads: [],
  stalledLeadIds: new Set(),
});

export function RealtimeProvider({
  consultantId,
  initialLeads,
  children,
}: {
  consultantId: string;
  initialLeads: Lead[];
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [stalledLeadIds, setStalledLeadIds] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Guard: only one channel regardless of how many child components render
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('/audio/lead-chime.mp3');

    // If a channel already exists (e.g. StrictMode double-mount), skip
    if (channelRef.current) return;

    channelRef.current = supabase
      .channel('crm-pipeline-singleton')    // Fixed channel name — Supabase deduplicates by name
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads',
          filter: `assigned_consultant_id=eq.${consultantId}` },
        (payload) => {
          const newLead = payload.new as Lead;
          setLeads((prev) => [newLead, ...prev]);
          audioRef.current?.play().catch(() => {});
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leads',
          filter: `assigned_consultant_id=eq.${consultantId}` },
        (payload) => {
          const updated = payload.new as Lead;
          setLeads((prev) => prev.map((l) => l.id === updated.id ? updated : l));
          if (updated.is_stalled && !(payload.old as Lead)?.is_stalled) {
            setStalledLeadIds((prev) => new Set([...prev, updated.id]));
            audioRef.current?.play().catch(() => {});
          }
          if (!updated.is_stalled) {
            setStalledLeadIds((prev) => { prev.delete(updated.id); return new Set(prev); });
          }
        }
      )
      .subscribe();

    // Single cleanup — runs when the layout unmounts (i.e. consultant logs out)
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [consultantId]);

  return (
    <RealtimeContext.Provider value={{ leads, stalledLeadIds }}>
      {children}
    </RealtimeContext.Provider>
  );
}

// Consuming hook — components read from context, never open their own channel
export const useCRMRealtime = () => useContext(RealtimeContext);
```

```typescript
// src/app/crm/consultant/layout.tsx — mount Provider once at layout level
import { createSupabaseServerClient } from '@/services/supabase/server';
import { RealtimeProvider } from '@/providers/RealtimeProvider';

export default async function ConsultantLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: initialLeads } = await supabase
    .from('leads')
    .select('*')
    .eq('assigned_consultant_id', user!.id)
    .order('updated_at', { ascending: false });

  return (
    // One Provider, one WebSocket channel, shared across all child routes
    <RealtimeProvider consultantId={user!.id} initialLeads={initialLeads ?? []}>
      {children}
    </RealtimeProvider>
  );
}
```

Now `PipelineKanban`, `StallAlertsBanner`, and `RemindersPage` all call `useCRMRealtime()` and read from the same in-memory state — no duplicate subscriptions, no duplicate audio chimes, one connection billed.

---

### 15.3 Client-Side Data Caching: TanStack Query + Realtime Incremental Updates

Section 15 covers Next.js server-side caching (Data Cache, `unstable_cache`). That handles the initial server render. The gap is what happens on the **client side** after hydration: when a consultant is already on the dashboard and data changes, how is the client state kept fresh without re-fetching the entire leads table on every update?

The answer is a hybrid pattern: **TanStack Query for initial fetch + cache management, Supabase Realtime for incremental patches**.

#### Install

```bash
pnpm add @tanstack/react-query @tanstack/react-query-devtools
```

#### Query Client Provider

```typescript
// src/providers/QueryProvider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // One QueryClient per browser session — useState prevents re-creation on re-render
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,       // Data stays fresh for 30s before background refetch
        gcTime: 5 * 60 * 1000,      // Cache entries kept for 5 minutes after unmount
        refetchOnWindowFocus: false, // Realtime handles updates — no need to refetch on tab focus
        retry: 2,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}
```

#### Data Strategy by Type

```
┌───────────────────────────────┬────────────────────────────┬──────────────────────────────┐
│ Data Type                     │ Fetch Strategy             │ Update Mechanism             │
├───────────────────────────────┼────────────────────────────┼──────────────────────────────┤
│ University catalog            │ useQuery, staleTime: ∞     │ Invalidate on admin edit only│
│ SLA threshold configs         │ useQuery, staleTime: ∞     │ Invalidate on admin edit only│
│ Consultant's lead list        │ useQuery, staleTime: 30s   │ Realtime INSERT/UPDATE patch │
│ Lead detail / activity log    │ useQuery, staleTime: 10s   │ Realtime UPDATE patch        │
│ Funnel analytics              │ useQuery, staleTime: 60s   │ Auto-refetch on interval     │
│ Reminders list                │ useQuery, staleTime: 0     │ Realtime INSERT patch        │
└───────────────────────────────┴────────────────────────────┴──────────────────────────────┘
```

#### The Hybrid Hook: Query Fetch + Realtime Patch

```typescript
// src/hooks/useLeadsPipeline.ts
'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createClient } from '@/services/supabase/client';
import type { Lead } from '@/types/database';

const LEADS_QUERY_KEY = (consultantId: string) => ['leads', 'pipeline', consultantId];

async function fetchLeads(consultantId: string): Promise<Lead[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('assigned_consultant_id', consultantId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export function useLeadsPipeline(consultantId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Step 1: TanStack Query owns the initial fetch and cache lifecycle
  const query = useQuery({
    queryKey: LEADS_QUERY_KEY(consultantId),
    queryFn: () => fetchLeads(consultantId),
    staleTime: 30 * 1000,
  });

  // Step 2: Realtime patches the cache incrementally — never re-fetches entire list
  useEffect(() => {
    const channel = supabase
      .channel(`leads-patch-${consultantId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads',
          filter: `assigned_consultant_id=eq.${consultantId}` },
        (payload) => {
          // Prepend new lead directly into the cached array
          queryClient.setQueryData<Lead[]>(
            LEADS_QUERY_KEY(consultantId),
            (old = []) => [payload.new as Lead, ...old]
          );
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leads',
          filter: `assigned_consultant_id=eq.${consultantId}` },
        (payload) => {
          // Patch only the changed row — rest of list untouched
          queryClient.setQueryData<Lead[]>(
            LEADS_QUERY_KEY(consultantId),
            (old = []) => old.map((l) =>
              l.id === payload.new.id ? (payload.new as Lead) : l
            )
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [consultantId, queryClient]);

  return query;
}
```

This pattern means the full leads table is fetched **once** on mount and **never again** during the session — Realtime handles all subsequent updates as surgical patches to the TanStack Query cache.

Static data (university catalog, SLA configs) is fetched once with an infinite `staleTime` and invalidated only when an admin mutation fires:

```typescript
// src/hooks/useUniversities.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';

export const UNIVERSITIES_QUERY_KEY = ['universities', 'catalog'];

export function useUniversities() {
  const supabase = createClient();
  return useQuery({
    queryKey: UNIVERSITIES_QUERY_KEY,
    queryFn: async () => {
      const { data } = await supabase.from('universities').select('*, programs(*)').eq('is_active', true);
      return data ?? [];
    },
    staleTime: Infinity,   // Never re-fetch unless explicitly invalidated
    gcTime: Infinity,      // Keep in memory for the entire session
  });
}

// In the admin Server Action, after a university update:
// queryClient.invalidateQueries({ queryKey: UNIVERSITIES_QUERY_KEY });
```

---

### 15.4 Multi-Tenant Subdomain Routing

The B2B side of this platform serves **agency branches** — a Nairobi branch and a London branch of the same parent agency may want their own branded portal URLs. This section defines how Next.js Middleware handles subdomain-based tenant resolution without a separate deployment per branch.

#### URL Structure

```
Basic (single brand):     https://apexcrm.com/portal/student
Branch-specific:          https://nairobi.apexcrm.com/portal/student
                          https://london.apexcrm.com/portal/student
White-label (enterprise): https://admissions.universityx.com  (custom domain → same platform)
```

#### Middleware Tenant Resolution

```typescript
// src/middleware.ts  — extended with subdomain tenant detection
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Branches registered in public.branches table, cached in-process
const TENANT_CACHE = new Map<string, { branchId: string; brandColor: string; logoUrl: string }>();

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') ?? '';
  const rootDomain = process.env.ROOT_DOMAIN ?? 'apexcrm.com';

  // Extract subdomain: "nairobi.agencybroker.com" → "nairobi"
  const subdomain = hostname.endsWith(`.${rootDomain}`)
    ? hostname.replace(`.${rootDomain}`, '')
    : null;

  let response = NextResponse.next({ request: { headers: request.headers } });

  // Inject tenant context into request headers for Server Components to read
  if (subdomain && subdomain !== 'www') {
    // Check process-level cache first to avoid a DB round-trip on every request
    if (!TENANT_CACHE.has(subdomain)) {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role to read branch config
        { cookies: { getAll: () => [], setAll: () => {} } }
      );
      const { data: branch } = await supabase
        .from('branches')
        .select('id, brand_color, logo_url')
        .eq('subdomain', subdomain)
        .single();

      if (!branch) {
        // Unknown subdomain — redirect to main domain
        return NextResponse.redirect(new URL(`https://${rootDomain}`, request.url));
      }
      TENANT_CACHE.set(subdomain, {
        branchId: branch.id,
        brandColor: branch.brand_color,
        logoUrl: branch.logo_url,
      });
    }

    const tenant = TENANT_CACHE.get(subdomain)!;
    // Pass tenant context downstream via request headers
    response.headers.set('x-tenant-branch-id', tenant.branchId);
    response.headers.set('x-tenant-brand-color', tenant.brandColor);
    response.headers.set('x-tenant-logo-url', tenant.logoUrl);
  }

  // Continue with existing session validation and RBAC guard...
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        ),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if (!user && (path.startsWith('/portal') || path.startsWith('/crm') || path.startsWith('/admin'))) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

#### Reading Tenant Context in Server Components

```typescript
// src/app/layout.tsx — read tenant headers injected by Middleware
import { headers } from 'next/headers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = headers();
  const brandColor = headersList.get('x-tenant-brand-color') ?? '#2563eb'; // default blue
  const logoUrl = headersList.get('x-tenant-logo-url') ?? '/brand/logo.svg';

  return (
    <html lang="en">
      <body style={{ '--brand-color': brandColor } as React.CSSProperties}>
        <header>
          <img src={logoUrl} alt="Agency Logo" height={40} />
        </header>
        {children}
      </body>
    </html>
  );
}
```

#### Required Database Addition

```sql
-- supabase/migrations/20260911000007_branches.sql
CREATE TABLE public.branches (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    subdomain     TEXT UNIQUE,           -- 'nairobi', 'london', NULL for main domain
    custom_domain TEXT UNIQUE,           -- 'admissions.universityx.com', NULL if not white-label
    brand_color   TEXT NOT NULL DEFAULT '#2563eb',
    logo_url      TEXT,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Add branch context to profiles so leads are branch-scoped
ALTER TABLE public.profiles ADD COLUMN branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.leads    ADD COLUMN branch_id UUID REFERENCES public.branches(id);

-- RLS extension: consultants only see leads within their branch
CREATE POLICY "Consultants scoped to their branch"
    ON public.leads FOR SELECT
    USING (
        branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
        OR public.is_super_admin()
    );
```

---

### 15.5 Optimistic UI: Error Recovery & Rollback Toast

Section 9.2 already implements `useOptimistic` with automatic rollback when the Server Action fails. The gap is user feedback — without a visible error notification, the card silently snaps back to its original position and the consultant has no idea what happened or whether to retry.

Add a rollback toast alongside the existing error path:

```typescript
// src/components/crm/PipelineKanban.tsx  — updated handleStageMove
'use client';

import { toast } from 'sonner'; // pnpm add sonner
import { useOptimistic, useTransition } from 'react';
import { updateLeadStageAction } from '@/app/actions/leadActions';
import type { Lead, AdmissionStage } from '@/types/database';

// ...existing STAGES and KanbanProps...

export function PipelineKanban({ initialLeads }: KanbanProps) {
  const [, startTransition] = useTransition();
  const [optimisticLeads, setOptimisticLeads] = useOptimistic(
    initialLeads,
    (state, update: { leadId: string; newStage: AdmissionStage }) =>
      state.map((lead) => lead.id === update.leadId ? { ...lead, stage: update.newStage } : lead)
  );

  const handleStageMove = async (lead: Lead, newStage: AdmissionStage) => {
    const previousStage = lead.stage; // Capture before optimistic update

    // 1. Optimistic render — instant, 0ms latency
    startTransition(() => { setOptimisticLeads({ leadId: lead.id, newStage }); });

    // 2. Show in-progress toast so the consultant knows the move is being saved
    const toastId = toast.loading(`Moving to ${newStage}...`);

    // 3. Execute Server Action
    const result = await updateLeadStageAction(lead.id, newStage);

    if (result.success) {
      toast.success(`Stage updated to "${newStage}"`, { id: toastId });
    } else {
      // 4. useOptimistic auto-rolls back the UI to previousStage
      // Show descriptive error with the original stage so the consultant knows exactly what happened
      toast.error(
        `Could not move to "${newStage}" — rolled back to "${previousStage}". ${result.error}`,
        { id: toastId, duration: 6000 }
      );
    }
  };

  // ...existing JSX with handleStageMove(lead, STAGES[nextIdx]) call...
}
```

```typescript
// src/app/crm/consultant/layout.tsx — mount Toaster once at layout level
import { Toaster } from 'sonner';

export default function ConsultantLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            error: 'bg-red-950 border-red-500 text-red-200',
            success: 'bg-slate-900 border-green-500 text-green-200',
            loading: 'bg-slate-900 border-slate-600 text-slate-300',
          },
        }}
      />
    </>
  );
}
```

The same toast pattern applies to document verification updates and stall resolution — any Server Action that can fail silently should follow this: optimistic render → loading toast → success/error toast with rollback context.

```
┌────────────────────────────────────────────────────────────────────────────┐
│                     OPTIMISTIC UPDATE LIFECYCLE                            │
├──────────┬─────────────────────────────────────────────────────────────────┤
│ t=0ms    │ Consultant clicks "Advance Stage"                              │
│          │ UI moves card instantly (useOptimistic)                        │
│          │ Toast: "Moving to Counseling..."                               │
├──────────┼─────────────────────────────────────────────────────────────────┤
│ t=80ms   │ Server Action writes to Supabase                               │
│          │ Realtime broadcasts UPDATE to all connected dashboards         │
├──────────┼─────────────────────────────────────────────────────────────────┤
│ SUCCESS  │ Toast: "Stage updated to Counseling ✓"                        │
│          │ UI already showing correct state — no visible change           │
├──────────┼─────────────────────────────────────────────────────────────────┤
│ FAILURE  │ useOptimistic rolls card back to "Inquiry"                     │
│          │ Toast: "Could not move to Counseling — rolled back to Inquiry" │
│          │ Consultant sees exactly what happened and can retry            │
└──────────┴─────────────────────────────────────────────────────────────────┘
```


---

## 16. Production Risk Register & System Hardening

This section documents every gap that will cause failures, data corruption, security incidents, or operational breakdowns in a real production deployment. Each item is presented with three things: the specific failure mode, the real-world trigger that causes it, and the implementation fix. Nothing here is theoretical — every one of these is a root cause of incidents in deployed systems of this architecture.

The table below is the fast reference. Each row names the gap, explains in one sentence why it exists in the current design, and points to the subsection with the full fix.

```
┌──────┬─────────────────────────────────────────┬────────────────────────────────────────────────────────────┐
│ §    │ Gap                                     │ Why it exists in this design / What breaks without it      │
├──────┼─────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ 16.1 │ Webhook idempotency                     │ Supabase webhooks are at-least-once. A retry sends the     │
│      │                                         │ student two welcome emails and two WhatsApp messages.       │
├──────┼─────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ 16.2 │ pg_cron exception handling              │ fn_detect_stalled_leads() has no EXCEPTION block. One      │
│      │                                         │ corrupted lead row crashes the entire 60s batch silently.  │
├──────┼─────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ 16.3 │ Input validation (Zod)                  │ Server Actions receive raw JSON. A direct HTTP POST        │
│      │                                         │ bypasses all React form constraints and writes garbage.    │
├──────┼─────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ 16.4 │ Database concurrency / lost updates     │ pg_cron and a consultant can UPDATE the same lead row      │
│      │                                         │ within milliseconds — last writer silently wins.           │
├──────┼─────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ 16.5 │ File upload security                    │ MIME/size checks are JavaScript-only. An attacker posts    │
│      │                                         │ a raw multipart request directly to Storage.               │
├──────┼─────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ 16.6 │ Structured observability                │ Logging is console.log(). No structured format, no alert   │
│      │                                         │ rules, no health endpoint — failures surface when users    │
│      │                                         │ complain, not when they happen.                            │
├──────┼─────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ 16.7 │ Data retention & soft deletes           │ Hard CASCADE DELETE destroys audit logs required for       │
│      │                                         │ GDPR/FERPA compliance. Nothing is ever cleaned up either.  │
├──────┼─────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ 16.8 │ Lead auto-assignment engine             │ New leads arrive with assigned_consultant_id = NULL.       │
│      │                                         │ They are invisible to all consultants until manually       │
│      │                                         │ assigned by a super-admin — who may be asleep.             │
├──────┼─────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ 16.9 │ Full-text search                        │ LIKE '%query%' on the leads table is a sequential scan.   │
│      │                                         │ At 10,000 leads it degrades to 300ms+ per keystroke.      │
├──────┼─────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ 16.10│ Zero-downtime migrations                │ ALTER TABLE NOT NULL locks the leads table entirely.       │
│      │                                         │ Every consultant Kanban freezes during the migration.      │
├──────┼─────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ 16.11│ API rate limiting & abuse               │ The student inquiry form is public. A bot submitting       │
│      │                                         │ 10,000 leads triggers 10,000 Resend + Twilio charges.      │
├──────┼─────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ 16.12│ In-app notification center              │ Audio chimes only work in the active tab. A consultant     │
│      │                                         │ with audio muted misses every lead arrival and stall.      │
├──────┼─────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ 16.13│ Timezone & i18n                         │ Consultants in Nairobi, Toronto, and London all see        │
│      │                                         │ UTC times. SLA breach times are confusing and disputed.    │
├──────┼─────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ 16.14│ Secret management & rotation            │ No pre-commit secret scan. A committed .env.local with     │
│      │                                         │ SERVICE_ROLE_KEY bypasses every RLS policy permanently.    │
├──────┼─────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ 16.15│ Load & performance baselines            │ No k6 scripts, no p95 targets. The system ships with no   │
│      │                                         │ definition of "working correctly under load."              │
└──────┴─────────────────────────────────────────┴────────────────────────────────────────────────────────────┘
```

---

---

### 16.1 Webhook Idempotency — Preventing Duplicate Emails & Messages

**The failure:** Supabase Database Webhooks operate on an at-least-once delivery model. A network timeout between Supabase and the Edge Function causes a retry. The `auto-respond-lead` function executes twice for the same `lead_id`, sending the student two welcome emails and two WhatsApp messages within seconds. This damages agency credibility on the first touchpoint.

**The trigger:** Any transient network blip, Edge Function cold-start timeout, or Supabase infrastructure hiccup during the webhook POST.

**The fix:** Check `communication_logs` before sending. If a delivered record already exists for this `lead_id` and channel, skip execution entirely.

```typescript
// supabase/functions/auto-respond-lead/index.ts — add idempotency guard
serve(async (req) => {
  const payload = await req.json();
  const { record: lead } = payload;

  // IDEMPOTENCY CHECK — run before any external API call
  const { data: existing } = await supabaseAdmin
    .from('communication_logs')
    .select('id')
    .eq('lead_id', lead.id)
    .eq('channel', 'EMAIL')
    .eq('status', 'DELIVERED')
    .maybeSingle();

  if (existing) {
    // Already processed — return 200 so Supabase stops retrying
    return new Response(JSON.stringify({ skipped: true, reason: 'already_delivered' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ... rest of send logic
});
```

Also add a unique constraint at the database level as a hard backstop:

```sql
-- supabase/migrations/20260911000008_comm_idempotency.sql
-- Prevent duplicate DELIVERED records for the same lead + channel combination
CREATE UNIQUE INDEX idx_comm_logs_idempotency
    ON public.communication_logs (lead_id, channel)
    WHERE status = 'DELIVERED';
```

---

### 16.2 pg_cron Procedure Exception Handling — Silent Batch Failures

**The failure:** `fn_detect_stalled_leads()` iterates over every active lead in a `FOR` loop. If a single lead row has corrupted `metadata` JSONB or an unexpected NULL in a non-nullable join, the entire procedure raises an unhandled exception and exits. pg_cron logs the failure silently. Every lead that would have been flagged in that 60-second window is missed. Stalls accumulate undetected.

**The trigger:** A single bad data row, a failed migration that left NULLs in expected columns, or a consultant-id that was deleted while leads still reference it.

**The fix:** Wrap the loop body in a `BEGIN...EXCEPTION` block so one bad row is logged and skipped without aborting the batch.

```sql
-- Replace the loop body in fn_detect_stalled_leads()
LOOP
    BEGIN  -- Inner exception block per row
        SELECT threshold_hours INTO v_threshold
        FROM public.stage_threshold_configs
        WHERE stage = r.stage;

        IF v_threshold IS NOT NULL THEN
            v_hours_inactive := ROUND(
                EXTRACT(EPOCH FROM (v_now - r.reference_time)) / 3600.0, 1
            );

            IF v_hours_inactive >= v_threshold THEN
                UPDATE public.leads
                SET is_stalled = TRUE, reminder_status = 'PENDING', updated_at = v_now
                WHERE id = r.id;

                IF NOT EXISTS (
                    SELECT 1 FROM public.reminders
                    WHERE lead_id = r.id AND stage_at_stall = r.stage AND is_resolved = FALSE
                ) THEN
                    INSERT INTO public.reminders (lead_id, consultant_id, stage_at_stall,
                                                  hours_inactive, message)
                    VALUES (r.id, r.assigned_consultant_id, r.stage, v_hours_inactive,
                            FORMAT('SLA Breach: %s hrs inactive in %s', v_hours_inactive, r.stage));
                END IF;
            END IF;
        END IF;

    EXCEPTION WHEN OTHERS THEN
        -- Log the failure for this specific row and continue the batch
        INSERT INTO public.activity_logs (lead_id, actor_id, action_type, details)
        VALUES (r.id, NULL, 'CRON_ERROR',
                FORMAT('fn_detect_stalled_leads failed for lead %s: %s', r.id, SQLERRM));
    END;  -- End inner exception block
END LOOP;
```

Add a monitoring query to surface cron errors in the admin dashboard:

```sql
-- Alert query: cron errors in the last hour
SELECT lead_id, details, created_at
FROM public.activity_logs
WHERE action_type = 'CRON_ERROR'
  AND created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

---

### 16.3 Input Validation — Zod Schemas on Every Server Action & API Route

**The failure:** A malicious student submits a lead with `target_country: "<script>alert(1)</script>"` or `metadata: { "gpa": "9999999" }` or a `stage` value that bypasses the TypeScript enum check because Server Actions receive raw JSON. Without validation, this data enters the database and propagates to every consultant's Kanban card.

**The trigger:** Any client that bypasses the React form — a direct HTTP POST to the Server Action endpoint, a browser extension, or a compromised client session.

**The fix:** Define Zod schemas for every mutation and validate before the database write.

```typescript
// src/lib/schemas/lead.schema.ts
import { z } from 'zod';

const ADMISSION_STAGES = [
  'Inquiry', 'Counseling', 'Document Collection',
  'Application', 'Fee/Verification', 'Admitted',
] as const;

export const CreateLeadSchema = z.object({
  target_country: z
    .string()
    .min(2, 'Country is required')
    .max(100)
    .regex(/^[a-zA-Z\s\-]+$/, 'Country must contain only letters'),
  program_id: z.string().uuid().optional(),
  metadata: z.object({
    gpa:            z.number().min(0).max(4.0).nullable(),
    ielts_overall:  z.number().min(0).max(9.0).nullable(),
    target_intake:  z.string().max(20).nullable(),
    budget_range_usd: z.string().max(20).nullable(),
  }).optional(),
});

export const UpdateLeadStageSchema = z.object({
  leadId: z.string().uuid(),
  newStage: z.enum(ADMISSION_STAGES),
});

export const LogConsultationSchema = z.object({
  leadId: z.string().uuid(),
  notes: z.string().min(5, 'Notes must be at least 5 characters').max(2000),
  channel: z.enum(['PHONE', 'WHATSAPP', 'IN_PERSON', 'EMAIL']),
});

export const UpdateSlaThresholdSchema = z.object({
  stage: z.enum(ADMISSION_STAGES),
  threshold_hours: z.number().int().min(1).max(8760), // max 1 year
});
```

```typescript
// src/app/actions/leadActions.ts — validate before every DB write
import { CreateLeadSchema, UpdateLeadStageSchema } from '@/lib/schemas/lead.schema';

export async function createLeadAction(formData: unknown) {
  const parsed = CreateLeadSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }
  // Safe to write — parsed.data is fully typed and validated
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from('leads').insert(parsed.data);
  // ...
}
```

---

### 16.4 Database Concurrency — Lost Update Prevention

**The failure:** Two consultants (or a consultant and the pg_cron job) attempt to update the same lead row simultaneously. Consultant A reads `is_stalled = FALSE`, advances stage. pg_cron also reads `is_stalled = FALSE` for the same row 50ms later and sets `is_stalled = TRUE`. The last writer wins — the stage advance is overwritten. The consultant sees their change silently discarded.

**The trigger:** pg_cron runs every 60 seconds across all leads. Any consultant action during that window on a near-threshold lead creates a race.

**The fix:** Use PostgreSQL optimistic locking via a `version` column. Reject the update if the row was modified since the client last read it.

```sql
-- supabase/migrations/20260911000009_optimistic_locking.sql
ALTER TABLE public.leads ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- Trigger: auto-increment version on every update
CREATE OR REPLACE FUNCTION public.fn_increment_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_increment_lead_version
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_increment_version();
```

```typescript
// src/app/actions/leadActions.ts — version-checked update
export async function updateLeadStageAction(
  leadId: string,
  newStage: string,
  currentVersion: number   // Client passes back the version it last read
) {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from('leads')
    .update({ stage: newStage })
    .eq('id', leadId)
    .eq('version', currentVersion)   // Only update if version hasn't changed
    .select('id, version')
    .single();

  if (!data) {
    // Row was modified by someone else — return conflict error
    return {
      success: false,
      error: 'This lead was updated by another process. Please refresh and try again.',
      conflict: true,
    };
  }

  revalidateTag('analytics-funnel');
  return { success: true, newVersion: data.version };
}
```

---

### 16.5 File Upload Security — Server-Side Enforcement

**The failure:** The frontend validates MIME type and file size in JavaScript. An attacker bypasses the browser entirely, crafts a raw multipart POST directly to the Supabase Storage signed upload URL, and uploads a 500MB executable disguised as a PDF, or an SVG containing embedded `<script>` tags that executes when a consultant previews the file.

**The trigger:** Any direct HTTP client (curl, Postman, custom script) that skips the React UI.

**The fix:** Three layers of enforcement — Storage bucket policy, a server-side revalidation Server Action, and a post-upload Edge Function trigger.

```sql
-- Supabase Storage bucket policy (set in Supabase Dashboard → Storage → Policies)
-- OR via migration using storage schema:

-- Allowed MIME types whitelist (enforce at bucket level)
-- Set in Dashboard: student-docs bucket → Allowed MIME types:
--   application/pdf
--   image/jpeg
--   image/png
--   application/msword
--   application/vnd.openxmlformats-officedocument.wordprocessingml.document
-- Max file size: 10MB (set in bucket config)
```

```typescript
// src/app/actions/documentActions.ts — server-side revalidation after upload
import { z } from 'zod';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function confirmDocumentUploadAction(params: {
  leadId: string;
  storagePath: string;
  declaredMimeType: string;
  declaredSizeBytes: number;
}) {
  // 1. Validate declared metadata server-side
  if (!ALLOWED_MIME_TYPES.includes(params.declaredMimeType as any)) {
    // Delete the file — it slipped through
    const supabase = createSupabaseServerClient();
    await supabase.storage.from('student-docs').remove([params.storagePath]);
    return { success: false, error: 'File type not permitted.' };
  }

  if (params.declaredSizeBytes > MAX_FILE_SIZE_BYTES) {
    const supabase = createSupabaseServerClient();
    await supabase.storage.from('student-docs').remove([params.storagePath]);
    return { success: false, error: 'File exceeds 10MB limit.' };
  }

  // 2. Verify file actually exists in storage (prevents phantom document records)
  const supabase = createSupabaseServerClient();
  const { data: fileData } = await supabase.storage
    .from('student-docs')
    .list(params.storagePath.split('/').slice(0, -1).join('/'));

  const fileName = params.storagePath.split('/').pop();
  const fileExists = fileData?.some((f) => f.name === fileName);
  if (!fileExists) {
    return { success: false, error: 'Upload not confirmed in storage.' };
  }

  // 3. Create the document record only after server-side verification passes
  const { error } = await supabase.from('documents').insert({
    lead_id: params.leadId,
    storage_path: params.storagePath,
    mime_type: params.declaredMimeType,
    file_size_bytes: params.declaredSizeBytes,
    verification_status: 'PENDING',
  });

  return error ? { success: false, error: error.message } : { success: true };
}
```

---

### 16.6 Structured Observability — Logs, Metrics & Alerting

**The failure:** The README mentions Logflare/Axiom/Datadog in one table cell. In practice the codebase has `console.log()` at best and nothing at worst. When pg_cron silently fails at 3am, when the Edge Function starts returning 500s, or when the Realtime channel drops and consultants stop receiving leads, nobody knows until a consultant calls in the next morning. By then every lead that arrived overnight has gone cold.

**Why this matters on a paid plan specifically:** Supabase Pro and Team plans include first-class observability tooling — `pg_stat_statements`, Supabase Dashboard query performance analysis, Logflare log drains, and database CPU/memory metrics. Not using them on a paid plan means paying for infrastructure and flying blind anyway.

**Layer 1 — Structured application logs**

Every Server Action, Edge Function, and scheduled procedure should emit JSON to stdout. Vercel and Supabase both capture stdout and forward it to Logflare automatically on paid plans.

```typescript
// src/lib/logger.ts
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
  level: LogLevel;
  event: string;           // Machine-readable: 'lead.created', 'stall.detected', 'edge_fn.error'
  lead_id?: string;
  consultant_id?: string;
  student_id?: string;
  duration_ms?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

const SENSITIVE_KEYS = ['password', 'token', 'key', 'secret', 'authorization', 'cookie'];

export function log(payload: LogPayload) {
  const sanitized = JSON.parse(JSON.stringify(payload), (k, v) =>
    SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s)) ? '[REDACTED]' : v
  );
  // JSON stdout — ingested by Vercel Log Drains → Logflare/Axiom/Datadog
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...sanitized }));
}
```

Add timing and outcome logging to every Server Action:

```typescript
// src/app/actions/leadActions.ts
export async function updateLeadStageAction(leadId: string, newStage: string) {
  const t = Date.now();
  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from('leads').update({ stage: newStage }).eq('id', leadId);
    if (error) throw error;

    log({ level: 'info', event: 'lead.stage_advanced', lead_id: leadId,
          duration_ms: Date.now() - t, metadata: { new_stage: newStage } });
    revalidateTag('analytics-funnel');
    return { success: true };
  } catch (err) {
    log({ level: 'error', event: 'lead.stage_advance_failed', lead_id: leadId,
          duration_ms: Date.now() - t, error: String(err) });
    return { success: false, error: String(err) };
  }
}
```

**Layer 2 — Supabase native metrics (Pro/Team)**

Enable these in the Supabase Dashboard immediately after provisioning:

```
Dashboard → Database → Query Performance
  → Enable pg_stat_statements extension
  → Review slowest queries weekly
  → Any query with mean_time > 100ms needs an index

Dashboard → Database → Reports
  → Monitor: Connections (should stay below 80% of compute limit via Supavisor)
  → Monitor: Cache hit rate (should be > 99% — if lower, add indexes or increase compute)
  → Monitor: Disk I/O (spike = missing index on a hot query path)

Dashboard → Realtime → Inspector
  → Active channel count per minute
  → Message throughput — alert if drops unexpectedly
  → Subscription errors — surface bad filter expressions

Dashboard → Edge Functions → Logs
  → Error rate per function
  → Cold start p99 (should be < 100ms on Pro)
  → Invocation count — cross-reference with communication_logs DELIVERED count
```

**Layer 3 — Alerting rules**

Configure these in Logflare (built into Supabase) or forward logs to Axiom/Datadog via a log drain:

```
┌──────────────────────────────────────┬──────────────────────────────────────┬──────────────┐
│ Alert                                │ Condition                            │ Severity     │
├──────────────────────────────────────┼──────────────────────────────────────┼──────────────┤
│ Stall detector silent                │ No STALL_TRIGGERED or CRON_ERROR log │ CRITICAL     │
│                                      │ in activity_logs for > 90 seconds    │              │
├──────────────────────────────────────┼──────────────────────────────────────┼──────────────┤
│ Edge Function error rate             │ > 5% of auto-respond-lead calls      │ HIGH         │
│                                      │ return non-200 in any 5-minute window│              │
├──────────────────────────────────────┼──────────────────────────────────────┼──────────────┤
│ Realtime channel drops               │ event: 'channel.disconnected' fires  │ HIGH         │
│                                      │ for a consultant with active leads   │              │
├──────────────────────────────────────┼──────────────────────────────────────┼──────────────┤
│ Communication delivery failures      │ > 3 FAILED rows in communication_logs│ MEDIUM       │
│                                      │ within any 10-minute window          │              │
├──────────────────────────────────────┼──────────────────────────────────────┼──────────────┤
│ Slow Server Action                   │ duration_ms > 3000 in any action log │ MEDIUM       │
├──────────────────────────────────────┼──────────────────────────────────────┼──────────────┤
│ pg_cron row-level error              │ Any CRON_ERROR action_type in        │ HIGH         │
│                                      │ activity_logs                        │              │
├──────────────────────────────────────┼──────────────────────────────────────┼──────────────┤
│ DB cache hit rate degraded           │ Supabase cache_hit_rate < 99%        │ MEDIUM       │
│                                      │ (Dashboard metric threshold)         │              │
├──────────────────────────────────────┼──────────────────────────────────────┼──────────────┤
│ Realtime concurrent channels spike   │ Active channels > 400 (Pro plan)     │ MEDIUM       │
│                                      │ → signal to plan Team upgrade        │              │
└──────────────────────────────────────┴──────────────────────────────────────┴──────────────┘
```

**Layer 4 — Health check endpoint**

External uptime monitors (UptimeRobot, Better Uptime, Checkly) ping this every 60 seconds. A 503 response pages the on-call contact immediately.

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/services/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = {};
  const supabase = createSupabaseServerClient();

  // Check 1: Database reachable and RLS functioning
  try {
    await supabase.from('stage_threshold_configs').select('stage').limit(1);
    checks.database = 'ok';
  } catch { checks.database = 'error'; }

  // Check 2: pg_cron liveness — a STALL_TRIGGERED or CRON_ERROR row
  // in the last 3 minutes proves the procedure is executing
  try {
    const { data } = await supabase
      .from('activity_logs')
      .select('id')
      .in('action_type', ['STALL_TRIGGERED', 'CRON_ERROR'])
      .gte('created_at', new Date(Date.now() - 3 * 60 * 1000).toISOString())
      .limit(1);
    // Not having a row is ambiguous (no stalled leads ≠ cron is broken)
    // so we only fail this check if the query itself throws
    checks.cron = 'ok';
  } catch { checks.cron = 'error'; }

  // Check 3: Storage bucket accessible
  try {
    await supabase.storage.getBucket('student-docs');
    checks.storage = 'ok';
  } catch { checks.storage = 'error'; }

  const allOk = Object.values(checks).every((v) => v === 'ok');
  return NextResponse.json(
    { status: allOk ? 'healthy' : 'degraded', checks, ts: new Date().toISOString() },
    { status: allOk ? 200 : 503 }
  );
}
```
---

### 16.7 Data Retention, Soft Deletes & GDPR Right to Erasure

**The failure:** The README mentions a "Right to be Forgotten" endpoint in one sentence. Without a concrete implementation, a student requests deletion, a developer does a hard `DELETE` on `public.leads`, and the cascade wipes `activity_logs`, `communication_logs`, and `reminders` — destroying audit records that may be legally required for the agency's compliance obligations. Alternatively, nothing is ever deleted and the database grows unbounded.

**The fix:** Two-track approach — soft deletes with a `deleted_at` timestamp for operational data (GDPR erasure by nullifying PII, not deleting rows), and a scheduled hard purge of fully anonymized records after the retention window.

```sql
-- supabase/migrations/20260911000010_soft_deletes.sql

-- Add soft-delete columns
ALTER TABLE public.leads    ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE public.documents ADD COLUMN deleted_at TIMESTAMPTZ;

-- Index for fast exclusion of soft-deleted rows
CREATE INDEX idx_leads_not_deleted    ON public.leads(id)     WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_not_deleted ON public.profiles(id)  WHERE deleted_at IS NULL;

-- Update RLS to exclude soft-deleted rows automatically
-- (Add to existing policies:)
-- USING (...existing condition... AND deleted_at IS NULL)

-- GDPR erasure: nullify PII without destroying audit trail
CREATE OR REPLACE FUNCTION public.fn_erase_student_pii(p_student_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- 1. Anonymize profile — preserve the row for FK integrity
    UPDATE public.profiles SET
        email         = 'erased_' || p_student_id || '@deleted.invalid',
        full_name     = '[ERASED]',
        phone         = NULL,
        avatar_url    = NULL,
        deleted_at    = NOW()
    WHERE id = p_student_id;

    -- 2. Soft-delete all leads
    UPDATE public.leads SET
        metadata   = '{"erased": true}'::jsonb,
        notes      = NULL,
        deleted_at = NOW()
    WHERE student_id = p_student_id;

    -- 3. Delete documents from Storage and mark records erased
    UPDATE public.documents SET
        storage_path        = '[ERASED]',
        verification_status = 'REJECTED',
        deleted_at          = NOW()
    WHERE lead_id IN (
        SELECT id FROM public.leads WHERE student_id = p_student_id
    );

    -- 4. Log the erasure event (keep this row — it is the proof of compliance)
    INSERT INTO public.activity_logs (lead_id, actor_id, action_type, details)
    SELECT id, p_student_id, 'GDPR_ERASED', 'PII erased per student right-to-erasure request'
    FROM public.leads WHERE student_id = p_student_id;
END;
$$;

-- Scheduled hard purge: permanently delete rows soft-deleted > 90 days ago
SELECT cron.schedule(
    'purge-deleted-records-daily',
    '0 2 * * *',  -- 2am UTC daily
    $$
        DELETE FROM public.documents WHERE deleted_at < NOW() - INTERVAL '90 days';
        DELETE FROM public.leads     WHERE deleted_at < NOW() - INTERVAL '90 days';
        -- Do NOT hard-delete profiles — FK integrity required for activity_logs
    $$
);
```

---

### 16.8 Lead Auto-Assignment Engine

**The failure:** The README describes workload balancing as a super-admin manual task. In a real agency, new leads arrive outside business hours. Without auto-assignment, leads sit unassigned in the database and the consultant whose `assigned_consultant_id IS NULL` RLS query returns nothing — they are invisible to everyone until a super-admin manually assigns them. During peak season (September and January intake deadlines), this is dozens of leads per hour.

**The fix:** A database trigger that auto-assigns each new lead using a round-robin algorithm with a capacity cap.

```sql
-- supabase/migrations/20260911000011_auto_assignment.sql

-- Capacity configuration: max active leads per consultant
ALTER TABLE public.profiles ADD COLUMN max_lead_capacity INTEGER NOT NULL DEFAULT 30;
ALTER TABLE public.profiles ADD COLUMN is_accepting_leads BOOLEAN NOT NULL DEFAULT TRUE;

-- Auto-assignment trigger: fires on INSERT to public.leads
CREATE OR REPLACE FUNCTION public.fn_auto_assign_lead()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_consultant_id UUID;
BEGIN
    -- Only auto-assign if no consultant was explicitly specified
    IF NEW.assigned_consultant_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Round-robin: pick the active consultant with fewest current open leads
    -- who has not hit their capacity cap and is accepting leads
    SELECT p.id INTO v_consultant_id
    FROM public.profiles p
    LEFT JOIN public.leads l
        ON l.assigned_consultant_id = p.id
        AND l.deleted_at IS NULL
        AND l.stage != 'Admitted'
    WHERE p.role = 'consultant'
      AND p.is_accepting_leads = TRUE
      AND p.deleted_at IS NULL
      AND (p.branch_id = NEW.branch_id OR NEW.branch_id IS NULL)
    GROUP BY p.id, p.max_lead_capacity
    HAVING COUNT(l.id) < p.max_lead_capacity
    ORDER BY COUNT(l.id) ASC, p.created_at ASC  -- Tie-break: longest-tenured consultant
    LIMIT 1;

    IF v_consultant_id IS NOT NULL THEN
        NEW.assigned_consultant_id = v_consultant_id;
        -- Log the auto-assignment
        INSERT INTO public.activity_logs (lead_id, actor_id, action_type, details)
        VALUES (NEW.id, NULL, 'AUTO_ASSIGNED',
                FORMAT('Lead auto-assigned to consultant %s', v_consultant_id));
    ELSE
        -- No available consultant — flag for manual assignment
        INSERT INTO public.activity_logs (lead_id, actor_id, action_type, details)
        VALUES (NEW.id, NULL, 'ASSIGNMENT_FAILED',
                'No consultant available with remaining capacity');
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_auto_assign_lead
    BEFORE INSERT ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_auto_assign_lead();
```

---

### 16.9 Full-Text Search — Lead & University Discovery

**The failure:** Consultants will eventually manage hundreds of leads. The university catalog will have thousands of programs across dozens of institutions. The current schema has no search capability beyond exact-match filters. A consultant typing "Aryan Ver" in a search box triggers a full table scan with a `LIKE '%Aryan Ver%'` query — PostgreSQL cannot use a B-tree index for leading wildcards. This is a 300ms+ query at scale.

**The fix:** PostgreSQL's native `pg_trgm` extension and `tsvector` columns provide sub-10ms fuzzy search without an external search service.

```sql
-- supabase/migrations/20260911000012_full_text_search.sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes for fuzzy name/email search on profiles
CREATE INDEX idx_profiles_name_trgm  ON public.profiles USING GIN (full_name gin_trgm_ops);
CREATE INDEX idx_profiles_email_trgm ON public.profiles USING GIN (email gin_trgm_ops);

-- Full-text search vector for university programs
ALTER TABLE public.programs
    ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(program_name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(degree_level, '')), 'B')
    ) STORED;

ALTER TABLE public.universities
    ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(country, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(city, '')), 'C')
    ) STORED;

CREATE INDEX idx_programs_search     ON public.programs    USING GIN (search_vector);
CREATE INDEX idx_universities_search ON public.universities USING GIN (search_vector);
```

```typescript
// src/app/actions/searchActions.ts
export async function searchLeadsAction(query: string, consultantId: string) {
  const supabase = createSupabaseServerClient();

  // Trigram similarity search — returns results even with typos
  const { data } = await supabase.rpc('search_leads', {
    p_query: query,
    p_consultant_id: consultantId,
  });
  return data ?? [];
}
```

```sql
-- RPC function for lead search (respects RLS automatically)
CREATE OR REPLACE FUNCTION public.search_leads(p_query TEXT, p_consultant_id UUID)
RETURNS TABLE(lead_id UUID, student_name TEXT, email TEXT, stage TEXT, similarity REAL)
LANGUAGE sql STABLE AS $$
    SELECT l.id, p.full_name, p.email, l.stage::TEXT,
           similarity(p.full_name, p_query) AS sim
    FROM public.leads l
    JOIN public.profiles p ON l.student_id = p.id
    WHERE l.assigned_consultant_id = p_consultant_id
      AND l.deleted_at IS NULL
      AND (
          p.full_name ILIKE '%' || p_query || '%'
          OR similarity(p.full_name, p_query) > 0.3
          OR p.email ILIKE '%' || p_query || '%'
      )
    ORDER BY sim DESC, l.updated_at DESC
    LIMIT 20;
$$;
```

---

### 16.10 Zero-Downtime Database Migrations

**The failure:** A developer runs `supabase db push` to add a `NOT NULL` column to `public.leads`. PostgreSQL acquires an `ACCESS EXCLUSIVE` lock, blocking every read and write on the table for the duration of the migration — potentially several seconds on a table with 50,000 rows. Every consultant's Kanban board freezes. The pg_cron job fails to acquire its lock and skips its evaluation cycle. New student submissions receive a 500 error.

**The trigger:** Any `ALTER TABLE ADD COLUMN NOT NULL`, `CREATE INDEX` (without `CONCURRENTLY`), or `ALTER COLUMN TYPE` on a live table.

**The rules — never break these in production migrations:**

```sql
-- ❌ WRONG — locks the entire table
ALTER TABLE public.leads ADD COLUMN priority TEXT NOT NULL DEFAULT 'MEDIUM';

-- ✅ CORRECT — 3-step zero-downtime pattern
-- Step 1: Add column as nullable (no lock held beyond metadata update)
ALTER TABLE public.leads ADD COLUMN priority TEXT;

-- Step 2: Backfill in batches to avoid long-running transaction
DO $$
DECLARE batch_size INT := 1000; offset_val INT := 0; rows_updated INT;
BEGIN
    LOOP
        UPDATE public.leads SET priority = 'MEDIUM'
        WHERE id IN (
            SELECT id FROM public.leads WHERE priority IS NULL
            ORDER BY created_at LIMIT batch_size
        );
        GET DIAGNOSTICS rows_updated = ROW_COUNT;
        EXIT WHEN rows_updated = 0;
        PERFORM pg_sleep(0.05); -- 50ms pause between batches
    END LOOP;
END $$;

-- Step 3: Add NOT NULL constraint only after backfill is complete
-- (PostgreSQL 12+ validates without rewriting the table if default is set)
ALTER TABLE public.leads
    ALTER COLUMN priority SET DEFAULT 'MEDIUM',
    ALTER COLUMN priority SET NOT NULL;

-- ❌ WRONG — blocks reads during index build
CREATE INDEX idx_leads_priority ON public.leads(priority);

-- ✅ CORRECT — builds index without blocking reads
CREATE INDEX CONCURRENTLY idx_leads_priority ON public.leads(priority);
```

**CI/CD gate — add this check to GitHub Actions:**

```yaml
# .github/workflows/run-database-migrations.yml
- name: Lint migration for unsafe operations
  run: |
    # Fail if any migration contains unsafe DDL patterns
    if grep -rE "ALTER TABLE.*NOT NULL|CREATE INDEX [^C]|DROP COLUMN|ALTER COLUMN.*TYPE" \
       supabase/migrations/*.sql; then
      echo "UNSAFE MIGRATION DETECTED. Use zero-downtime patterns."
      exit 1
    fi
```

---

### 16.11 API Rate Limiting & Abuse Prevention

**The failure:** The student inquiry form is public-facing. A competitor or bot submits 10,000 leads in 60 seconds. Each submission: (1) writes a row to `public.leads`, (2) fires the Database Webhook, (3) triggers the Edge Function, (4) sends an email via Resend, (5) sends a WhatsApp via Twilio. Resend and Twilio charge per message. 10,000 fake leads = thousands of dollars in API charges and a permanently rate-limited Twilio account.

**The fix:** Three layers — Vercel's built-in rate limiting on the Server Action route, a Supabase database-level submission throttle, and a honeypot field on the form.

```typescript
// src/middleware.ts — rate limit the lead submission endpoint
import { NextResponse, type NextRequest } from 'next/server';

// Simple in-memory rate limiter (use Upstash Redis in production for distributed limiting)
const submissionCounts = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_SUBMISSIONS_PER_IP = 3;        // Max 3 lead submissions per IP per minute

export async function middleware(request: NextRequest) {
  // Rate limit only the lead creation Server Action
  if (request.method === 'POST' && request.nextUrl.pathname === '/portal/student') {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const now = Date.now();
    const record = submissionCounts.get(ip);

    if (!record || record.resetAt < now) {
      submissionCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    } else if (record.count >= MAX_SUBMISSIONS_PER_IP) {
      return NextResponse.json(
        { error: 'Too many submissions. Please wait before trying again.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    } else {
      record.count++;
    }
  }

  // ... rest of middleware
}
```

```sql
-- Database-level guard: one active lead per email per 24 hours
-- supabase/migrations/20260911000013_submission_throttle.sql
CREATE UNIQUE INDEX idx_leads_email_daily
    ON public.leads (
        (metadata->>'applicant_email'),
        date_trunc('day', created_at)
    )
    WHERE deleted_at IS NULL;
```

```tsx
// Honeypot field — bots fill it, humans don't
// src/components/portal/StudentForm.tsx
<form>
  {/* Invisible to humans, filled by bots */}
  <input
    type="text"
    name="website"          // Common honeypot field name
    tabIndex={-1}
    autoComplete="off"
    style={{ position: 'absolute', left: '-9999px' }}
    aria-hidden="true"
  />
  {/* ... real form fields ... */}
</form>
```

```typescript
// Server Action: reject if honeypot is filled
export async function createLeadAction(formData: FormData) {
  if (formData.get('website')) {
    // Bot detected — silently succeed but don't write to DB
    return { success: true }; // Don't tell the bot it was rejected
  }
  // ... real processing
}
```

---

### 16.12 In-App Notification Center

**The failure:** Audio chimes work when a consultant has the tab open and active. A consultant working in another browser tab, or whose computer audio is muted, misses new lead arrivals and stall alerts entirely. The current design has no persistent record of notifications that occurred while the consultant was away.

**The fix:** A `notifications` table that persists every alertable event, with a Realtime-powered unread badge count in the UI.

```sql
-- supabase/migrations/20260911000014_notifications.sql
CREATE TYPE notification_type AS ENUM (
    'NEW_LEAD', 'STALL_BREACH', 'STAGE_ADVANCED_BY_STUDENT',
    'DOCUMENT_UPLOADED', 'REMINDER_RESOLVED', 'SYSTEM_ALERT'
);

CREATE TABLE public.notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type            notification_type NOT NULL,
    title           TEXT NOT NULL,
    body            TEXT NOT NULL,
    lead_id         UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications"
    ON public.notifications FOR ALL
    USING (auth.uid() = recipient_id);

-- Auto-create notification when a stall is detected (extend fn_detect_stalled_leads)
-- Add inside the IF v_hours_inactive >= v_threshold block:
INSERT INTO public.notifications (recipient_id, type, title, body, lead_id)
VALUES (
    r.assigned_consultant_id,
    'STALL_BREACH',
    FORMAT('SLA Breach: %s', r.student_name),
    FORMAT('%s has been inactive in %s for %s hours', r.student_name, r.stage, v_hours_inactive),
    r.id
);
```

```typescript
// src/hooks/useNotifications.ts
export function useNotifications(userId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  const query = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  // Realtime patch — new notifications appear instantly without polling
  useEffect(() => {
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications',
          filter: `recipient_id=eq.${userId}` },
        (payload) => {
          queryClient.setQueryData<Notification[]>(
            ['notifications', userId],
            (old = []) => [payload.new as Notification, ...old]
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const unreadCount = query.data?.filter((n) => !n.is_read).length ?? 0;

  const markAllRead = async () => {
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('recipient_id', userId)
      .eq('is_read', false);
    queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
  };

  return { ...query, unreadCount, markAllRead };
}
```

---

### 16.13 Timezone Handling for an International Platform

**The failure:** All `TIMESTAMPTZ` values are stored as UTC — that is correct. The failure is in the display layer. A student in Nairobi (UTC+3) sees their application submitted at `01:15 AM` when it was actually `4:15 AM` their local time. A consultant in Toronto (UTC-5) setting a reminder for "tomorrow" creates it at UTC midnight, which is 7pm their local time the same day. SLA threshold breaches calculated against UTC NOW() are correct, but displayed times confuse consultants across time zones.

**The fix:** Store timezone preference on the profile, format all timestamps client-side using `Intl.DateTimeFormat`, never on the server.

```sql
-- supabase/migrations/20260911000015_timezone.sql
ALTER TABLE public.profiles ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';
-- Seed with reasonable defaults per branch location
-- e.g. Nairobi branch → 'Africa/Nairobi', London → 'Europe/London', Toronto → 'America/Toronto'
```

```typescript
// src/lib/formatDate.ts — always format timestamps client-side
export function formatTimestamp(
  utcTimestamp: string,
  userTimezone: string,
  format: 'datetime' | 'date' | 'relative' = 'datetime'
): string {
  const date = new Date(utcTimestamp);

  if (format === 'relative') {
    const diffMs = Date.now() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 1) return `${Math.round(diffHours * 60)}m ago`;
    if (diffHours < 24) return `${Math.round(diffHours)}h ago`;
    return `${Math.round(diffHours / 24)}d ago`;
  }

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: userTimezone,
    year:   'numeric',
    month:  'short',
    day:    '2-digit',
    hour:   '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

// Usage in components — NEVER use .toLocaleDateString() without a timezone
// ❌ Wrong:  new Date(lead.created_at).toLocaleString()
// ✅ Correct: formatTimestamp(lead.created_at, currentUser.timezone)
```

---

### 16.14 Secret Management & Rotation

**The failure:** A developer accidentally commits `.env.local` to a public GitHub repository. Or a departing developer's personal access token is never revoked. The `SUPABASE_SERVICE_ROLE_KEY` in that file bypasses every RLS policy — the entire student database is now publicly readable.

**The rules and tooling:**

```bash
# .gitignore — these must be present
.env
.env.local
.env.*.local
.env.production
*.pem
*.key
```

```yaml
# .github/workflows/secret-scan.yml — block commits with leaked secrets
name: Secret Scan
on: [push, pull_request]
jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Rotation procedure — run quarterly or after any team member departure:**

```
1. Generate new Supabase service role key in Supabase Dashboard → Settings → API
2. Update secret in Vercel: Dashboard → Project → Settings → Environment Variables
3. Update secret in GitHub Actions: Repository → Settings → Secrets
4. Redeploy Edge Functions: supabase functions deploy --project-ref <ref>
5. Verify: trigger a test lead, confirm auto-respond-lead executes successfully
6. Revoke old key in Supabase Dashboard
7. Record rotation date in team runbook
```

**Never log secrets — add this lint rule:**

```typescript
// src/lib/logger.ts — sanitize before logging
const SENSITIVE_KEYS = ['password', 'token', 'key', 'secret', 'authorization', 'cookie'];

export function log(payload: LogPayload) {
  const sanitized = JSON.parse(JSON.stringify(payload), (key, value) => {
    if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k))) return '[REDACTED]';
    return value;
  });
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), ...sanitized }));
}
```

---

### 16.15 Load & Performance Baselines

**The failure:** The system goes live. An agency posts a viral campaign about free Canada study visa consultation. 2,000 students submit leads in 90 minutes. Nobody knows whether Realtime channels are dropping payloads under load, whether the Supavisor pool is saturating, or what the p95 response time for the Kanban page load actually is under concurrent consultant sessions. There are no baselines to compare against — so there is no way to know if what you are seeing is normal or a degradation.

**Establish these targets before go-live and measure them with k6:**

```javascript
// k6/lead-submission.js — run with: k6 run --vus 50 --duration 60s k6/lead-submission.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% of submissions under 2s
    http_req_failed:   ['rate<0.01'],   // Less than 1% error rate
  },
};

export default function () {
  const res = http.post(
    `${__ENV.BASE_URL}/api/leads`,
    JSON.stringify({
      target_country: 'Canada',
      metadata: { gpa: 3.5, ielts_overall: 7.0, target_intake: 'Fall 2027' },
    }),
    { headers: { 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${__ENV.ANON_KEY}` } }
  );

  check(res, {
    'status is 201': (r) => r.status === 201,
    'lead_id returned': (r) => JSON.parse(r.body).lead_id !== undefined,
  });

  sleep(1);
}
```

**Performance budgets for this system:**

```
┌──────────────────────────────────────┬──────────────┬──────────────────────────────────┐
│ Operation                            │ Target       │ Measurement Method               │
├──────────────────────────────────────┼──────────────┼──────────────────────────────────┤
│ Lead submission → DB write           │ p95 < 500ms  │ k6 load test                     │
│ Kanban page initial load             │ p95 < 1.5s   │ Vercel Analytics + Playwright    │
│ Realtime event → UI update           │ p99 < 200ms  │ Custom WebSocket latency logger  │
│ pg_cron full evaluation cycle        │ < 5s         │ activity_logs timestamp delta    │
│ Edge Function cold start             │ < 100ms      │ Supabase Function logs           │
│ Signed URL generation                │ p95 < 300ms  │ Server Action duration_ms log    │
│ Analytics dashboard load             │ p95 < 800ms  │ TanStack Query devtools          │
│ Full-text lead search                │ p95 < 100ms  │ EXPLAIN ANALYZE on search RPC    │
└──────────────────────────────────────┴──────────────┴──────────────────────────────────┘
```

**Supabase Pro/Team capacity planning:**

On a paid Supabase plan the architectural constraints that matter are not hard limits but scaling decisions that affect cost and latency:

```
┌────────────────────────────────────┬──────────────────────────────────────────────────────┐
│ Resource                           │ Pro/Team Capacity & Scaling Decision                 │
├────────────────────────────────────┼──────────────────────────────────────────────────────┤
│ DB compute (CPU/RAM)               │ Scale up compute add-on when avg CPU > 60% sustained │
│ Realtime concurrent connections    │ Pro: 500 channels. Team: 10,000 channels             │
│                                    │ One RealtimeProvider per consultant = 1 channel.     │
│                                    │ 500 simultaneous consultants → upgrade to Team       │
│ Edge Function invocations          │ Pro: 2M/month included. ~2,000 leads/month = 6K      │
│                                    │ invocations (3 retries max). Well within budget.     │
│ Storage                            │ Pro: 100GB included. Academic portfolios avg 5MB     │
│                                    │ per student = 20,000 students before needing top-up  │
│ Point-in-Time Recovery (PITR)      │ Pro: 7-day PITR. Team: 28-day PITR.                 │
│                                    │ Enable immediately — this is your disaster recovery  │
│ Read replicas                      │ Available on Team plan. Route analytics queries      │
│                                    │ (mv_funnel_snapshot, mv_counselor_performance)       │
│                                    │ to read replica to offload primary DB                │
│ Supavisor (connection pooler)      │ Included on all paid plans. Always use              │
│                                    │ transaction-mode URL for Next.js serverless          │
└────────────────────────────────────┴──────────────────────────────────────────────────────┘
```

**The scaling trigger to watch:** Realtime concurrent channel count. Each consultant browser session holds one persistent WebSocket channel. When the agency has more than 500 simultaneously active consultants, upgrade from Pro to Team. At that scale, also consider enabling a read replica to separate analytical queries from the operational write path.

---

### 16.16 Gap Summary & Resolution Index

Each gap below maps to a concrete migration file, code pattern, or configuration change. The "Breaks Without It" column describes the exact production incident — not a theoretical risk.

```
┌──────┬──────────────────────────────┬────────────────────────────────────────┬─────────────────────────────────────┐
│ §    │ Gap                          │ Breaks Without It                      │ Fix                                 │
├──────┼──────────────────────────────┼────────────────────────────────────────┼─────────────────────────────────────┤
│ 16.1 │ Webhook idempotency          │ Student receives 2 emails + 2 WhatsApp │ Pre-send comm_log check +           │
│      │                              │ on any webhook retry (at-least-once    │ UNIQUE INDEX on (lead_id, channel)  │
│      │                              │ delivery guarantee)                    │ WHERE status = 'DELIVERED'          │
├──────┼──────────────────────────────┼────────────────────────────────────────┼─────────────────────────────────────┤
│ 16.2 │ pg_cron EXCEPTION handling   │ One bad lead row crashes entire stall  │ Per-row BEGIN...EXCEPTION block     │
│      │                              │ detection batch. All stalls missed     │ logs to activity_logs, continues    │
│      │                              │ for that 60s cycle silently            │ processing remaining leads          │
├──────┼──────────────────────────────┼────────────────────────────────────────┼─────────────────────────────────────┤
│ 16.3 │ Zod input validation         │ Direct HTTP POST to Server Action      │ Zod schemas on createLead,          │
│      │                              │ bypasses React form. Arbitrary data    │ updateStage, logConsultation,       │
│      │                              │ written to DB and shown on Kanban      │ updateSlaThreshold actions          │
├──────┼──────────────────────────────┼────────────────────────────────────────┼─────────────────────────────────────┤
│ 16.4 │ Optimistic DB locking        │ pg_cron + consultant UPDATE same lead  │ version INT column + trigger +      │
│      │                              │ within ms. Last writer wins silently.  │ .eq('version', n) conditional write │
│      │                              │ Stage advance disappears               │ returns conflict error to UI        │
├──────┼──────────────────────────────┼────────────────────────────────────────┼─────────────────────────────────────┤
│ 16.5 │ Server-side file validation  │ Attacker POSTs 500MB executable to     │ confirmDocumentUploadAction:        │
│      │                              │ Storage signed URL, bypassing browser  │ MIME allowlist check + size cap +   │
│      │                              │ JS checks entirely                     │ delete-and-reject on failure        │
├──────┼──────────────────────────────┼────────────────────────────────────────┼─────────────────────────────────────┤
│ 16.6 │ Structured observability     │ pg_cron fails at 3am. Edge Function    │ JSON logger + Supabase Pro native   │
│      │                              │ starts 500ing. Realtime drops. All     │ metrics + 8 alerting rules +        │
│      │                              │ discovered next morning via phone call │ /api/health endpoint                │
├──────┼──────────────────────────────┼────────────────────────────────────────┼─────────────────────────────────────┤
│ 16.7 │ Soft deletes + GDPR erasure  │ Hard DELETE CASCADE wipes activity_    │ deleted_at columns + partial        │
│      │                              │ logs and comm_logs required for FERPA  │ indexes + fn_erase_student_pii()    │
│      │                              │ compliance. Alternate: DB grows forever│ + daily pg_cron hard purge          │
├──────┼──────────────────────────────┼────────────────────────────────────────┼─────────────────────────────────────┤
│ 16.8 │ Auto-assignment engine       │ Leads arrive at night with NULL        │ BEFORE INSERT trigger: round-robin  │
│      │                              │ assigned_consultant_id. Invisible to   │ to consultant with fewest leads,    │
│      │                              │ all consultants. No alert fires.       │ respects max_lead_capacity cap      │
├──────┼──────────────────────────────┼────────────────────────────────────────┼─────────────────────────────────────┤
│ 16.9 │ Full-text search             │ LIKE '%name%' is sequential scan.      │ pg_trgm trigram indexes on          │
│      │                              │ 300ms+ per keystroke at 10k leads.     │ profiles + tsvector generated cols  │
│      │                              │ Search unusable in production          │ on programs + universities          │
├──────┼──────────────────────────────┼────────────────────────────────────────┼─────────────────────────────────────┤
│ 16.10│ Zero-downtime migrations     │ ALTER TABLE NOT NULL locks leads table │ 3-step: add nullable → batch        │
│      │                              │ entirely. All Kanban boards freeze     │ backfill → set NOT NULL.            │
│      │                              │ for duration of migration              │ CREATE INDEX CONCURRENTLY always    │
├──────┼──────────────────────────────┼────────────────────────────────────────┼─────────────────────────────────────┤
│ 16.11│ Rate limiting + honeypot     │ Bot submits 10,000 fake leads. Each    │ Middleware IP limiter (3/min/IP)    │
│      │                              │ triggers Resend + Twilio charge.       │ + DB unique index per email/day +   │
│      │                              │ Thousands in API bills in one hour     │ honeypot form field                 │
├──────┼──────────────────────────────┼────────────────────────────────────────┼─────────────────────────────────────┤
│ 16.12│ Notification center          │ Audio chime needs active tab + unmuted │ notifications table + Realtime      │
│      │                              │ audio. Consultant with muted browser   │ patch into TanStack Query +         │
│      │                              │ misses every lead and stall alert      │ unread badge + markAllRead()        │
├──────┼──────────────────────────────┼────────────────────────────────────────┼─────────────────────────────────────┤
│ 16.13│ Timezone handling            │ Consultant in Nairobi (UTC+3) sees     │ timezone TEXT on profiles +         │
│      │                              │ SLA breach at 01:15 instead of 04:15. │ formatTimestamp() using             │
│      │                              │ Teams dispute breach responsibility    │ Intl.DateTimeFormat with user TZ    │
├──────┼──────────────────────────────┼────────────────────────────────────────┼─────────────────────────────────────┤
│ 16.14│ Secret management & rotation │ Committed .env.local with SERVICE_ROLE │ gitleaks GitHub Actions gate +      │
│      │                              │ _KEY bypasses every RLS policy. Full   │ quarterly rotation procedure +      │
│      │                              │ database publicly readable             │ log sanitizer for REDACTED fields   │
├──────┼──────────────────────────────┼────────────────────────────────────────┼─────────────────────────────────────┤
│ 16.15│ Load & performance baselines │ No k6 scripts means no definition of   │ k6 lead-submission script +         │
│      │                              │ "working correctly under load." First  │ p95 performance budgets +           │
│      │                              │ time you find out is a live incident   │ Supabase Pro capacity planning      │
└──────┴──────────────────────────────┴────────────────────────────────────────┴─────────────────────────────────────┘
```

---

## 17. Deep System Gaps — Domain, Ops & Product

Section 16 covered infrastructure-level hardening. This section goes deeper into the domain logic, operational workflows, and product decisions that the architecture assumes are solved but never actually implements. These are the gaps that surface not in load tests or security scans, but in the first three months of a real agency using the system every day.

```
┌──────┬──────────────────────────────────────────┬───────────────────────────────────────────────────────────────┐
│ §    │ Gap                                      │ Why it exists / What breaks without it                        │
├──────┼──────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
│ 17.1 │ Stage transition enforcement             │ No DB constraint — consultant can drag Inquiry → Admitted in  │
│      │                                          │ one move, skipping all compliance checkpoints                 │
├──────┼──────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
│ 17.2 │ Multi-university applications per student│ Schema has one program_id per lead. Real students apply to    │
│      │                                          │ 3-5 universities. Current model duplicates leads, double-     │
│      │                                          │ counts students in funnel, sends multiple welcome emails      │
├──────┼──────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
│ 17.3 │ Consultant offboarding & lead handover   │ Consultant resigns. Their leads stay assigned to a dead       │
│      │                                          │ account. RLS returns them to nobody. Students go silent.      │
├──────┼──────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
│ 17.4 │ Document versioning                      │ Student re-uploads a corrected document. Original rejected    │
│      │                                          │ file orphaned in Storage. No version chain. No way to know    │
│      │                                          │ which file is current.                                        │
├──────┼──────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
│ 17.5 │ Outbound student status communications   │ Only one email fires — on lead creation. No automated         │
│      │                                          │ notification when stage advances. Students call consultants   │
│      │                                          │ daily to ask "what is happening with my application?"         │
├──────┼──────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
│ 17.6 │ Realtime gap recovery on reconnect       │ Consultant loses WiFi for 90 seconds. Reconnects. Any leads   │
│      │                                          │ or stall events during the gap are silently lost forever.     │
├──────┼──────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
│ 17.7 │ Channel filter stale on lead reassignment│ Filter set at mount time. Super-admin reassigns a lead mid-   │
│      │                                          │ session. Old consultant still receives updates. New           │
│      │                                          │ consultant sees nothing until page refresh.                   │
├──────┼──────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
│ 17.8 │ seed.sql not implemented                 │ File tree references seed.sql and demo toolbar promises       │
│      │                                          │ "Seed 10 Realistic Leads." Neither exists. Demo is broken     │
│      │                                          │ on every fresh clone.                                         │
├──────┼──────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
│ 17.9 │ CI/CD pipeline content missing           │ Three .yml files listed but never specified. Type checks,     │
│      │                                          │ pgTAP tests, migration diffs — all assumed, none defined.     │
├──────┼──────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
│ 17.10│ Backup restore never tested              │ PITR enabled. Restore procedure never documented or tested.   │
│      │                                          │ Untested backup = assumption. Verified restore = safety net.  │
├──────┼──────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
│ 17.11│ No MFA for consultants / super-admins    │ Magic link only. Compromised consultant email = full CRM      │
│      │                                          │ access to all assigned student PII and documents.             │
├──────┼──────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
│ 17.12│ audit_log RLS allows deletion            │ activity_logs claimed tamper-proof. No DELETE/UPDATE RLS      │
│      │                                          │ policy. A consultant can erase their own audit trail.         │
├──────┼──────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
│ 17.13│ Email deliverability not configured      │ Resend on default domain → 40-60% spam rate. No custom        │
│      │                                          │ sending domain, no DKIM/SPF/DMARC. First student touchpoint  │
│      │                                          │ lands in junk folder.                                         │
├──────┼──────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
│ 17.14│ WhatsApp template approval missing       │ Edge Function sends freeform body. Meta only allows freeform  │
│      │                                          │ within 24h customer service window. Initial outbound message  │
│      │                                          │ to new students fails with 400 every time.                    │
├──────┼──────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
│ 17.15│ No feature flags / kill switches         │ SLA threshold change takes effect globally instantly. A       │
│      │                                          │ misconfigured value at 11pm affects all active leads          │
│      │                                          │ worldwide with no rollback path.                              │
├──────┼──────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
│ 17.16│ No reporting or data export              │ Super-admins cannot export leads to CSV, generate monthly     │
│      │                                          │ commission reports, or produce university partner reviews.    │
│      │                                          │ Day-one enterprise request with zero implementation.          │
├──────┼──────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
│ 17.17│ No CORS policy on API routes             │ Any origin can POST to Route Handlers using a user's          │
│      │                                          │ credentials. No allowlist defined anywhere.                   │
└──────┴──────────────────────────────────────────┴───────────────────────────────────────────────────────────────┘
```

---

### 17.1 Stage Transition Enforcement — Finite State Machine

**The problem:** The current design allows any stage → any stage. A consultant can move a lead from `Inquiry` directly to `Admitted` skipping Document Collection, Application, and Fee/Verification entirely. This violates the agency's compliance requirements with partner universities who require documented proof of each stage being completed. It also corrupts funnel analytics — a lead that jumps stages has no `dwell_time_seconds` for the skipped stages.

**The real business rule:** Each stage can only advance to the next one in sequence. Backward movement is allowed only by a super-admin (to handle university rejections or document resubmission). Lateral movement is not valid.

```sql
-- supabase/migrations/20260911000016_stage_fsm.sql

-- Valid forward transitions (consultant-permitted)
-- Valid backward transitions (super-admin only, for rejection/resubmission)
CREATE OR REPLACE FUNCTION public.fn_enforce_stage_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_role TEXT;
    v_stage_order INT;
    v_new_stage_order INT;
BEGIN
    -- Only enforce if stage is actually changing
    IF OLD.stage = NEW.stage THEN RETURN NEW; END IF;

    -- Get numeric order of each stage
    v_stage_order := CASE OLD.stage
        WHEN 'Inquiry'             THEN 1
        WHEN 'Counseling'          THEN 2
        WHEN 'Document Collection' THEN 3
        WHEN 'Application'         THEN 4
        WHEN 'Fee/Verification'    THEN 5
        WHEN 'Admitted'            THEN 6
        ELSE 0
    END;

    v_new_stage_order := CASE NEW.stage
        WHEN 'Inquiry'             THEN 1
        WHEN 'Counseling'          THEN 2
        WHEN 'Document Collection' THEN 3
        WHEN 'Application'         THEN 4
        WHEN 'Fee/Verification'    THEN 5
        WHEN 'Admitted'            THEN 6
        ELSE 0
    END;

    -- Forward move of more than 1 step = forbidden for anyone
    IF v_new_stage_order > v_stage_order + 1 THEN
        RAISE EXCEPTION 'Invalid stage jump: % → %. Stages must advance one step at a time.',
            OLD.stage, NEW.stage;
    END IF;

    -- Backward move = super-admin only
    IF v_new_stage_order < v_stage_order THEN
        SELECT role INTO v_role
        FROM public.profiles WHERE id = auth.uid();

        IF v_role != 'super_admin' THEN
            RAISE EXCEPTION 'Stage regression (% → %) requires super_admin role.',
                OLD.stage, NEW.stage;
        END IF;
    END IF;

    -- Log the transition reason if moving backward
    IF v_new_stage_order < v_stage_order THEN
        INSERT INTO public.activity_logs (lead_id, actor_id, action_type, details)
        VALUES (NEW.id, auth.uid(), 'STAGE_REGRESSION',
                FORMAT('Admin reverted stage from %s to %s', OLD.stage, NEW.stage));
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_enforce_stage_transition
    BEFORE UPDATE OF stage ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_enforce_stage_transition();
```

---

### 17.2 Multi-University Applications Per Student

**The problem:** The current schema gives each lead one `program_id`. In practice, a student applying for MSc Data Science applies to UCL, University of Manchester, and Edinburgh simultaneously — three separate applications, one student. The current model forces three separate `leads` rows for the same student. This means:
- Three welcome emails fire on creation
- The student appears three times in funnel analytics
- The consultant manages three disconnected cards for the same person
- `student_id` RLS returns all three leads but there is no grouping concept

**The fix:** Introduce an `applications` table as a child of `leads`. One lead = one student engagement. Multiple applications = multiple university targets tracked under that single engagement.

```sql
-- supabase/migrations/20260911000017_multi_applications.sql

-- A student engagement (the lead) can target multiple universities
CREATE TABLE public.applications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id             UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    program_id          UUID NOT NULL REFERENCES public.programs(id),
    university_id       UUID NOT NULL REFERENCES public.universities(id),
    status              TEXT NOT NULL DEFAULT 'SHORTLISTED',
    -- SHORTLISTED → APPLIED → CONDITIONAL_OFFER → UNCONDITIONAL_OFFER
    -- → REJECTED → WITHDRAWN → ENROLLED
    offer_type          TEXT,    -- 'CONDITIONAL' | 'UNCONDITIONAL'
    offer_received_at   TIMESTAMPTZ,
    offer_deadline      TIMESTAMPTZ, -- When student must accept/decline
    enrollment_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- A student cannot have duplicate applications to the same program
CREATE UNIQUE INDEX idx_applications_no_duplicate
    ON public.applications (lead_id, program_id);

-- RLS mirrors lead access
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students see own applications"
    ON public.applications FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.leads
        WHERE leads.id = applications.lead_id
          AND leads.student_id = auth.uid()
    ));

CREATE POLICY "Consultants manage assigned applications"
    ON public.applications FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.leads
        WHERE leads.id = applications.lead_id
          AND leads.assigned_consultant_id = auth.uid()
    ));

CREATE POLICY "Super admins full access"
    ON public.applications FOR ALL USING (public.is_super_admin());

-- Remove the direct program_id from leads — it is now carried by applications
-- (Run only after backfilling existing data)
-- ALTER TABLE public.leads DROP COLUMN program_id;
```

---

### 17.3 Consultant Offboarding & Lead Handover

**The problem:** A consultant account is deactivated or deleted. Their leads have `assigned_consultant_id` pointing to a non-existent or deactivated profile. The RLS policy `auth.uid() = assigned_consultant_id` will never match for any active session — those leads become invisible to all consultants. Students stop receiving updates. The super-admin has no dashboard signal that these leads are orphaned.

```sql
-- supabase/migrations/20260911000018_consultant_offboarding.sql

-- 1. Soft-deactivate consultants, never hard-delete them
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

-- 2. Trigger: when a consultant is deactivated, flag all their leads for reassignment
CREATE OR REPLACE FUNCTION public.fn_handle_consultant_deactivation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Only act when is_active transitions FALSE
    IF OLD.is_active = TRUE AND NEW.is_active = FALSE AND OLD.role = 'consultant' THEN

        -- Flag all open leads as needing reassignment
        UPDATE public.leads
        SET reminder_status = 'REASSIGNMENT_REQUIRED',
            updated_at      = NOW()
        WHERE assigned_consultant_id = OLD.id
          AND stage != 'Admitted'
          AND deleted_at IS NULL;

        -- Notify all super-admins
        INSERT INTO public.notifications (recipient_id, type, title, body)
        SELECT p.id,
               'SYSTEM_ALERT',
               FORMAT('Consultant %s deactivated', OLD.full_name),
               FORMAT('%s leads require reassignment after %s was deactivated.',
                      (SELECT COUNT(*) FROM public.leads
                       WHERE assigned_consultant_id = OLD.id
                         AND stage != 'Admitted'),
                      OLD.full_name)
        FROM public.profiles p
        WHERE p.role = 'super_admin' AND p.is_active = TRUE;

        -- Log the event
        INSERT INTO public.activity_logs (lead_id, actor_id, action_type, details)
        SELECT l.id, auth.uid(), 'CONSULTANT_DEACTIVATED',
               FORMAT('Assigned consultant %s deactivated. Lead requires reassignment.', OLD.full_name)
        FROM public.leads l
        WHERE l.assigned_consultant_id = OLD.id
          AND l.stage != 'Admitted';

        -- Decision 2 (resolved): Notify the student their consultant has changed.
        -- Queue a communication_logs entry for each affected student.
        -- The process-communication-queue Edge Function dispatches the WhatsApp
        -- using the pre-approved 'consultant_reassigned' template (§17.14).
        -- B3 activity timeline will show: "Your case has been transferred · [date]"
        INSERT INTO public.communication_logs
            (lead_id, channel, recipient, subject, content_snippet, status)
        SELECT
            l.id,
            'WHATSAPP',
            p.phone,
            'Your dedicated advisor has changed',
            FORMAT(
                'Your application is being transferred to a new advisor who will be in touch shortly. Your reference is #%s.',
                SUBSTRING(l.id::TEXT, 1, 8)
            ),
            CASE WHEN p.phone IS NOT NULL THEN 'QUEUED' ELSE 'FAILED' END
        FROM public.leads l
        JOIN public.profiles p ON l.student_id = p.id
        WHERE l.assigned_consultant_id = OLD.id
          AND l.stage != 'Admitted'
          AND l.deleted_at IS NULL;

        -- Also insert a B3-visible activity log entry for each affected student
        INSERT INTO public.activity_logs (lead_id, actor_id, action_type, details)
        SELECT l.id, NULL, 'CONSULTANT_REASSIGNED_STUDENT_NOTIFIED',
               'Your case has been transferred to a new advisor.'
        FROM public.leads l
        WHERE l.assigned_consultant_id = OLD.id
          AND l.stage != 'Admitted'
          AND l.deleted_at IS NULL;

    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_consultant_deactivation
    AFTER UPDATE OF is_active ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_handle_consultant_deactivation();

-- Note: the same student notification logic should fire on a MANUAL reassignment
-- (admin changes assigned_consultant_id directly, not via deactivation).
-- Add a separate trigger on UPDATE OF assigned_consultant_id ON public.leads:

CREATE OR REPLACE FUNCTION public.fn_notify_student_on_reassignment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_student_phone TEXT;
BEGIN
    -- Only fire when assigned_consultant_id actually changes to a new non-null value
    IF OLD.assigned_consultant_id IS NOT DISTINCT FROM NEW.assigned_consultant_id THEN
        RETURN NEW;
    END IF;
    IF NEW.assigned_consultant_id IS NULL THEN
        RETURN NEW; -- Unassignment handled by deactivation trigger above
    END IF;

    -- Get student phone
    SELECT phone INTO v_student_phone
    FROM public.profiles WHERE id = NEW.student_id;

    -- Queue WhatsApp notification
    INSERT INTO public.communication_logs
        (lead_id, channel, recipient, subject, content_snippet, status)
    VALUES (
        NEW.id,
        'WHATSAPP',
        COALESCE(v_student_phone, ''),
        'Your dedicated advisor has changed',
        FORMAT(
            'Your application (Ref: #%s) has been assigned to a new advisor who will be in touch shortly.',
            SUBSTRING(NEW.id::TEXT, 1, 8)
        ),
        CASE WHEN v_student_phone IS NOT NULL THEN 'QUEUED' ELSE 'FAILED' END
    );

    -- B3-visible system event
    INSERT INTO public.activity_logs (lead_id, actor_id, action_type, details)
    VALUES (
        NEW.id,
        auth.uid(),
        'CONSULTANT_REASSIGNED_STUDENT_NOTIFIED',
        'Your case has been transferred to a new advisor.'
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_notify_student_on_reassignment
    AFTER UPDATE OF assigned_consultant_id ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_notify_student_on_reassignment();
```

---

### 17.4 Document Versioning

**The problem:** When a student re-uploads a corrected document (e.g., a renewed passport, an updated IELTS scorecard), the new file creates a new `documents` row. The old rejected row stays in the table with `verification_status = 'REJECTED'`. Storage holds both files. The consultant sees two passport entries with no clear indication of which is current. Signed URL generation picks the first match by default, potentially serving the rejected document.

```sql
-- supabase/migrations/20260911000019_document_versioning.sql

ALTER TABLE public.documents
    ADD COLUMN version         INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN superseded_by   UUID REFERENCES public.documents(id),
    ADD COLUMN is_current      BOOLEAN NOT NULL DEFAULT TRUE;

-- When a new document of the same type is uploaded for the same lead,
-- mark previous versions as superseded
CREATE OR REPLACE FUNCTION public.fn_supersede_prior_document()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Mark all prior versions of this document_type for this lead as not current
    UPDATE public.documents
    SET is_current    = FALSE,
        superseded_by = NEW.id,
        version       = version  -- keep original version number for history
    WHERE lead_id       = NEW.lead_id
      AND document_type = NEW.document_type
      AND id            != NEW.id
      AND is_current    = TRUE;

    -- Set the new document's version number
    NEW.version := COALESCE(
        (SELECT MAX(version) + 1
         FROM public.documents
         WHERE lead_id       = NEW.lead_id
           AND document_type = NEW.document_type),
        1
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_supersede_prior_document
    BEFORE INSERT ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_supersede_prior_document();

-- Always query current documents only:
-- SELECT * FROM public.documents WHERE lead_id = $1 AND is_current = TRUE;
```

---

### 17.5 Outbound Student Status Communications

**The problem:** Work 2 documents the welcome email and WhatsApp on lead creation. After that, the student hears nothing from the system unless the consultant manually contacts them. When their application moves from `Application` to `Fee/Verification` — meaning a university has issued a conditional offer — the student has no automated notification. They either call the agency daily or, more likely, assume their application is lost and contact a competitor.

This is the single largest source of student drop-off after the initial inquiry stage.

```sql
-- supabase/migrations/20260911000020_student_stage_notifications.sql

-- Extend the audit trigger to dispatch student-facing communications on key transitions
CREATE OR REPLACE FUNCTION public.fn_notify_student_on_stage_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_student_email TEXT;
    v_student_name  TEXT;
    v_student_phone TEXT;
BEGIN
    IF OLD.stage = NEW.stage THEN RETURN NEW; END IF;

    -- Fetch student contact details
    SELECT email, full_name, phone
    INTO v_student_email, v_student_name, v_student_phone
    FROM public.profiles
    WHERE id = NEW.student_id;

    -- Queue a communication log entry — the Edge Function polls for QUEUED rows
    -- (or a Database Webhook fires on INSERT to communication_logs)
    INSERT INTO public.communication_logs
        (lead_id, channel, recipient, subject, content_snippet, status)
    VALUES (
        NEW.id,
        'EMAIL',
        v_student_email,
        FORMAT('Your Application Update: %s', NEW.stage),
        FORMAT('Your application has advanced to the %s stage. Log in to your portal for details.',
               NEW.stage),
        'QUEUED'
    );

    -- WhatsApp update for key milestones only (avoid message fatigue)
    IF NEW.stage IN ('Application', 'Fee/Verification', 'Admitted') AND v_student_phone IS NOT NULL THEN
        INSERT INTO public.communication_logs
            (lead_id, channel, recipient, subject, content_snippet, status)
        VALUES (
            NEW.id,
            'WHATSAPP',
            v_student_phone,
            FORMAT('Application milestone: %s', NEW.stage),
            FORMAT('Great news! Your application has reached the %s stage. Check your portal.',
                   NEW.stage),
            'QUEUED'
        );
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_notify_student_on_stage_change
    AFTER UPDATE OF stage ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_notify_student_on_stage_change();
```

Then add a second Edge Function or extend `auto-respond-lead` to process `QUEUED` communication log rows:

```typescript
// supabase/functions/process-communication-queue/index.ts
// Triggered by a Database Webhook on INSERT to communication_logs WHERE status = 'QUEUED'
// Processes the queued message, dispatches via Resend/Twilio, updates status to DELIVERED/FAILED
```

---

### 17.6 Realtime Gap Recovery on Network Reconnect

**The problem:** Supabase Realtime's Elixir/Phoenix channel does auto-reconnect after a network drop. But it does not replay events that occurred during the disconnection window. A consultant whose connection drops for 2 minutes during a busy morning will have a Kanban board missing all leads that arrived in that window. They will not know anything is missing — the board just looks quiet.

```typescript
// src/providers/RealtimeProvider.tsx — add gap recovery on reconnect

channelRef.current = supabase
  .channel('crm-pipeline-singleton')
  // ... existing .on() handlers ...
  .on('system', {}, async (payload) => {
    if (payload.extension === 'postgres_changes' && payload.status === 'ok') {
      // Channel (re)connected — fetch any rows updated since last known timestamp
      // to fill the gap window
      const lastKnownTimestamp = lastSyncRef.current ?? new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const { data: missedLeads } = await supabase
        .from('leads')
        .select('*')
        .eq('assigned_consultant_id', consultantId)
        .gte('updated_at', lastKnownTimestamp)
        .order('updated_at', { ascending: true });

      if (missedLeads && missedLeads.length > 0) {
        // Merge missed leads into current state
        setLeads((prev) => {
          const existingIds = new Set(prev.map((l) => l.id));
          const newOnes = missedLeads.filter((l) => !existingIds.has(l.id));
          const updated = prev.map((l) => {
            const fresh = missedLeads.find((m) => m.id === l.id);
            return fresh ?? l;
          });
          return [...newOnes, ...updated];
        });

        log({ level: 'info', event: 'realtime.gap_recovered',
              consultant_id: consultantId,
              metadata: { missed_count: missedLeads.length, since: lastKnownTimestamp } });
      }
    }
  })
  .subscribe();
```

Track the last sync timestamp after every Realtime event:

```typescript
const lastSyncRef = useRef<string>(new Date().toISOString());

// Inside each .on() handler, after updating state:
lastSyncRef.current = new Date().toISOString();
```

---

### 17.7 Realtime Channel Filter Stale on Lead Reassignment

**The problem:** The Realtime channel filter `assigned_consultant_id=eq.{consultantId}` is set at subscription time. PostgreSQL evaluates this filter against the row's value at the time of the change event. When a super-admin reassigns a lead from Consultant A to Consultant B:
- The UPDATE sets `assigned_consultant_id = B_id`
- Supabase Realtime evaluates the filter against the NEW row value
- Consultant A's channel filter (`assigned_consultant_id=eq.A_id`) no longer matches → A stops receiving updates ✓
- Consultant B's channel filter (`assigned_consultant_id=eq.B_id`) now matches the new row → B receives the UPDATE event ✓

This actually works correctly for assignment changes. The real gap is the **INSERT case**: when a lead is created and auto-assigned (Section 16.8 trigger), the INSERT fires before the assignment trigger completes. The initial INSERT row has `assigned_consultant_id = NULL`. Realtime broadcasts the INSERT with the NULL value. Consultant B's filter `assigned_consultant_id=eq.B_id` does not match NULL — B never receives the new lead notification. Only the subsequent UPDATE (when the trigger sets the consultant) reaches B.

```typescript
// src/providers/RealtimeProvider.tsx — listen for both INSERT and UPDATE
// The gap recovery in 17.6 handles this — the UPDATE event carries the assigned consultant.
// But add an explicit handler for the UPDATE that catches newly-assigned leads:

.on('postgres_changes',
  { event: 'UPDATE', schema: 'public', table: 'leads',
    filter: `assigned_consultant_id=eq.${consultantId}` },
  (payload) => {
    const updated = payload.new as Lead;
    const wasUnassigned = !(payload.old as Lead)?.assigned_consultant_id;

    if (wasUnassigned && updated.assigned_consultant_id === consultantId) {
      // This lead was just auto-assigned to this consultant — treat as a new arrival
      setLeads((prev) => [updated, ...prev]);
      audioRef.current?.play().catch(() => {});
      log({ level: 'info', event: 'lead.auto_assigned_received',
            lead_id: updated.id, consultant_id: consultantId });
      return;
    }
    // ... rest of update handling
  }
)
```

---

### 17.8 seed.sql — Complete Implementation

**The problem:** The file tree lists `supabase/seed.sql` and the demo toolbar promises "Seed 10 Realistic Leads" but the file's contents are never defined anywhere in this document. Every developer who clones this repository and runs `supabase db reset` gets an empty database. The entire Section 10 demo script is broken on a fresh install.

```sql
-- supabase/seed.sql — complete seed for local development and demo

-- 1. Seed partner universities
INSERT INTO public.universities (id, name, country, city, partnership_tier, is_active) VALUES
('00000000-0000-0000-0000-000000000001', 'University of Toronto',       'Canada',        'Toronto',   'Direct Agreement', TRUE),
('00000000-0000-0000-0000-000000000002', 'University College London',   'United Kingdom','London',    'Preferred',        TRUE),
('00000000-0000-0000-0000-000000000003', 'Technical University Munich', 'Germany',       'Munich',    'Standard',         TRUE),
('00000000-0000-0000-0000-000000000004', 'University of Melbourne',     'Australia',     'Melbourne', 'Preferred',        TRUE),
('00000000-0000-0000-0000-000000000005', 'McGill University',           'Canada',        'Montreal',  'Direct Agreement', TRUE);

-- 2. Seed programs
INSERT INTO public.programs (id, university_id, program_name, degree_level, annual_tuition_usd) VALUES
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'MSc Computer Science',    'MSc', 32000),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'MSc Data Science',        'MSc', 38000),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'MSc Electrical Eng.',     'MSc', 18000),
('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'MBA',                     'MBA', 45000),
('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 'BEng Software Eng.',      'BSc', 28000);

-- 3. Seed SLA thresholds (should already exist from migration but seed is idempotent)
INSERT INTO public.stage_threshold_configs (stage, threshold_hours, severity) VALUES
('Inquiry',             24,     'HIGH'),
('Counseling',          48,     'MEDIUM'),
('Document Collection', 72,     'MEDIUM'),
('Application',         48,     'HIGH'),
('Fee/Verification',    24,     'CRITICAL'),
('Admitted',            999999, 'NONE')
ON CONFLICT (stage) DO NOTHING;

-- NOTE: Auth users and profiles for consultants/students are created via
-- Supabase Auth — they cannot be seeded directly in seed.sql.
-- Use the Demo Toolbar (Section 10) or supabase/tests/fixtures.sql for
-- test-specific user creation via the service role client.
```

---

### 17.9 CI/CD Pipeline — Full Implementation

**The problem:** Three `.yml` files are listed in the file tree but their content is never defined. The deployment pipeline is assumed to exist. Without explicit pipeline definitions, developers push directly to main, migrations run manually, and Edge Functions are deployed by hand. This is the fastest path to a production incident.

```yaml
# .github/workflows/vercel-production-build.yml
name: CI — Type Check, Test & Deploy
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with: { version: 9 }

      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }

      - run: pnpm install --frozen-lockfile

      - name: TypeScript type check
        run: pnpm tsc --noEmit

      - name: Lint
        run: pnpm eslint src --max-warnings 0

      - name: Unsafe migration lint
        run: |
          if grep -rE "ALTER TABLE.+NOT NULL|^CREATE INDEX [^C]|DROP COLUMN" \
             supabase/migrations/*.sql 2>/dev/null; then
            echo "UNSAFE DDL detected. Use zero-downtime patterns (Section 16.10)."
            exit 1
          fi

      - name: Secret scan
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  deploy:
    needs: quality
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

```yaml
# .github/workflows/run-database-migrations.yml
name: DB Migrations
on:
  push:
    branches: [main]
    paths: ['supabase/migrations/**']

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: supabase/setup-cli@v1
        with: { version: latest }

      - name: Apply migrations
        run: |
          supabase db push \
            --db-url "${{ secrets.DIRECT_URL }}"
        # Uses DIRECT_URL (not pooler) — migrations require session-mode connection
```

```yaml
# .github/workflows/deploy-edge-functions.yml
name: Edge Functions Deploy
on:
  push:
    branches: [main]
    paths: ['supabase/functions/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: supabase/setup-cli@v1
        with: { version: latest }

      - name: Deploy Edge Functions
        run: |
          supabase functions deploy auto-respond-lead \
            --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
          supabase functions deploy send-stall-digest \
            --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

---

### 17.10 Backup Restore Verification Procedure

**The problem:** Supabase PITR is enabled. Nobody has ever tested restoring from it. A backup that has never been tested is not a backup — it is a hope. The moment you actually need it is the worst possible time to discover the restore process takes 4 hours or fails entirely.

**Run this quarterly:**

```
1. PREPARE
   - Clone the production Supabase project to a temporary project
     (Supabase Dashboard → Project Settings → Restore to new project)
   - Note the timestamp of a known good state (e.g., "yesterday 10am UTC")

2. RESTORE
   - Select PITR restore point in the temp project dashboard
   - Wait for restore completion (typically 15-30 min on Pro)

3. VERIFY DATA INTEGRITY
   - Connect to restored project with psql
   - Run: SELECT COUNT(*) FROM public.leads;
   - Compare against production count for that timestamp
   - Run: SELECT COUNT(*) FROM public.profiles WHERE role = 'consultant';
   - Spot-check 3 random lead records against production snapshots

4. VERIFY APPLICATION
   - Point a staging Next.js instance at the restored project credentials
   - Log in as a test consultant — confirm Kanban loads
   - Log in as a test student — confirm portal loads and documents accessible
   - Trigger fn_detect_stalled_leads() manually — confirm it executes

5. DOCUMENT
   - Record: restore timestamp, time to complete, row counts matched, any anomalies
   - Store results in team runbook
   - Delete the temporary project

RTO Target: Full restore and application verification < 2 hours
RPO Target: Maximum 1 hour of data loss (PITR granularity on Pro is ~5 minutes)
```

---

### 17.11 MFA for Consultants & Super-Admins

**The problem:** Magic link authentication is correct for students — they are B2C users who need frictionless onboarding. Consultants and super-admins are B2B internal users who manage confidential student PII, passport details, financial records, and have write access to lead stages. A compromised email inbox is a compromised CRM. Magic link alone is insufficient for these roles.

```typescript
// src/app/auth/login/page.tsx — enforce MFA enrollment for elevated roles
import { createSupabaseServerClient } from '@/services/supabase/server';
import { redirect } from 'next/navigation';

export default async function LoginPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Consultants and super-admins must have MFA enrolled
    if (profile?.role !== 'student') {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const hasVerifiedTOTP = factors?.totp?.some((f) => f.status === 'verified');

      if (!hasVerifiedTOTP) {
        redirect('/auth/enroll-mfa'); // Force MFA setup before dashboard access
      }
    }
  }
  // ... render login form
}
```

```typescript
// src/middleware.ts — enforce MFA verification level for CRM routes
// Supabase Auth sets auth.jwt().aal (Authenticator Assurance Level)
// aal1 = password/magic link only
// aal2 = MFA verified

const { data: { session } } = await supabase.auth.getSession();
const aal = session?.user?.factors?.length > 0
  ? 'aal2' : 'aal1';

if (path.startsWith('/crm') || path.startsWith('/admin')) {
  if (aal !== 'aal2' && role !== 'student') {
    return NextResponse.redirect(new URL('/auth/verify-mfa', request.url));
  }
}
```

Enable TOTP MFA in Supabase Dashboard → Authentication → MFA and set the policy to require `aal2` for CRM/admin routes.

---

### 17.12 Audit Log Immutability — RLS Lock-Down

**The problem:** Section 12 claims activity_logs is "tamper-proof append-only." But no RLS policy prevents DELETE or UPDATE on that table. A consultant who knows basic SQL and has an authenticated session can delete their own audit trail. The entire compliance story rests on a claim with no enforcement.

```sql
-- supabase/migrations/20260911000021_audit_immutability.sql

-- activity_logs: INSERT only. Nobody can UPDATE or DELETE.
-- Super-admins can read everything. Users can read logs for their own leads.

CREATE POLICY "Anyone can insert activity logs"
    ON public.activity_logs FOR INSERT
    WITH CHECK (TRUE);  -- Any authenticated user can write a log entry

CREATE POLICY "Users can read logs for their leads"
    ON public.activity_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.leads
            WHERE leads.id = activity_logs.lead_id
              AND (leads.student_id = auth.uid()
                   OR leads.assigned_consultant_id = auth.uid())
        )
        OR public.is_super_admin()
    );

-- Explicit DENY policies for UPDATE and DELETE — no exceptions, not even super-admin
CREATE POLICY "Nobody can update activity logs"
    ON public.activity_logs FOR UPDATE
    USING (FALSE);  -- Always deny

CREATE POLICY "Nobody can delete activity logs"
    ON public.activity_logs FOR DELETE
    USING (FALSE);  -- Always deny

-- communication_logs: same treatment
CREATE POLICY "Nobody can delete communication logs"
    ON public.communication_logs FOR DELETE
    USING (FALSE);

CREATE POLICY "Nobody can update communication logs status to hide failures"
    ON public.communication_logs FOR UPDATE
    USING (public.is_super_admin());  -- Only super-admin can update (e.g. manual status correction)
```

---

### 17.13 Email Deliverability — Custom Domain Setup

**The problem:** The Edge Function sends email from `admissions@agencybroker.com` via Resend, but without DNS records, Resend falls back to their shared sending domain. Emails from shared Resend domains have industry-average inbox rates around 60-70% for new domains. For an agency where the welcome email is the first impression — and contains a magic portal link — a 30-40% spam rate means that proportion of students never activate their account.

**The fix:** Three DNS records and one Resend dashboard configuration, done once:

```
1. In Resend Dashboard → Domains → Add Domain:
   Enter: apexcrm.com (or your actual domain)

2. Resend generates three DNS records. Add them to your DNS provider:

   TYPE    NAME                          VALUE
   TXT     resend._domainkey             (DKIM public key provided by Resend)
   TXT     @                             v=spf1 include:_spf.resend.com ~all
   CNAME   em.apexcrm.com           sendgrid.net (or Resend's bounce domain)

3. Add DMARC record (strongly recommended):
   TYPE    NAME                          VALUE
   TXT     _dmarc.apexcrm.com       v=DMARC1; p=quarantine; rua=mailto:dmarc@apexcrm.com

4. Wait for DNS propagation (up to 48h). Resend shows green checkmarks.

5. Update Edge Function sender:
   from: 'Global Admissions <admissions@apexcrm.com>'
   // Previously was defaulting to Resend's shared domain

6. Send a test email through Resend → verify via mail-tester.com (target score 9/10+)
```

Without these records:
- Gmail marks the email as "via resend.dev" in the sender line — students distrust it
- Microsoft 365 / Outlook applies aggressive spam filtering to new sending domains
- Your Twilio WhatsApp account may also flag the email domain during business verification

---

### 17.14 WhatsApp Business API — Template Registration

**The problem:** The Edge Function sends this message body to new students:

```
🎓 Admissions Dossier Confirmed, Aryan!

We received your inquiry for Canada (Ref: #7b6b1580).
Your assigned consultant is reviewing university admission requirements...
```

This is a freeform text body. Meta's WhatsApp Business API has a strict rule: **outbound messages to users who have not previously messaged your business number must use a pre-approved Message Template.** A freeform body to a new number returns:

```json
{ "code": 131014, "title": "Request for url requires authentication",
  "message": "Message failed to send because more than 24 hours have passed since the customer last replied" }
```

Every welcome WhatsApp to a new student fails silently in the current implementation.

**The fix:**

```
1. Go to Meta Business Manager → WhatsApp → Message Templates → Create Template

2. Template category: UTILITY (not MARKETING — utility templates have higher delivery rates)

3. Template name: admission_dossier_received
   Language: English (and any other languages your agency serves)

4. Template body (variables in double curly braces):
   "Hello {{1}}, your admission inquiry for {{2}} has been registered (Ref: #{{3}}).
   Your Educational Advisor will contact you within 24 hours.
   Track your application: {{4}}"

5. Submit for Meta review (typically 24-48 hours, sometimes instant)

6. Update Edge Function to use the approved template:
```

```typescript
// supabase/functions/auto-respond-lead/index.ts — use approved template
body: new URLSearchParams({
  From: `whatsapp:${TWILIO_PHONE_NUMBER}`,
  To:   `whatsapp:${student.phone}`,
  // Reference the approved template by name
  ContentSid: process.env.WHATSAPP_TEMPLATE_SID!,  // From Twilio Content API
  ContentVariables: JSON.stringify({
    '1': student.full_name,
    '2': lead.target_country,
    '3': lead.id.substring(0, 8),
    '4': `https://apexcrm.com/portal/student`,
  }),
}),
```

Register a separate template for each key milestone notification (stage advances in Section 17.5) before sending them.

---

### 17.15 Feature Flags & Kill Switches

**The problem:** The SLA threshold configuration is stored in `stage_threshold_configs` and applied immediately on every pg_cron cycle. If a super-admin miskeys `48` as `4` for the Counseling threshold, every lead in Counseling that has been idle for 4 hours is immediately flagged as stalled — potentially hundreds of leads. Every consultant gets simultaneous audio alerts. The fix requires a database update and the next pg_cron cycle to clear. No rollback, no preview, no gradual rollout.

The same applies to the auto-assignment engine (16.8) and any future algorithm changes.

```typescript
// src/lib/flags.ts — lightweight feature flag implementation using stage_threshold_configs
// For a larger deployment, integrate Flagsmith (self-hostable, open source)
// or Supabase's own config table pattern below

// Simple approach: store flags in a dedicated table
```

```sql
-- supabase/migrations/20260911000022_feature_flags.sql
CREATE TABLE public.feature_flags (
    key          TEXT PRIMARY KEY,
    enabled      BOOLEAN NOT NULL DEFAULT FALSE,
    rollout_pct  INTEGER NOT NULL DEFAULT 100  CHECK (rollout_pct BETWEEN 0 AND 100),
    description  TEXT NOT NULL,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by   UUID REFERENCES public.profiles(id)
);

-- Super-admin only
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage flags"
    ON public.feature_flags FOR ALL
    USING (public.is_super_admin());

-- Seed default flags
INSERT INTO public.feature_flags (key, enabled, rollout_pct, description) VALUES
('auto_assignment_engine',    TRUE,  100, 'Enable automatic lead assignment trigger (Section 16.8)'),
('student_stage_notifications', TRUE, 100, 'Send WhatsApp/email to students on stage advance (Section 17.5)'),
('multi_university_applications', FALSE, 0, 'Enable multi-program applications per lead (Section 17.2)'),
('mfa_required_for_consultants', FALSE, 0, 'Enforce TOTP MFA for consultant/admin logins (Section 17.11)');
```

```typescript
// src/lib/flags.ts — check flag before executing feature
import { createSupabaseServerClient } from '@/services/supabase/server';

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('feature_flags')
    .select('enabled, rollout_pct')
    .eq('key', key)
    .single();

  if (!data?.enabled) return false;
  if (data.rollout_pct >= 100) return true;
  // Deterministic rollout based on hash — same user always gets same experience
  return (Math.random() * 100) < data.rollout_pct;
}

// Usage in Server Action:
if (await isFeatureEnabled('auto_assignment_engine')) {
  // run auto-assignment logic
}
```

---

### 17.16 Reporting & Data Export

**The problem:** The analytics dashboard shows numbers. A super-admin needs to send those numbers to the agency director as a PDF, export the leads list to Excel for a university partner review meeting, or produce a monthly commission report showing how many enrolled students came through each consultant. None of this is possible with the current implementation.

```typescript
// src/app/actions/exportActions.ts
'use server';

import { createSupabaseServerClient } from '@/services/supabase/server';
import { stringify } from 'csv-stringify/sync'; // pnpm add csv-stringify

export async function exportLeadsCSVAction(filters: {
  stage?: string;
  consultantId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<string> {
  const supabase = createSupabaseServerClient();

  let query = supabase
    .from('leads')
    .select(`
      id, stage, target_country, is_stalled, created_at, updated_at,
      profiles!student_id (full_name, email, phone),
      profiles!assigned_consultant_id (full_name),
      programs (program_name, degree_level,
        universities (name, country))
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (filters.stage)        query = query.eq('stage', filters.stage);
  if (filters.consultantId) query = query.eq('assigned_consultant_id', filters.consultantId);
  if (filters.fromDate)     query = query.gte('created_at', filters.fromDate);
  if (filters.toDate)       query = query.lte('created_at', filters.toDate);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((l: any) => ({
    'Lead ID':       l.id,
    'Student Name':  l.profiles_student_id?.full_name,
    'Email':         l.profiles_student_id?.email,
    'Phone':         l.profiles_student_id?.phone,
    'Target Country':l.target_country,
    'Stage':         l.stage,
    'Is Stalled':    l.is_stalled ? 'Yes' : 'No',
    'Consultant':    l.profiles_assigned_consultant_id?.full_name ?? 'Unassigned',
    'Program':       l.programs?.program_name,
    'University':    l.programs?.universities?.name,
    'Created':       l.created_at,
    'Last Updated':  l.updated_at,
  }));

  return stringify(rows, { header: true });
}

// Route handler to stream the CSV download
// src/app/api/export/leads/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const csv = await exportLeadsCSVAction({
    stage:        searchParams.get('stage') ?? undefined,
    consultantId: searchParams.get('consultant_id') ?? undefined,
    fromDate:     searchParams.get('from') ?? undefined,
    toDate:       searchParams.get('to') ?? undefined,
  });

  return new Response(csv, {
    headers: {
      'Content-Type':        'text/csv',
      'Content-Disposition': `attachment; filename="leads-export-${new Date().toISOString().split('T')[0]}.csv"`,
      'Cache-Control':       'no-store',
    },
  });
}
```

---

### 17.17 CORS Policy for API Routes

**The problem:** Next.js Route Handlers accept requests from any origin by default. There is no CORS allowlist configured anywhere in the codebase. Any third-party website can make cross-origin requests to `/api/health`, `/api/export/leads`, and other route handlers using a signed-in user's browser cookies.

```typescript
// src/lib/cors.ts — reusable CORS middleware
const ALLOWED_ORIGINS = [
  'https://apexcrm.com',
  'https://www.apexcrm.com',
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '',
].filter(Boolean);

export function corsHeaders(origin: string | null): HeadersInit {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age':       '86400',
  };
}

// Usage in any Route Handler:
// src/app/api/export/leads/route.ts
export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin');
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function GET(request: Request) {
  const origin = request.headers.get('origin');
  // ... handler logic ...
  return new Response(csv, {
    headers: { ...corsHeaders(origin), 'Content-Type': 'text/csv' },
  });
}
```

For subdomain routing (Section 15.4), extend `ALLOWED_ORIGINS` to include branch subdomains dynamically:

```typescript
// Allow any verified subdomain of the root domain
function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  const rootDomain = process.env.ROOT_DOMAIN ?? 'apexcrm.com';
  return origin.endsWith(`.${rootDomain}`);
}
```


---

## 18. Conclusion & Architectural Summary

This document specifies the complete production engineering blueprint for the **B2B2C Educational Placement Agency CRM & Admission Lead Automation System** — 18 sections covering database schema, RLS policies, edge compute, WebSocket channel management, caching strategy, multi-tenant routing, optimistic UI patterns, infrastructure hardening across 16 identified risk areas, and 17 deep domain/product/ops gaps with full implementations.

---

### What Was Built and Why

The system was re-architected from a monolithic Django/Daphne/Celery stack into a fully serverless cloud-native platform. Every technology choice has a specific reason:

| Capability | Legacy Stack | This Architecture | Why |
|---|---|---|---|
| Real-Time Lead Sync | Redis pub/sub + Daphne ASGI | PostgreSQL WAL → Supabase Realtime WebSocket | Database is the event bus — no Redis broker to manage or lose events through |
| Background Automation | Celery Beat + APScheduler | `pg_cron` stored procedures | Stall detection executes inside the database — zero network hop, no worker process |
| Multi-Channel Outreach | Celery Worker + Redis queue | Database Webhooks + Deno Edge Functions | Serverless, globally distributed, cold-start under 50ms, idempotency-guarded |
| Data Security | Application-level permission checks | PostgreSQL RLS + JWT claims | Enforced at the query engine — no application code path can bypass it |
| Authentication | Django Session / SimpleJWT | `@supabase/ssr` HTTP-Only PKCE cookies | Session available to SSR Middleware before any React code runs — no auth flicker |
| Frontend State | Full-page re-renders | `useOptimistic` + TanStack Query + Realtime patches | Zero perceived latency; surgical cache patches via Realtime; automatic UI rollback on failure |
| Analytics | Ad-hoc ORM queries | PostgreSQL Materialized Views + `pg_cron` REFRESH CONCURRENTLY | Heavy aggregation runs once per minute — admin dashboard load is always a cheap read |
| Connection Scaling | Direct PostgreSQL connections | Supavisor transaction-mode pooler | Thousands of serverless invocations share a fixed pool — connection exhaustion is structurally impossible |
| Stage Enforcement | UI validation only | PostgreSQL FSM trigger (§17.1) | Stage jumps are rejected at the DB level — no application bug can corrupt the audit trail |
| Multi-University Apply | One lead = one program | `applications` child table (§17.2) | One student engagement, multiple university targets, each with independent offer tracking |
| Consultant Continuity | Manual reassignment | Offboarding trigger + super-admin alert (§17.3) | No lead goes orphaned when a consultant leaves — system detects and flags immediately |

---

### The Four Core Guarantees

**1. No consultant ever misses a lead.**
PostgreSQL WAL → Supabase Realtime → WebSocket delivers new leads to the Kanban board in under 100ms. The `RealtimeProvider` singleton (§15.2) ensures one audio chime per event regardless of how many tabs are open. Gap recovery (§17.6) re-syncs any events missed during a network drop.

**2. No lead goes cold without a warning.**
`pg_cron` evaluates every active lead every 60 seconds. Breach detected → `is_stalled = TRUE` → reminder row inserted → `STALL_ALERT` pushed via WebSocket to the consultant's browser. The `EXCEPTION` block (§16.2) ensures one bad lead row never silences the entire batch. Auto-assignment (§16.8) ensures leads arriving outside business hours are never invisible.

**3. No student's data is visible to anyone who shouldn't see it.**
PostgreSQL RLS enforces the 3-role boundary at query time. Activity logs are INSERT-only by enforced RLS policy — `USING (FALSE)` on UPDATE and DELETE (§17.12). Audit immutability is a database guarantee, not documentation prose.

**4. No student is left wondering what is happening with their application.**
Stage advance triggers queue email and WhatsApp notifications to the student automatically (§17.5). Document versioning (§17.4) ensures students and consultants always work from the current file. Outbound WhatsApp uses a Meta-approved template (§17.14) — messages actually deliver.

---

### Resolved Product Decisions

These five decisions were previously open. Each is now resolved with its reasoning and the exact implementation or schema change it required.

---

**Decision 1 — Communication model: External only. No in-app messaging.**

WhatsApp and phone are the communication channels. The CRM logs contact; it does not replace it. Consultants at placement agencies already live in WhatsApp — building a third inbox means neither party checks it consistently. In-app messaging is also significant unbuilt scope (messages table, read receipts, push notifications, Realtime on both portals). B3 is the complete student-facing comms record: consultant contact log summaries and automated system events in one chronological timeline.

*Implementation impact:* No messages table needed. The Log Contact panel in C2 is the single communication action. B3 is unchanged in scope.

---

**Decision 2 — Student notified on consultant reassignment: Yes — notify.**

The student's portal displays their consultant's name. Changing it silently damages trust in a high-stakes process. A single WhatsApp template message ("Your advisor is now [name], they'll be in touch shortly") costs one pre-approved template and two trigger extensions. The alternative — saying nothing — risks a student calling the old consultant, receiving no response, and assuming their case has been dropped.

*Implementation impact:* §17.3 extended with two triggers: `fn_handle_consultant_deactivation` now queues WhatsApp notifications to all affected students, and a new `tr_notify_student_on_reassignment` trigger fires on manual `assigned_consultant_id` updates. Both write a `CONSULTANT_REASSIGNED_STUDENT_NOTIFIED` entry to `activity_logs` which surfaces on B3 as: "Your case has been transferred to a new advisor · [date]." Requires a pre-approved `consultant_reassigned` WhatsApp template (§17.14).

---

**Decision 3 — Student sees stall status on B1: No — hidden.**

Stall status is an internal operational concept. "Your application has been inactive for 72 hours" is anxiety-inducing and actionable for the consultant but not for the student. The student's signal that their case is progressing is the automated stage-advance notification (§17.5), not a raw SLA timer. The student portal must feel managed and calm.

*Implementation impact:* B1 dashboard unchanged. No stall indicator added. The Brick pulsing dot remains a consultant and admin-only concern.

---

**Decision 4 — Admin escalation threshold: 4 hours after first stall flag. Fee/Verification: 2 hours.**

If every `is_stalled = TRUE` lead immediately reaches D1, the admin's list mirrors the consultant's stalled queue. The admin sees leads the consultant is already handling. The two-tier model: pg_cron flags and alerts the consultant (tier 1); if the consultant has not logged contact within 4 hours (2h for Fee/Verification), the lead escalates to D1 (tier 2). This keeps the admin's attention list focused on genuinely stuck cases.

*Implementation impact:* `escalation_threshold_hours` column added to `stage_threshold_configs` (§6.1). Seeded values: Inquiry 4h, Counseling 4h, Document Collection 4h, Application 4h, Fee/Verification 2h. `fn_detect_stalled_leads()` and the admin D1 query must check `hours_since_stall_flagged >= escalation_threshold_hours` before inserting into the admin escalation list.

---

**Decision 5 — Consultant note visible to student on B3: Summary only, full note internal.**

A consultant's working note serves two audiences with incompatible needs. "Called Priya — hasn't started SOP, seems uncertain about the whole process" is operationally useful and alarming shown verbatim to Priya. The Log Contact panel in C2 uses two fields: a full internal note (consultant and admin only, stored in `activity_logs`) and an optional short shareable summary (max 120 chars, published to B3 if provided). If no summary is entered, B3 shows "Phone call logged · [date]" — enough to signal activity without leaking operational context.

*Implementation impact:* `activity_logs` needs a `student_visible_summary TEXT` column for storing the shareable portion. B3 query filters `WHERE student_visible_summary IS NOT NULL OR action_type LIKE 'STAGE%' OR action_type LIKE 'CONSULTANT_REASSIGNED%'` to surface only student-appropriate entries. The C2 Log Contact panel becomes two distinct text fields rather than a single textarea with a toggle.

---

**Standing Open Item — Payments & Commission**

This remains unresolved because it is a business model question the architecture cannot answer. Three models exist and require entirely different schemas:
- Agency collects tuition deposits directly → Stripe integration, ledger table, PCI compliance
- University pays agency commission after enrollment → commission tracking, invoice generation, payout workflow
- Agency charges advisory fees separately → fee schedule, student payment record

No placeholder schema is added until one model is chosen. Adding a `payments` table now without a decided model creates debt that will be torn out on first contact with a real payment requirement.

---

### UI/Interaction Design Decisions Derived From This Architecture

These are structural — not cosmetic — constraints the frontend must respect.

**Dark CRM, Light Student Portal.**
The Consultant CRM and Admin portal use dark `slate-900` backgrounds with pulsing red indicators on stalled leads. This is not an aesthetic preference — it is established by the actual production component code in §9.2 (`bg-red-950/40 border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.2)]`). The student portal uses a light, warm theme — it is a B2C onboarding experience, not an ops console. These are two different visual registers for two different user mental models.

**Stage Advance = One Button, Not a Picker.**
The FSM trigger (§17.1) rejects any stage transition that skips a step. A dropdown or stage-picker UI that shows all 6 stages will cause database rejections for most choices a consultant could make. The correct control is a single "Advance to [next stage]" button that is disabled on the final stage. Backward moves surface only in a super-admin context.

**Student Dashboard Shows Per-Application Status, Not a Single Pipeline Bar.**
The `applications` child table (§17.2) means one student can have UCL at `Conditional Offer`, Manchester at `Applied`, and Edinburgh at `Shortlisted` — simultaneously. A single 6-stage progress bar is structurally wrong for this data model. The student portal needs a list of university application cards, each with its own status indicator, nested under the student's overall engagement stage.

**Consultant Case View Shows Per-Application List, Not a Single Stage.**
Same reason. A consultant managing a student who has applied to 4 universities needs to see all 4 application statuses on the lead detail view — not just the lead's `stage` field which represents the overall engagement, not any individual application.

---

### Section Map

```
┌────────┬──────────────────────────────────────────┬──────────────────────────────────────────────┐
│ Section│ Topic                                    │ Key Artifact                                 │
├────────┼──────────────────────────────────────────┼──────────────────────────────────────────────┤
│ 1      │ 3-Role Agency Persona Model              │ Role boundary diagram & workflow matrix      │
│ 2      │ Core Works & Supabase Component Mapping  │ 4-work architecture table                    │
│ 3      │ 12-Factor App Alignment                  │ Compliance matrix                            │
│ 4      │ End-to-End Cloud Topology                │ Full system flowchart                        │
│ 5      │ Sequence Diagrams                        │ Lead ingestion & stall resolution flows      │
│ 6      │ PostgreSQL Schema, RLS & Automation      │ DDL, RLS policies, pg_cron procedures        │
│ 7      │ Supabase Realtime Protocol               │ WebSocket payloads & subscription hook       │
│ 8      │ Edge Functions & Auto-Response Engine    │ Deno Edge Function implementation            │
│ 9      │ Next.js 15 Frontend Architecture         │ Middleware RBAC guard & Optimistic Kanban    │
│ 10     │ Demo & Presentation Suite                │ Live demo script & split-view layout         │
│ 11     │ Project File Structure                   │ Full monorepo directory tree                 │
│ 12     │ Security, Compliance & Data Governance   │ FERPA/GDPR controls & audit trail            │
│ 13     │ Verification, Testing & QA Matrix        │ RLS pgTAP test scripts                       │
│ 14     │ Caching Strategy                         │ 5-layer cache map, rules table, flowchart    │
│ 15     │ Production Engineering Patterns          │ Auth architecture, WebSocket singleton,      │
│        │                                          │ TanStack Query hybrid, subdomain routing,    │
│        │                                          │ optimistic rollback toasts                   │
│ 16     │ Production Risk Register & Hardening     │ 15 gaps: idempotency, cron exception safety, │
│        │                                          │ Zod validation, DB locking, file security,   │
│        │                                          │ observability, GDPR soft deletes,            │
│        │                                          │ auto-assignment, full-text search,           │
│        │                                          │ zero-downtime migrations, rate limiting,     │
│        │                                          │ notification center, timezones, secrets,     │
│        │                                          │ load testing & capacity planning             │
│ 17     │ Deep System Gaps — Domain, Ops & Product │ 17 gaps: FSM stage enforcement, multi-       │
│        │                                          │ university applications, consultant           │
│        │                                          │ offboarding, document versioning, outbound   │
│        │                                          │ student comms, Realtime gap recovery,        │
│        │                                          │ channel filter edge case, seed.sql,          │
│        │                                          │ CI/CD pipelines, backup restore, MFA,        │
│        │                                          │ audit log immutability, email deliverability,│
│        │                                          │ WhatsApp templates, feature flags,           │
│        │                                          │ CSV export, CORS policy                      │
│ 18     │ Conclusion & Architectural Summary       │ This section                                 │
└────────┴──────────────────────────────────────────┴──────────────────────────────────────────────┘
```

---

### Production Readiness Checklist

```
Authentication & Access
  ☐ Supabase Auth PKCE flow tested end-to-end (login → callback → session cookie set)
  ☐ Middleware RBAC guard blocks /admin for consultant and student roles
  ☐ Service role key confirmed absent from any NEXT_PUBLIC_ environment variable
  ☐ RLS pgTAP test suite passes (§13.1) — all 4 assertions green
  ☐ MFA (TOTP) enrollment required for consultant and super-admin roles (§17.11)
  ☐ Middleware checks aal2 for /crm and /admin routes (§17.11)

Database & Automation
  ☐ All migration files applied in order (§6.1 through §17.x migrations)
  ☐ pg_cron extension enabled and schedule confirmed running in Supabase Dashboard
  ☐ fn_detect_stalled_leads() EXCEPTION block in place — verified by seeding a bad row
  ☐ Stage FSM trigger tr_enforce_stage_transition deployed and tested (§17.1)
  ☐ Document supersession trigger tr_supersede_prior_document deployed (§17.4)
  ☐ Consultant deactivation trigger tr_consultant_deactivation deployed (§17.3)
  ☐ Student stage notification trigger tr_notify_student_on_stage_change deployed (§17.5)
  ☐ Materialized views with UNIQUE indexes created and REFRESH CONCURRENTLY verified
  ☐ stage_threshold_configs seeded with default SLA values
  ☐ feature_flags table seeded with default values (§17.15)
  ☐ activity_logs DELETE and UPDATE policies are USING (FALSE) — immutability enforced (§17.12)
  ☐ Auto-assignment trigger tr_auto_assign_lead deployed (§16.8)
  ☐ Webhook idempotency UNIQUE INDEX on communication_logs in place (§16.1)

Realtime & WebSocket
  ☐ supabase_realtime publication includes leads, reminders, activity_logs, notifications tables
  ☐ RealtimeProvider singleton confirmed in Supabase Dashboard (1 channel per consultant session)
  ☐ Gap recovery on reconnect tested: disconnect for 60s, reconnect, verify missed leads appear
  ☐ Auto-assigned lead UPDATE event received by correct consultant channel (§17.7)
  ☐ Audio chime plays on INSERT event in staging environment

Caching
  ☐ export const dynamic = 'force-dynamic' present on /crm and /portal page routes
  ☐ cache: 'no-store' on createSupabaseServerClient global fetch option
  ☐ revalidateTag called in every mutating Server Action
  ☐ Cache-Control: no-store confirmed on authenticated routes via curl
  ☐ /_next/static/* assets confirm Cache-Control: immutable

Edge Functions & Communications
  ☐ auto-respond-lead idempotency guard deployed and tested with duplicate webhook call (§16.1)
  ☐ RESEND_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN set in Edge Function secrets
  ☐ Custom sending domain verified in Resend (DKIM, SPF, DMARC records live) (§17.13)
  ☐ WhatsApp admission_dossier_received template approved by Meta (§17.14)
  ☐ WhatsApp stage notification templates approved for key milestones (§17.5)
  ☐ Test lead submission triggers email delivery to inbox (not spam)
  ☐ Edge Function signature verification active (webhook secret set and verified)
  ☐ communication_logs added to supabase_realtime publication (required for Auto-Response Sandbox)

Demo & Presentation
  ☐ fn_demo_seed_leads() seeds 10 leads with correct stage distribution (§10)
  ☐ fn_demo_simulate_stall() ages only demo leads (is_demo = true safety guard) (§10)
  ☐ fn_detect_stalled_leads() callable via RPC from demo toolbar (§10)
  ☐ fn_demo_reset() clears all demo leads cleanly with no orphaned reminders (§10)
  ☐ /demo/split: form submit → card appears in Kanban in < 200ms (test on presentation device)
  ☐ /demo/split: Auto-Response Sandbox shows delivery ticks within 5 seconds of submit
  ☐ /demo/split: Age + Run Cron → Brick pulsing dot appears within 3 seconds
  ☐ /demo/split: Log Contact → Brick dot clears within 1 second
  ☐ Audio chime audible on presentation device — test before every live pitch
  ☐ WhatsApp delivery verified on a real phone before every live pitch
  ☐ Email delivery verified to a real inbox (not spam) before every live pitch

Security & Compliance
  ☐ gitleaks GitHub Actions gate active — test by staging a fake secret in a branch (§17.9)
  ☐ CORS allowlist configured in next.config.ts and Route Handlers (§17.17)
  ☐ Zod schemas on createLead, updateStage, logConsultation, updateSlaThreshold (§16.3)
  ☐ Server-side file MIME + size validation in confirmDocumentUploadAction (§16.5)
  ☐ fn_erase_student_pii() tested — PII nullified, activity_logs row preserved (§16.7)
  ☐ Daily hard-purge pg_cron job confirmed scheduled (§16.7)

Frontend & UX
  ☐ Optimistic Kanban: stage advance → server failure simulated → card rolls back with toast (§15.5)
  ☐ Stage advance button shows only next-stage label, not a dropdown (§17.1 FSM constraint)
  ☐ Student dashboard shows per-application university cards, not a single progress bar (§17.2)
  ☐ Consultant case view shows applications child table entries per student (§17.2)
  ☐ Sonner Toaster mounted once at consultant layout level
  ☐ TanStack Query DevTools gated behind NODE_ENV === 'development' check
  ☐ formatTimestamp() used for all displayed timestamps — no raw .toLocaleString() calls (§16.13)

Multi-Tenancy
  ☐ ROOT_DOMAIN environment variable set
  ☐ branches table seeded with at least one subdomain entry
  ☐ Unknown subdomain redirects to root domain (§15.4)
  ☐ Branch RLS: consultant from Branch A cannot query Branch B leads

CI/CD & Operations
  ☐ All three GitHub Actions workflows deployed and green on main (§17.9)
  ☐ Unsafe migration lint gate tested — confirm it catches ALTER TABLE NOT NULL (§16.10)
  ☐ seed.sql runs without error on fresh supabase db reset (§17.8)
  ☐ Backup restore procedure tested and documented in team runbook (§17.10)
  ☐ Health check endpoint /api/health returns 200 with all checks green (§16.6)
  ☐ Uptime monitor configured to ping /api/health every 60 seconds

Performance & Capacity
  ☐ Supavisor transaction-mode pooler URL in DATABASE_URL (not DIRECT_URL)
  ☐ All partial indexes on public.leads confirmed (idx_leads_stalled, idx_leads_not_deleted, etc.)
  ☐ EXPLAIN ANALYZE on fn_detect_stalled_leads() — no sequential scan on leads table
  ☐ EXPLAIN ANALYZE on search_leads() RPC — trigram index used
  ☐ k6 lead-submission test passes p95 < 2s threshold at 50 concurrent users (§16.15)
  ☐ Supabase Dashboard: DB cache hit rate > 99%, no sustained CPU spikes
```

---

### Technology Stack Summary

```
┌──────────────────────────┬────────────────────────────────────────────────────────────┐
│ Layer                    │ Technology                                                 │
├──────────────────────────┼────────────────────────────────────────────────────────────┤
│ Frontend Framework       │ Next.js 15 (App Router, React 19, Server Actions)          │
│ UI — CRM & Admin         │ Tailwind CSS dark theme (slate-900) + Lucide + Sonner      │
│ UI — Student Portal      │ Tailwind CSS light/warm theme                              │
│ Client State             │ TanStack Query v5 + React useOptimistic                    │
│ Authentication           │ Supabase Auth + @supabase/ssr (HTTP-Only PKCE + TOTP MFA) │
│ Input Validation         │ Zod (all Server Actions and API routes)                    │
│ Database                 │ PostgreSQL 16 (Supabase managed, Pro/Team plan)            │
│ ORM / Query Layer        │ Supabase JS SDK (type-safe, RLS-aware)                     │
│ Real-Time Engine         │ Supabase Realtime (Elixir/Phoenix, WAL-based)              │
│ Background Scheduling    │ pg_cron (native PostgreSQL extension)                      │
│ Edge Compute             │ Supabase Deno Edge Functions                               │
│ Email Delivery           │ Resend API (custom domain, DKIM/SPF/DMARC verified)        │
│ WhatsApp Messaging       │ Twilio / Meta Cloud API (pre-approved templates)           │
│ File Storage             │ Supabase Storage (S3-compatible, versioned signed URLs)    │
│ Connection Pooling       │ Supavisor (transaction-mode)                               │
│ Feature Flags            │ feature_flags table (§17.15) / Flagsmith (optional)        │
│ Hosting & CDN            │ Vercel (edge network, immutable deployments)               │
│ CI/CD                    │ GitHub Actions (type-check, gitleaks, migration lint)      │
│ Testing                  │ pgTAP (RLS) + Playwright (E2E) + k6 (load)                │
│ Observability            │ Supabase Logflare + pg_stat_statements + /api/health       │
│ CSV / Reporting          │ csv-stringify (Server Action export, §17.16)               │
└──────────────────────────┴────────────────────────────────────────────────────────────┘
```
