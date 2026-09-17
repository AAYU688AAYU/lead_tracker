# XSS Prevention Guide — Phase 10

**Objective:** Prevent Cross-Site Scripting (XSS) attacks by safely handling user-generated content throughout the application.

---

## What is XSS?

Cross-Site Scripting (XSS) occurs when an attacker injects malicious JavaScript into a web application, which then executes in users' browsers.

### Example Attack
```html
<!-- User enters this in a notes field: -->
<img src=x onerror="alert('XSS')">

<!-- If not sanitized, it executes in all users' browsers viewing this note -->
```

### Risk in Lead Tracker
The lead notes field is displayed to multiple consultants and admins. If an attacker or admin injects malicious code into notes, it executes in everyone's browser who views that lead.

---

## Prevention Strategy

### Rule 1: Never Trust User Input
```typescript
// ❌ WRONG — Directly renders user content
<div>{userInput}</div>

// ✅ CORRECT — Use text content or sanitize
<div>{sanitizeHtml(userInput)}</div>
```

### Rule 2: Sanitize Before Rendering
```typescript
import { sanitizeHtml } from '@/lib/sanitize'

// Sanitize removes malicious HTML/JavaScript
const safe = sanitizeHtml(userInput)

// Now safe to render
<div dangerouslySetInnerHTML={{ __html: safe }} />
```

### Rule 3: Use Text Content When Possible
```typescript
// ✅ BEST — Use as text (automatic escaping)
<div className="whitespace-pre-wrap">{userText}</div>

// ✅ GOOD — Use formatted text with manual escaping
<div dangerouslySetInnerHTML={{ __html: formatUserText(userText) }} />

// ❌ AVOID — dangerouslySetInnerHTML without sanitization
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

### Rule 4: Sanitize at Display Time
```typescript
// Sanitization happens when rendering, not when storing
// This allows admins to edit and update notes safely

export function NotesDisplay({ notes }: { notes: string }) {
  return (
    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(notes) }} />
  )
}
```

---

## Safe User Input Handling

### Sanitization Functions

#### 1. `sanitizeHtml(html: string): string`
Removes dangerous HTML while preserving safe formatting.

**Allowed tags:** `<b>`, `<i>`, `<em>`, `<strong>`, `<br>`, `<p>`, `<ul>`, `<ol>`, `<li>`  
**Blocked:** Scripts, event handlers, links with javascript:, data attributes

```typescript
import { sanitizeHtml } from '@/lib/sanitize'

const userNotes = '<b>Important</b><script>alert("xss")</script>'
const safe = sanitizeHtml(userNotes)  // Returns: "<b>Important</b>"
```

#### 2. `sanitizePlainText(text: string): string`
Removes all HTML tags (fallback for environments without DOMPurify).

```typescript
import { sanitizePlainText } from '@/lib/sanitize'

const userText = '<b>Important</b><script>alert("xss")</script>'
const safe = sanitizePlainText(userText)  // Returns: "Important"
```

#### 3. `escapeHtml(text: string): string`
Converts HTML special characters to entities. Use for plain text display.

```typescript
import { escapeHtml } from '@/lib/sanitize'

const userText = '<script>alert("xss")</script>'
const safe = escapeHtml(userText)  // Returns: "&lt;script&gt;..."
// Safe to use in dangerouslySetInnerHTML
```

#### 4. `formatUserText(text: string): string`
Converts user text to safe HTML with newlines as `<br>`.

```typescript
import { formatUserText } from '@/lib/sanitize'

const userText = 'Line 1\nLine 2<script>alert("xss")</script>'
const html = formatUserText(userText)  
// Returns: "Line 1<br>Line 2&lt;script&gt;..."
```

---

## React Components

### Safe Display Patterns

#### Pattern 1: Plain Text (Best for Simple Content)
```tsx
// ✅ BEST — Automatic XSS prevention
<p className="whitespace-pre-wrap text-sm">{userNotes}</p>

// No dangerouslySetInnerHTML needed
// React automatically escapes the content
```

#### Pattern 2: Formatted Text with Escaping
```tsx
import { formatUserText } from '@/lib/sanitize'

// ✅ GOOD — Manual formatting with escaping
<p
  dangerouslySetInnerHTML={{
    __html: formatUserText(userNotes),
  }}
/>

// Converts newlines to <br>, escapes HTML
```

#### Pattern 3: Sanitized HTML (For Limited Formatting)
```tsx
import { sanitizeHtml } from '@/lib/sanitize'

// ✅ OK — For allowing some HTML tags
<div
  dangerouslySetInnerHTML={{
    __html: sanitizeHtml(userNotes),
  }}
/>

