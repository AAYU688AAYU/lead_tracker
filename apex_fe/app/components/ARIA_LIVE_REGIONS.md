# ARIA Live Regions Guide

## Overview

ARIA live regions announce dynamic content changes to screen reader users without requiring focus changes. This is critical for real-time updates that would otherwise be missed.

## Implementation in Apex CRM

### 1. Notification Bell (notification-bell.tsx)

**Purpose:** Announce unread notification count changes to screen readers

**Implementation:**
```tsx
{/* Screen reader announcements for count changes */}
<div 
  aria-live="polite" 
  aria-atomic="true"
  className="sr-only"
  role="status"
>
  {unreadCount > 0 
    ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
    : 'No unread notifications'
  }
</div>
```

**How it works:**
- `aria-live="polite"`: Announces changes when user pauses (doesn't interrupt speech)
- `aria-atomic="true"`: Reads entire region when it changes, not just differences
- `sr-only` class: Hides visually but keeps content accessible to screen readers
- `role="status"`: Indicates this is a status message (implicit with aria-live)

**When to use:**
- Real-time counters (unread messages, notifications)
- Status updates (task completion, validation)
- Non-critical announcements that can wait for a pause

### 2. Notifications Dropdown (notification-bell.tsx)

**Purpose:** Announce when new notifications appear in the dropdown list

**Implementation:**
```tsx
<div
  ref={dropdownRef}
  role="region"
  aria-label="Notifications"
  aria-live="polite"
  className="absolute right-0 top-12 z-50 w-80 ..."
>
  {/* notification items */}
</div>
```

**How it works:**
- `role="region"`: Landmark region for easy navigation
- `aria-label="Notifications"`: Identifies the region to screen readers
- `aria-live="polite"`: Announces when list content changes

### 3. List and List Items (notification-bell.tsx)

**Purpose:** Proper semantic structure for notification list

**Implementation:**
```tsx
<div className="max-h-96 overflow-y-auto" role="list">
  {/* ... */}
  <ul className="divide-y divide-[var(--border)]">
    {notifications.map(notification => (
      <li key={notification.id} role="listitem">
        {/* content */}
      </li>
    ))}
  </ul>
</div>
```

**Why both semantic HTML and ARIA roles:**
- `<ul>` and `<li>` are semantic HTML
- Additional `role="list"` and `role="listitem"` ensure compatibility
- Helps screen readers understand content structure

## aria-live Regions in Apex CRM

### When to Add aria-live

Add `aria-live` to elements that:
1. **Update dynamically** without full page reload
2. **Contain important information** that users should know about
3. **Change based on real-time events** (Realtime subscriptions, server updates)

### When NOT to Add aria-live

Don't add `aria-live` to:
1. Form validation errors (use aria-describedby instead)
2. Content users are already focused on (they can hear it anyway)
3. Navigation updates (let page load announce changes)
4. Verbose content that would interrupt constantly

## aria-live Politeness Levels

### aria-live="polite"
- Waits for current speech to finish before announcing
- Suitable for non-urgent updates (notifications, counts)
- Most common choice
- **Used in Apex CRM:** notification count, dropdown updates

### aria-live="assertive"
- Interrupts current speech immediately
- Suitable for urgent alerts (errors, security warnings)
- Use sparingly
- **Example:** "Session expired, please log in"

### aria-live="off" (default)
- No automatic announcements
- Use this explicitly when you don't want aria-live behavior on child elements

## Best Practices

### 1. Use sr-only for Screen Reader-Only Content
```tsx
<div aria-live="polite" className="sr-only" role="status">
  Status update message here
</div>
```
- Hides content visually (1px offscreen, clipped)
- Kept in DOM for screen readers
- Prevents visual clutter while maintaining accessibility

### 2. Use aria-atomic for Complete Announcements
```tsx
<div aria-live="polite" aria-atomic="true">
  You have 5 unread messages
</div>
```
- Announces entire region text, not just changes
- Better for simple status messages
- Don't use for long lists (set `aria-atomic="false"` or omit)

### 3. Use aria-label to Identify Regions
```tsx
<div role="region" aria-label="Notifications" aria-live="polite">
  {/* content */}
</div>
```
- Helps users understand what the region contains
- Announced when user navigates to region
- Use descriptive, concise labels

### 4. Use Role + aria-live Together
```tsx
<div role="status" aria-live="polite">
  {/* message */}
</div>
```
- `role="status"` implies `aria-live="polite"` but explicit is better
- Other useful roles: `role="alert"` (implies `aria-live="assertive"`)

## Examples in Codebase

### Example 1: Loading State Announcement
```tsx
{loading && (
  <div className="px-4 py-8 text-center">
    <div className="inline-block h-4 w-4 animate-spin ..." />
    <p className="sr-only">Loading notifications...</p>
  </div>
)}
```
- Announces "Loading notifications..." when items load
- Doesn't interrupt ongoing speech (polite)

### Example 2: Real-time Counter
```tsx
<div aria-live="polite" aria-atomic="true" className="sr-only" role="status">
  {unreadCount > 0 
    ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
    : 'No unread notifications'
  }
</div>
```
- Changes when unreadCount updates
- Announces full message each time
- Hidden visually (also has visual badge)

### Example 3: Form Validation Error
```tsx
<input
  id="email"
  name="email"
  aria-describedby="email-error"
  className="..."
/>
<div id="email-error" role="alert">
  Email is required
</div>
```
- Uses `aria-describedby` to associate error
- `role="alert"` makes error assertive
- Focused input announces error immediately

## Testing with Screen Readers

### NVDA (Windows, free)
1. Download: https://www.nvaccess.org/
2. Enable virtual cursor (Insert + Space)
3. Navigate with arrow keys
4. Listen for aria-live announcements

### JAWS (Windows, paid)
1. Similar navigation with arrow keys
2. Use web rotor (Insert + F3) to navigate regions
3. More complex but industry standard

### VoiceOver (macOS, iOS, built-in)
1. Enable: System Preferences → Accessibility → VoiceOver
2. Navigate: VO key (Ctrl+Option) + arrow keys
3. Web rotor: VO + U to see landmarks including live regions

### Testing Checklist
- [ ] aria-live region is announced when content changes
- [ ] aria-label describes region clearly
- [ ] Screen reader doesn't read content twice
- [ ] politeness level is appropriate (polite vs assertive)
- [ ] No keyboard focus is needed to hear announcements
- [ ] Announcement doesn't interrupt ongoing speech excessively

## Common Mistakes

### ❌ Too Much Content in aria-live
```tsx
// BAD: reads entire page when it updates
<div aria-live="polite" aria-atomic="true">
  {/* 10 notification items */}
</div>
```

### ✅ Correct: Specific Status Update
```tsx
// GOOD: announces only the status change
<div aria-live="polite" className="sr-only" role="status">
  {unreadCount} new notifications
</div>
```

### ❌ Using assertive for Everything
```tsx
// BAD: interrupts screen reader speech constantly
<div aria-live="assertive">
  {/* every update */}
</div>
```

### ✅ Use assertive Only for Important Alerts
```tsx
// GOOD: only for urgent information
<div role="alert">
  Your session has expired. Please log in again.
</div>
```

### ❌ Forgetting aria-label on Regions
```tsx
// BAD: user doesn't know what region is for
<div role="region" aria-live="polite">
  {/* content */}
</div>
```

### ✅ Always Label Regions
```tsx
// GOOD: clear purpose
<div role="region" aria-label="Real-time Status" aria-live="polite">
  {/* content */}
</div>
```

## Future Enhancements

### Areas for Additional Live Regions in Apex CRM

1. **Lead Status Updates**
   ```tsx
   <div role="status" aria-live="polite" className="sr-only">
     Lead moved to {nextStage}
   </div>
   ```

2. **Error Toast Notifications**
   ```tsx
   <div role="alert" aria-live="assertive">
     {error message}
   </div>
   ```
   (already implemented in ErrorToast)

3. **Form Validation**
   ```tsx
   <div role="alert" aria-live="assertive">
     {validation errors}
   </div>
   ```

4. **Background Job Completion**
   ```tsx
   <div role="status" aria-live="polite" className="sr-only">
     Document processing complete
   </div>
   ```

5. **Realtime Data Updates**
   ```tsx
   <div role="status" aria-live="polite" className="sr-only">
     {dynamicData.updated_at}
   </div>
   ```

## References

- [MDN: aria-live](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-live)
- [WebAIM: ARIA Live Regions](https://webaim.org/articles/aria/liveregions/)
- [W3C: ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WCAG 2.1: Status Messages](https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html)
