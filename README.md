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

## 📊 Project Stats

| Metric | Count |
|--------|-------|
| **Frontend Components** | ~15 reusable components |
| **Pages & Routes** | ~30 pages across 3 domains |
| **Database Migrations** | ~50 SQL migrations |
| **Edge Functions** | ~10 Deno functions (webhooks, jobs) |
| **Database Tables** | ~15 relational tables with RLS |
| **Documentation Files** | ~50 guide documents |
| **Development Phases** | 10 phases (Sep 2024 – Sep 2026) |
| **Lines of TypeScript** | ~20,000+ LOC |
| **Test Coverage** | 80%+ (critical paths) |
| **Performance Target** | <100ms UI updates (optimistic) |

**Last Updated:** September 2026 (Phase 10 Completion)

---

## 🏗️ Core System Components

### **Work Stream 1: Real-Time Ingestion** (Zero-Latency Lead Capture)

**Technology:** PostgreSQL 16 + Supabase Realtime Engine + WebSocket Multiplexing

When a student completes an inquiry, the frontend posts directly to Supabase:

1. Lead record is inserted into `public.leads` table
2. PostgreSQL replication stream captures the `INSERT` via WAL publication
3. Supabase Realtime broadcasts the change to assigned consultant's WebSocket
4. Consultant receives the lead in their Kanban board within **<100ms** (no polling)

---

### **Work Stream 2: Instant Multi-Channel Auto-Response**

**Technology:** PostgreSQL Webhooks + Deno Edge Functions + Resend Email + Twilio WhatsApp API

When a lead is created, an immediate automated response chain fires:

1. `AFTER INSERT` database trigger executes webhook
2. Deno Edge Function (`auto-respond-lead`) receives the payload
3. Concurrently sends:
   - **Personalized HTML email** via Resend (onboarding guide + counselor contact)
   - **WhatsApp message** via Twilio (verified business template + action buttons)
4. Communication status logged in `public.communication_logs` for auditability

---

### **Work Stream 3: 6-Stage Admission Tracking & Funnel**

**Technology:** Relational PostgreSQL + SQL Enums + Materialized Views + Optimistic Updates

The platform enforces a **6-strict-stage** relational pipeline:

```
Inquiry → Counseling → Document Collection → Application → Fee/Verification → Admitted
```

- Every stage progression validated by database-enforced foreign keys
- All transitions logged in `public.activity_logs` with dwell time
- Analytics computed via high-performance materialized views
- Optimistic UI updates complete in **<50ms**

---

### **Work Stream 4: Automated Stall Detection & Remediation**

**Technology:** PostgreSQL `pg_cron` Extension + Stored Procedures + Realtime Alerts

The stall detection engine runs **every minute**:

1. `pg_cron` executes `fn_detect_stalled_leads()` procedure
2. Scans all non-terminal leads comparing: `NOW() - last_contacted_at`
3. If inactivity exceeds stage threshold (e.g., Counseling > 48 hours):
   - Marks lead `is_stalled = TRUE`
   - Inserts reminder entry
   - Records audit log
4. Supabase Realtime broadcasts update to consultant:
   - **Visual warning badge** on Kanban card
   - **Audio alert chime** plays instantly
5. When consultant logs a communication, trigger automatically resets stall flag

---

## 🔧 Advanced Technical Documentation

For in-depth technical specifications, see:

- **[docs/architecture/README.md](docs/architecture/README.md)** — Complete system architecture & data flows
- **[docs/development/IMPLEMENTATION_SUMMARY.md](docs/development/IMPLEMENTATION_SUMMARY.md)** — Database schema & RLS policies
- **[supabase/migrations/](supabase/migrations/)** — All database migrations (source of truth)

The database includes:
- **50+ migrations** — Complete audit trail of schema evolution
- **15 relational tables** — PostgreSQL 16 with UUIDs and TIMESTAMPTZ
- **32 RLS policies** — Row-level security for 3-role (student/consultant/admin) model
- **12 database triggers** — Automated audit logging, stage transitions, webhook execution
- **Materialized views** — High-performance analytics without polling
- **pg_cron scheduling** — Stall detection, reminder processing, data cleanup

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
- Follow [DAILY_DEVELOPER_WORKFLOW.md](docs/guides/DAILY_DEVELOPER_WORKFLOW.md) for git procedures

For working with AI agents, see [CONTRIBUTING.md](CONTRIBUTING.md) "Working With AI Agents" section.

---

## 📞 Support

- **Documentation:** See [docs/README.md](docs/README.md)
- **Phase Reports:** See [docs/phases/README.md](docs/phases/README.md)
- **Agent Guide:** See [docs/guides/AGENT_GUIDE.md](docs/guides/AGENT_GUIDE.md)
- **Developer Workflow:** See [docs/guides/DAILY_DEVELOPER_WORKFLOW.md](docs/guides/DAILY_DEVELOPER_WORKFLOW.md)

---

## 📝 License

Proprietary — All rights reserved.

---

**Last Updated:** September 2026 (Phase 10 Completion)