// Only allows: b, i, em, strong, br, p, ul, ol, li
// Blocks all scripts and event handlers
```

### Current Implementation (Lead Drawer)

```tsx
// BEFORE: Vulnerable to XSS
{lead.notes && <p>{lead.notes}</p>}  // ❌ Direct render

// AFTER: Safe
{lead.notes && (
  <p
    dangerouslySetInnerHTML={{
      __html: sanitizeHtml(lead.notes),
    }}
  />
)}  // ✅ Sanitized
```

---

## Content Security Policy (CSP)

Add CSP headers to prevent inline script execution:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline';
```

**Better:**
```
Content-Security-Policy: default-src 'self'; script-src 'self';
```

---

## Testing for XSS

### Manual Test Cases

1. **Basic Script Tag**
   ```
   <script>alert('XSS')</script>
   ```
   Expected: Script removed, no alert

2. **Event Handler**
   ```
   <img src=x onerror="alert('XSS')">
   ```
   Expected: Img removed, no alert

3. **Data URI**
   ```
   <a href="javascript:alert('XSS')">Click</a>
   ```
   Expected: Link removed or href stripped

4. **Encoded Attack**
   ```
   &#60;script&#62;alert('XSS')&#60;/script&#62;
   ```
   Expected: Decoded and removed

5. **Safe Content**
   ```
   <b>Important</b><p>This is safe</p>
   ```
   Expected: Tags preserved, content visible

### Automated Testing
```typescript
import { sanitizeHtml } from '@/lib/sanitize'

describe('XSS Prevention', () => {
  it('should remove script tags', () => {
    const input = '<script>alert("xss")</script>Text'
    const output = sanitizeHtml(input)
    expect(output).toBe('Text')
  })

  it('should preserve safe formatting', () => {
    const input = '<b>Bold</b><i>Italic</i>'
    const output = sanitizeHtml(input)
    expect(output).toBe('<b>Bold</b><i>Italic</i>')
  })

  it('should remove event handlers', () => {
    const input = '<img src=x onerror="alert(\'xss\')">'
    const output = sanitizeHtml(input)
    expect(output).not.toContain('onerror')
  })
})
```

---

## Locations Using User Content (Audit)

All of these should use `sanitizeHtml()` or `formatUserText()`:

| Location | Content Type | Current Status | Sanitization |
|----------|--------------|----------------|---------------|
| Lead Notes | Admin/Consultant input | ✅ Fixed | sanitizeHtml() |
| Activity Logs | System-generated | ✅ Safe | N/A (system content) |
| Communication Logs | System-generated | ✅ Safe | N/A (system content) |
| Document Notes | User text | 🟡 Review | Should sanitize |
| Lead Status Dropdown | System values | ✅ Safe | N/A (enum) |

---

## Checklist for New Features

When adding user-generated content display:

- [ ] **Identify sources:** Where is user content coming from?
- [ ] **Choose method:** Text render, formatted text, or sanitized HTML?
- [ ] **Import utility:** `import { sanitizeHtml } from '@/lib/sanitize'`
- [ ] **Apply sanitization:** `dangerouslySetInnerHTML={{ __html: sanitizeHtml(...) }}`
- [ ] **Test:** Try XSS payloads from above
- [ ] **Document:** Add to audit table above
- [ ] **Review:** Have another dev review the implementation

---

## External Resources

- OWASP XSS Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- DOMPurify Documentation: https://github.com/cure53/DOMPurify
- React Security: https://react.dev/learn/security
- CWE-79 Cross-site Scripting: https://cwe.mitre.org/data/definitions/79.html

---

## Common Mistakes

### ❌ Mistake 1: Sanitizing Input Instead of Output
```typescript
// WRONG
const savedNotes = sanitizeHtml(userInput)  // Don't sanitize when saving
await db.notes.insert({ content: savedNotes })

// CORRECT
await db.notes.insert({ content: userInput })  // Save as-is
// Then sanitize when rendering:
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(dbNotes) }} />
```

### ❌ Mistake 2: Mixing Escaped and Unescaped Content
```typescript
// WRONG
const html = `<p>${escapeHtml(text1)}</p>${unsafeHtml}`

// CORRECT
const html = `<p>${escapeHtml(text1)}</p>${sanitizeHtml(unsafeHtml)}`
```

### ❌ Mistake 3: Forgetting About Attributes
```typescript
// WRONG — Unsafe attributes still render
<div className="user-class">{userContent}</div>

// CORRECT — Sanitize both content and attributes
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(userContent) }} />
```

---

## Contact & Questions

Questions about XSS prevention? Refer to:
- This document: `XSS_PREVENTION.md`
- Sanitize utilities: `lib/sanitize.ts`
- Real example: `components/lead-drawer.tsx` NotesSection

Phase 10 security implementation — last updated Sept 18, 2026
