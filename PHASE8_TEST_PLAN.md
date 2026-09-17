# Phase 8 Testing & Verification Plan

## Overview

This document outlines comprehensive testing procedures for Phase 8 (Real-Time Updates & Stall Detection).

**Phase 8 Focus Areas:**
1. RealtimeProvider consolidation (single connection)
2. Gap recovery on disconnection/reconnection
3. Audio chime system (debouncing, multi-tab)
4. Notification Center UI and functionality
5. Multi-tab synchronization
6. Connection status indicators

**Test Duration:** ~2-3 hours for full manual verification

---

## Pre-Test Setup

### Environment Requirements

- Node.js 18+
- Local Supabase instance or staging environment
- Chrome/Firefox with DevTools
- Multiple browser windows (for multi-tab testing)
- Test leads in database (at least 5)
- Test consultants assigned to leads
- Internet throttling capability (Chrome DevTools Network tab)

### Database Preparation

```sql
-- Verify Phase 8 migration applied
SELECT EXISTS (
  SELECT 1 FROM pg_type WHERE typname = 'notification_type'
) AS migration_applied;

-- Verify test data
SELECT COUNT(*) FROM leads WHERE status = 'active' AND consultant_id IS NOT NULL;
SELECT COUNT(*) FROM notifications WHERE user_id = '<test-consultant-id>';
```

### Code Checks

- [ ] RealtimeProvider mounted in `app/dashboard/consultant/layout.tsx`
- [ ] useCRMRealtime used in kanban-board (not scattered useLeadsRealtime)
- [ ] NotificationBell component exists and uses useNotifications
- [ ] Audio files setup (or Web Audio fallback working)
- [ ] API routes created: `/api/notifications/*`, `/api/leads/recovery`
- [ ] Notification Center page accessible at `/dashboard/consultant/notifications`

---

## Test Scenarios

### 1. RealtimeProvider Consolidation

**Objective:** Verify single connection per consultant, no duplicate subscriptions.

**Steps:**

1. Open Chrome DevTools → Network tab
2. Filter for WebSocket connections
3. Navigate to consultant dashboard
4. **Expected:** 1-2 WebSocket connections (not 4+)
5. Verify connection URL contains `realtime` and `apikey`
6. Leave tab open for 30 seconds
7. **Expected:** Connection remains stable, no reconnects

**Verification Code (DevTools Console):**
```javascript
// Check active connections
window.navigator.connection?.effectiveType // Should show 4g or similar

// Monitor Supabase realtime
const channels = supabase.getChannels()
console.log(`Active channels: ${channels.length}`) // Should be 1-2
```

**Pass Criteria:**
- ✅ Single WebSocket connection established
- ✅ No connection flapping during stable network
- ✅ RealtimeProvider logs visible in console

---

### 2. Gap Recovery on Disconnection

**Objective:** Verify missed updates are fetched after reconnection.

**Steps:**

1. Open consultant dashboard (kanban board visible)
2. Open DevTools → Network tab
3. Right-click any lead card, copy lead ID
4. Throttle connection: DevTools → Network → Slow 3G
5. Wait 10 seconds
6. Switch network: DevTools → Network → Offline checkbox ✓
7. **Expected:** Connection status shows 🔴 "Offline"
8. Assign a new lead to this consultant (via admin panel or API)
9. Wait 5 seconds
10. Un-check Offline → connection restores
11. **Expected:** New lead appears on kanban board within 2 seconds
12. **Expected:** Console shows "[Realtime] Gap recovery: merged X leads"

**Verification Steps:**

```bash
# Simulate lead assignment while offline
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{"student_id":"...", "consultant_id":"...", "program_id":"..."}'
```

**Pass Criteria:**
- ✅ Connection status indicator changes to 🔴 when offline
- ✅ Connection status changes to 🟡 "Reconnecting" during recovery
- ✅ Missed leads appear after reconnection
- ✅ Gap recovery log visible in console
- ✅ No manual refresh needed

---

### 3. Audio Chime System

**Objective:** Verify audio plays on new leads and stalls, with debouncing.

**Steps:**

1. Open consultant dashboard in 3 separate browser tabs (A, B, C)
2. Unmute browser audio (click speaker icon in address bar)
3. Tab A: Keep kanban board visible
4. Tab B & C: Mute audio (DevTools → Sound settings)
5. Assign a new lead to consultant
6. **Expected:** Audio chimes once in Tab A, Tab B, Tab C all hear nothing
7. Wait 5 seconds
8. Assign another lead
9. **Expected:** Chime plays again (debounce passed)
10. Rapidly (within 2 seconds) assign 3 more leads
11. **Expected:** Chime plays only once (subsequent calls debounced)

