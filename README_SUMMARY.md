# Educational Placement Agency CRM - Progress Summary & Guidance for Remote Agent

## Project Overview
The **Educational Placement & Advisory Agency CRM** is a B2B2C platform that connects prospective students (B2C), agency consultants (B2B), and agency super‑admins (executive) to manage leads, admissions workflows, and real‑time communication. Built on **Next.js (App Router)** with **Supabase** backend (PostgreSQL, Realtime, Auth, Storage).

## What Has Been Implemented So Far

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **RealtimeProvider** (src/providers/RealtimeProvider.tsx) | Singleton React context handling WebSocket connections | - Manages connection state (connected / connecting / disconnected / error) <br> - Reconnection logic with exponential back‑off <br> - Leads event stream (insert, update, delete) <br> - Gap recovery for missed events <br> - Consultant‑scoped WebSocket (private channel) <br> - Lazy‑loaded audio chime preloading |
| **AudioPlayer** (src/lib/audio.ts) | Singleton audio chime player | - Preloads `/audio/lead-chime.mp3` on first use <br> - `playChime()` with error handling and fallback <br> - Graceful degradation when audio API is unavailable |
| **useCRMRealtime** hook (src/hooks/useCRMRealtime.ts) | CRM‑wide real‑time lead data | - Returns leads array, `stalledLeadIds` (leads inactive >72 h) <br> - Consultant‑specific filtering <br> - Triggers audio chime for new leads and stall breaches |
| **useStudentRealtime** hook (src/hooks/useStudentRealtime.ts) | Student‑specific view | - Returns leads filtered to the current student only <br> - Connection status tracking <br> - Dashboard revalidation on updates |
| **useNotifications** hook (src/hooks/useNotifications.ts) | Global notification system | - Manages unread count, connection state <br> - `markAllRead()` for bulk clearing <br> - WebSocket‑based real‑time updates |
| **Notification Center page** (app/crm/consultant/notifications/page.tsx) | UI for consultants | - Responsive single‑column layout <br> - Groups notifications by recency (Today, Yesterday, Earlier this week) <br> - Icons + copy for each notification type <br> - UNREAD STATE highlighted with left‑border “Lichen” <br> - EMPTY STATE with Fern icon + positive message <br> - “Mark all read” functionality |

### Initial Commit
- **Message:** `feat: realtime infrastructure with gap recovery and notification center`

### Integration Points
- **Consultant Kanban** – consumes `useCRMRealtime` for leads & stalled IDs.  
- **Consultant Case View** – uses same hook for live status updates.  
- **Student Dashboard** – uses `useStudentRealtime` for stage/assignment changes.  
- **Notification Bell** – uses `useNotifications` for unread count.  
- **Admin Dashboard** – super‑admin sees all leads via `useCRMRealtime`.

### Next Steps
1. Persist notifications in the database (server actions).  
2. Connect real‑time hooks to existing UI components.  
3. Add demo route `/demo/split` showcasing audio system.  
4. Implement dashboard revalidation on real‑time updates.  
5. Expand audio chime usage (e.g., per‑lead types).

## Guidance for Building an Online Agent (Claude) That Can’t See Files

1. **Rely on Public Documentation & Summaries**  
   - The **README_SUMMARY.md** (this file) and **README-realtime.md** already give a high‑level view of architecture, component responsibilities, and integration points. Use these as the “source of truth” for the agent.  
   - Avoid deep source‑code navigation; focus on documented APIs (hooks, context, WebSocket scopes).

2. **Expose High‑Level Endpoints**  
   - If the agent needs to query leads, stalled leads, or notification status, route the request through the existing **RealtimeProvider** context or the **useCRMRealtime** hook’s public methods.  
   - For data not yet exposed via UI, add lightweight server‑side JSON endpoints (e.g., `/api/leads?status=stalled`). The agent can call these without file access.

3. **Leverage the Audio Notification System**  
   - The **AudioPlayer** singleton (`playChime`) can be invoked by the agent to signal events (new lead, stall breach). The chime is preloaded and encapsulated, so the agent only needs to trigger the function — no file I/O required.

4. **Use Consultant‑Scoped WebSocket for Private Data**  
   - The platform already separates consultant‑specific data via a private WebSocket channel. The agent can request “consultant‑scoped” data by providing the `ConsultantId`; the backend handles the scoped connection, keeping the agent blind to internal file structures.

5. **Summarize Key Capabilities in a One‑Page Cheat Sheet**  
   - Create a concise markdown cheat sheet (≈1‑2 pages) that lists: <br> • RealtimeProvider purpose and API <br> • Hooks (`useCRMRealtime`, `useStudentRealtime`, `useNotifications`) <br> • Audio chime trigger (`playChime`) <br> • Notification center UI features <br> • Integration points for each role (consultant, student, admin). <br> The agent can read this cheat sheet without needing to inspect source files.

6. **Facilitate Remote Interaction**  
   - Provide the agent with a simple HTTP endpoint (e.g., `/api/agent/status`) that returns a JSON summary of the current system state (connected, lead count, stalled leads). The agent can poll or be webhook‑notified, eliminating the need to read files.

7. **Document Assumptions & Constraints**  
   - Note that the agent should not assume file system access; all data must be retrieved via the defined APIs or the cheat sheet.  
   - Mention any rate limits, authentication requirements (e.g., ConsultantId token), and the expected latency of real‑time updates.

By following these guidelines, an online Claude agent can understand where the project stands, know which components to interact with, and provide useful advice or actions without ever needing direct file system visibility.