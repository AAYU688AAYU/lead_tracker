# System Architecture

Core architectural documentation for Lead Tracker.

## Contents

- **[Real-Time Features](README-realtime.md)** — WebSocket subscriptions, Realtime synchronization, and live updates
- **[User Flows](USER_FLOW.md)** — System interaction diagrams and workflows

## Overview

Lead Tracker is a cloud-native B2B2C educational placement platform built with:
- **Frontend:** Next.js 15 (App Router, Server Components)
- **Backend:** Supabase (PostgreSQL, Realtime Engine, Edge Functions)
- **Authentication:** Supabase Auth (PKCE flow, JWT-based)
- **Real-Time:** Supabase Realtime (WebSockets, publish/subscribe)

### Three-Domain Architecture

The platform is organized into three independent domains, each with its own portal:

1. **Student Portal** (`/portal/student`) — Self-service intake, document upload, progress tracking
2. **Consultant CRM** (`/crm/consultant`) — Kanban pipeline management, interaction logging, stall detection
3. **Admin Dashboard** (`/admin`) — Analytics, configuration, university catalog, team management

### Data Model

- **Leads** — Main entity representing prospective students in the admissions pipeline
- **Stages** — 6-stage admission funnel (Inquiry → Counseling → Documents → Application → Fee/Verification → Admitted)
- **Consultants** — Agency team members managing student pipelines
- **Universities** — Partner institutions and their programs
- **Documents** — Student-uploaded academic records with status tracking
- **Notifications** — Real-time updates pushed to connected users

### Key Architectural Decisions

1. **Serverless Frontend** — No persistent backend servers; all compute on edge via Next.js
2. **Row-Level Security (RLS)** — Authorization enforced at database layer, not application layer
3. **Real-Time Subscriptions** — Instant synchronization via PostgreSQL replication stream
4. **Webhook-Driven Automation** — Database triggers invoke Edge Functions for outbound actions (email, SMS)
5. **Staged Deployment** — Local development → staging environment → production

---

For detailed architecture deep-dive, see the root README.md "Enterprise System Architecture" section.