**If audio fails:**

```javascript
// Check audio player state
import { audioPlayer } from '@/lib/audio'
audioPlayer.isEnabled() // Should be true
audioPlayer.playChime() // Manually trigger chime
```

**Pass Criteria:**
- ✅ Audio plays on first new lead
- ✅ Audio doesn't play 3x in multi-tab (BroadcastChannel deduplication)
- ✅ Debounce prevents multiple chimes within 2 seconds
- ✅ Web Audio fallback works if external file unavailable

---

### 4. Stall Detection Audio

**Objective:** Verify chime plays when lead enters stalled status.

**Steps:**

1. Navigate to /dashboard/admin (admin dashboard)
2. Find a lead in early stage (inquiry, consultation)
3. Note the stall threshold (usually 48 hours)
4. Temporarily update pipeline_stage_labels:
   ```sql
   UPDATE pipeline_stage_labels
   SET stall_threshold_hours = 0.01  -- ~36 seconds
   WHERE stage = 'inquiry';
   ```
5. Return to consultant dashboard
6. Wait 1 minute
7. **Expected:** Lead card shows stalled status (amber dot, "Stalled" text)
8. **Expected:** Audio chime plays (if not muted)
9. Console shows stall detection log

**Verify Stall Detection Job:**

```sql
-- Manual trigger (instead of waiting 15 minutes)
SELECT fn_mark_stalled_leads();

-- Check result
SELECT status FROM leads WHERE id = '<lead-id>' AND status = 'stalled';

-- Verify notification created
SELECT * FROM notifications WHERE user_id = '<consultant-id>' ORDER BY created_at DESC LIMIT 1;
```

**Pass Criteria:**
- ✅ Lead status changes to 'stalled'
- ✅ Stalled indicator displays (amber dot + "Stalled")
- ✅ Audio chime plays
- ✅ Notification created in notifications table

---

### 5. Notification Center

**Objective:** Verify notification list, filtering, and mark-as-read functionality.

**Steps:**

1. Navigate to `/dashboard/consultant/notifications`
2. **Expected:** Page loads with "Notifications" title
3. Verify unread count badge shows correct number
4. Scroll through notification list
5. **Expected:** Notifications grouped by date (Today, Yesterday, etc.)
6. Click "Mark all read" button
7. **Expected:** Unread count becomes 0, all items lose highlight
8. Verify notifications table updated: `is_read = true`
9. Click type filter "Stalled Leads"
10. **Expected:** List filters to show only stall notifications
11. Click a notification's mark-as-read button (dot icon)
12. **Expected:** Single notification loses highlight, unread count decrements

**Verify API Endpoints:**

```bash
# Fetch notifications
curl http://localhost:3000/api/notifications?consultant_id=<id>&page=0&limit=15

# Mark single as read
curl -X PATCH http://localhost:3000/api/notifications/<id>/read

# Mark all as read
curl -X PATCH http://localhost:3000/api/notifications/read-all \
  -H "Content-Type: application/json" \
  -d '{"consultant_id":"<id>"}'
```

**Pass Criteria:**
- ✅ Notifications load and display
- ✅ Date grouping works (Today, Yesterday, etc.)
- ✅ Filtering by type works
- ✅ Mark as read updates UI and database
- ✅ Mark all read action works
- ✅ Unread count badge updates
- ✅ Pagination/infinite scroll works (if >15 notifications)

---

### 6. Connection Status Indicator

**Objective:** Verify connection status displays correctly in UI.

**Steps:**

1. Open consultant dashboard
2. **Expected:** Top-right shows 🟢 "Connected" indicator (or in header)
3. DevTools → Network → Offline ✓
4. **Expected:** Status changes to 🔴 "Offline"
5. Connection flapping test:
   - Turn offline/online rapidly 5 times
   - **Expected:** Indicator shows 🟡 "Reconnecting" briefly between states
6. Exponential backoff test:
   - Enable offline, wait 30 seconds
   - **Expected:** Console shows reconnect attempts at 1s, 2s, 4s, 8s, 16s intervals
7. Restore connection
8. **Expected:** Status returns to 🟢 "Connected"

**Console Monitoring:**

```javascript
// Watch connection status in real-time
const { connectionStatus } = useCRMRealtime()
console.log(`Status: ${connectionStatus}`)

// Also visible via Realtime logs
// Search console for "[Realtime]" messages
```

**Pass Criteria:**
- ✅ Status indicator shows 🟢 when connected
- ✅ Status indicator shows 🔴 when offline
- ✅ Status indicator shows 🟡 when reconnecting
- ✅ Exponential backoff delays visible in console
- ✅ Status recovers smoothly after reconnection

---

### 7. Multi-Tab Synchronization

**Objective:** Verify state synced across browser tabs via BroadcastChannel.

**Steps:**

1. Open consultant dashboard in Tab A
2. Open same dashboard in Tab B (same origin, same consultant)
3. In Tab A: Assign a new lead
4. **Expected:** Lead appears on kanban in Tab A immediately
5. **Expected:** Lead appears on kanban in Tab B within 1 second (no refresh)
6. In Tab B: Drag lead to different stage
7. **Expected:** Stage change reflected in Tab A within 1 second
8. In Tab A: Open DevTools → Console
9. Create 3 new leads rapidly via admin panel
10. **Expected:** Chime plays only once (multi-tab deduplication)
11. **Expected:** Console shows "[useMultiTabSync] Channel initialized"

**BroadcastChannel Verification:**

```javascript
// Check if supported
'BroadcastChannel' in window // true/false

// Manually test sync
const channel = new BroadcastChannel('test-sync')
channel.onmessage = (e) => console.log('Message:', e.data)
channel.postMessage({ test: 'hello' })
// Should log: Message: {test: 'hello'}
```

**Pass Criteria:**
- ✅ BroadcastChannel API works (or localStorage fallback)
- ✅ State changes sync between tabs <1s
- ✅ Audio chimes only once in multi-tab
- ✅ Console logs show sync activity
- ✅ No page refresh needed to see updates

---

### 8. Lead Detail Drawer Realtime Updates

**Objective:** Verify lead detail drawer updates in real-time.

**Steps:**

1. Open consultant dashboard
2. Click a lead card to open detail drawer
3. In another window (admin panel), update lead's stage
4. **Expected:** Drawer shows updated stage immediately (no refresh)
5. Update lead status to 'stalled'
6. **Expected:** Drawer shows stalled status, audio plays
7. Log a communication for this lead
8. **Expected:** Communication appears in drawer timeline in real-time
9. Upload a document
10. **Expected:** Document appears in drawer list in real-time

**Pass Criteria:**
- ✅ Stage updates visible in drawer without refresh
- ✅ Status changes visible immediately
- ✅ Communications appear in timeline
- ✅ Documents appear in list
- ✅ Audio chimes on stall detection

---

### 9. Student Dashboard Realtime Updates

**Objective:** Verify student page sees lead updates without activity_logs.

**Steps:**

1. Login as student
2. Navigate to `/dashboard/student`
3. Open student portal/lead panel
4. In admin panel: Assign consultant to student's lead
5. **Expected:** Consultant name appears in student dashboard immediately
6. Advance lead to next stage
7. **Expected:** Stage update visible in student view
8. **Expected:** Timeline does NOT show activity_logs (only communications)
9. Admin logs activity on the lead
10. **Expected:** Activity does NOT appear in student view

**Verify RLS Enforcement:**

```javascript
// Student should only see their own leads
const { data: leads } = await supabase
  .from('leads')
  .select('*')
// Should only return leads where student_id = auth.uid()
```

**Pass Criteria:**
- ✅ Student sees their lead updates
- ✅ Student never sees activity_logs
- ✅ Real-time updates work without console errors
- ✅ RLS policies enforced (no data leakage)

---

### 10. Browser Compatibility

**Objective:** Verify Phase 8 works across browsers.

**Test Browsers:**
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

**For Each Browser:**

1. Open consultant dashboard
2. **Check:** Realtime updates work
3. **Check:** Audio plays (unmute first)
4. **Check:** Connection indicator works
5. **Check:** Notification Center accessible
6. **Check:** No console errors
7. **Check:** Multi-tab sync works (if supported)

**Known Issues:**
- Safari <15.1: BroadcastChannel not supported (falls back to localStorage polling)
- Firefox: Audio may require user interaction first
- Chrome: Autoplay blocked unless user has interacted with page

**Pass Criteria:**
- ✅ Core functionality works in all major browsers
- ✅ Graceful degradation (fallbacks work if APIs unavailable)
- ✅ No critical console errors

---

## Load Testing

### Concurrent Connections

**Objective:** Verify scalability with multiple consultants.

**Steps:**

1. Simulate 10 consultants accessing dashboard simultaneously
2. Monitor Supabase Realtime active connections
3. **Expected:** ~10 connections (not 40-50)
4. Verify latency <100ms for updates

**Simulation Script:**

```bash
# Open 10 browser tabs, each logging in as different consultant
for i in {1..10}; do
  open "http://localhost:3000/dashboard/consultant"
done
```

**Monitoring:**

```sql
-- Check Supabase connection count (varies by deployment)
-- Supabase dashboard → Realtime → Active connections
```

**Pass Criteria:**
- ✅ Connections increase linearly (1 per consultant)
- ✅ No connection exhaustion
- ✅ Updates remain responsive

---

## Regression Testing

### Phase 7 Features Still Work

- [ ] Kanban board drag-drop functionality
- [ ] Lead detail drawer opens/closes
- [ ] Stage advance works
- [ ] Document upload works
- [ ] Communication logging works
- [ ] Optimistic updates work (no full page refresh needed)
- [ ] Stall detection still runs every 15 minutes
- [ ] Un-stall on contact still works

---

## Performance Benchmarks

### Key Metrics to Monitor

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Initial load time | <2s | — | ⏳ |
| Realtime update latency | <500ms | — | ⏳ |
| Audio chime playback | <100ms | — | ⏳ |
| Notification fetch | <1s | — | ⏳ |
| Gap recovery | <2s | — | ⏳ |
| Multi-tab sync | <1s | — | ⏳ |

**Measurement (DevTools):**

```javascript
// Measure realtime update latency
const start = performance.now()
// (wait for realtime update)
const latency = performance.now() - start
console.log(`Update latency: ${latency}ms`)
```

---

## Sign-Off Checklist

- [ ] All 10 test scenarios completed and passed
- [ ] No critical console errors
- [ ] Audio chime system working
- [ ] Notification Center functional
- [ ] Connection status indicators accurate
- [ ] Multi-tab sync working
- [ ] Gap recovery confirmed
- [ ] Browser compatibility verified (Chrome, Firefox, Safari)
- [ ] Performance metrics within targets
- [ ] Phase 7 features still work (regression)
- [ ] Database migration applied successfully
- [ ] Documentation complete and accurate

---

## Known Limitations & Future Work

### Phase 8 Known Issues

- None identified during development

### Phase 8+ Roadmap

- Push notifications (browser native)
- Admin realtime subscriptions (unfiltered)
- Audio preferences UI
- Connection analytics/monitoring
- Offline queue (sync actions when reconnected)

---

## Support & Debugging

### Common Issues During Testing

**Issue: Audio not playing**
- Solution: Check browser autoplay policy, click on page first
- Solution: Verify `/public/audio/lead-chime.mp3` exists or Web Audio fallback works

**Issue: Realtime updates not appearing**
- Solution: Verify RealtimeProvider mounted in layout
- Solution: Check browser DevTools Network tab for WebSocket
- Solution: Verify Supabase publication includes required tables

**Issue: Gap recovery not working**
- Solution: Verify `/api/leads/recovery` route exists
- Solution: Check authentication/RLS policies enforced
- Solution: Monitor console for gap recovery logs

**Issue: Multi-tab sync not working**
- Solution: Check `'BroadcastChannel' in window`
- Solution: Verify tabs are same origin
- Solution: Check localStorage fallback working

---

## Test Report Template

```markdown
# Phase 8 Test Report

**Date:** YYYY-MM-DD
**Tester:** [Name]
**Environment:** [Development/Staging/Production]

## Summary
- Total Scenarios: 10
- Passed: X
- Failed: Y
- Blocked: Z

## Results

### Scenario 1: RealtimeProvider Consolidation
- Status: ✅ PASS / ❌ FAIL / ⏸️ BLOCKED
- Notes: [Any observations]

[Repeat for all 10 scenarios]

## Overall Status
- ✅ READY FOR RELEASE
- ⚠️ READY WITH CAVEATS
- ❌ NOT READY

## Notes
[Any additional observations or blockers]
```

---

**Phase 8 Testing Complete!** All tests should be performed before merging to main.
