# Responsive Design Testing & Validation

## Breakpoints to Test

Per Phase 10 specification:
- **320px** (small mobile)
- **375px** (iPhone primary)
- **768px** (tablet)
- **1024px** (small desktop)
- **1440px** (large desktop)

## Tailwind Breakpoints Used

Apex CRM uses Tailwind's responsive prefixes:
- `sm:` = 640px (small devices)
- `md:` = 768px (medium devices)
- `lg:` = 1024px (large devices)
- `xl:` = 1280px (extra large)
- `2xl:` = 1536px (2x extra large)

## Testing Checklist

### 1. Mobile (320px, 375px)

#### Navigation & Layout
- [ ] No horizontal overflow (test with pinch zoom disabled)
- [ ] Bottom navigation for students is visible and accessible
- [ ] Collapsible sidebar for consultants/admins stacks properly
- [ ] Top bar doesn't overflow, all buttons are tap-friendly (≥44px)

#### Touch Targets
- [ ] All buttons are at least 44×44px (WCAG AAA standard)
- [ ] Form inputs have adequate padding
- [ ] Links have sufficient tap area
- [ ] Close buttons (X) are not too small

#### Text & Readability
- [ ] Font sizes remain readable (not <12px)
- [ ] Line height remains comfortable (≥1.5)
- [ ] Columns don't exceed ~600px width
- [ ] Lists don't have excessive nesting

#### Forms
- [ ] Form labels are above inputs (not inline)
- [ ] Inputs expand to full width or reasonable max
- [ ] Error messages don't overflow
- [ ] File upload areas are tappable

#### Data Tables
- [ ] Tables scroll horizontally gracefully (if needed)
- [ ] Sticky headers remain sticky on scroll
- [ ] Actions (edit, delete) are clearly visible
- [ ] No content is hidden behind table overflow

#### Images
- [ ] Images scale down proportionally
- [ ] Profile pictures remain visible
- [ ] Status indicator icons are clear
- [ ] No images cause horizontal overflow

### 2. Tablet (768px)

#### Navigation & Layout
- [ ] Sidebar is collapsible (side navigation available)
- [ ] Content area uses proper margins
- [ ] Two-column layouts work well
- [ ] Modals/drawers fit on screen with padding

#### Components
- [ ] Cards maintain grid layout (2-3 columns)
- [ ] Metric cards are readable
- [ ] Kanban columns are visible (may need horizontal scroll)
- [ ] Search/filter bars are accessible

#### Touch & Interaction
- [ ] All interactive elements are tap-friendly
- [ ] Hover states work with pointer interaction
- [ ] Keyboard navigation works smoothly

### 3. Desktop (1024px, 1440px)

#### Layout & Density
- [ ] All content is visible without horizontal scroll
- [ ] Sidebar is always visible (no collapse needed on 1024px+)
- [ ] Kanban columns all visible (6 stages: inquiry, consultation, documents, application, decision, enrolled)
- [ ] Data tables show all columns without scrolling

#### Multi-column Layouts
- [ ] 3-column grid layouts render correctly
- [ ] 4-column metric cards maintain consistent sizing
- [ ] Content doesn't feel stretched on 1440px

#### Readability
- [ ] Maximum line length is reasonable (~65-80 chars)
- [ ] Content doesn't feel cramped
- [ ] Hover states are obvious
- [ ] Focus rings are visible

## Testing Tools & Methods

### Browser DevTools
```
Chrome/Edge:
  - Ctrl/Cmd + Shift + M (toggle device toolbar)
  - Set custom viewport sizes: 320, 375, 768, 1024, 1440
  - Test with device presets (iPhone SE, iPad, etc.)

Firefox:
  - Ctrl/Cmd + Shift + M (responsive design mode)
  - Custom viewport sizes available

Safari:
  - Develop → Enter Responsive Design Mode
  - Custom viewport sizes available
```

### Physical Devices
- [ ] Test on actual iPhone (375px or 390px)
- [ ] Test on actual iPad (768px or 834px)
- [ ] Test on actual desktop (1440px or larger)

### Automated Testing
```bash
# Responsive design testing with Playwright
npx playwright test --project chromium

# Visual regression testing
npx playwright codegen --viewport-size=320,667 http://localhost:3000
```

## Specific Component Testing

### Consultant Dashboard
**320px:**
- [ ] Kanban columns stack vertically or scroll horizontally
- [ ] Metrics cards stack in 1 column
- [ ] Lead cards are single column
- [ ] Notification bell is accessible

**768px:**
- [ ] Kanban may show 2-3 columns per row
- [ ] Metrics show 1-2 per row

**1024px+:**
- [ ] All 6 kanban columns visible (or with minimal scroll)
- [ ] Metrics show 3 in a row
- [ ] Side-by-side layout for drawer + kanban

### Admin Dashboard
**320px:**
- [ ] Table converts to card view (if implemented)
- [ ] Sidebar is collapsed/drawer
- [ ] Metric cards stack in 1 column

**768px:**
- [ ] Table may have horizontal scroll
- [ ] Sidebar is visible
- [ ] Metrics show 2 per row

**1024px+:**
- [ ] Table is full width with all columns visible
- [ ] Sidebar is always visible
- [ ] Metrics show 4 in a row

### Student Dashboard
**320px:**
- [ ] Application list is single column
- [ ] Status card is full width
- [ ] Navigation is accessible

**768px+:**
- [ ] Can show 2 columns if space permits
- [ ] Status card is prominent

### Apply Form
**All sizes:**
- [ ] Form never exceeds 560px width (enforced with `max-w-[560px]`)
- [ ] Centered on large screens
- [ ] Full width with padding on mobile

## CSS Media Query Patterns Used

### Existing Patterns in Codebase
```css
/* Tailwind responsive classes */
px-4 sm:px-6 lg:px-8           /* Horizontal padding scales */
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3  /* Grid columns scale */
hidden sm:block md:hidden lg:block /* Conditional visibility */
max-w-screen-xl mx-auto         /* Max width container */
```

### Viewport Meta Tag
Already set in Next.js default (verified in layout.tsx):
```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

## No Horizontal Overflow Rule

**Critical:** All pages must pass:
```css
/* Add to globals.css for testing (remove after) */
* {
  outline: 2px solid red;
  outline-offset: -2px;
}
html {
  overflow-x: hidden;
}
```

If any element has red outline extending beyond viewport → needs fixing.

## Touch Target Sizing

**WCAG AAA Standard: 44×44px minimum**

Check buttons/links:
```
- Login form buttons: ✓ ~48px tall
- Notification bell: ✓ ~40px diameter (could be larger)
- Close button (X): ✓ ~24px (marginal, could be 44px)
- Status badge clicks: ✓ ~32px (marginal)
```

## Performance on Slow Networks

**Recommended testing scenarios:**
- [ ] Slow 3G (DevTools throttling)
- [ ] Fast 3G (DevTools throttling)
- [ ] 4G LTE (DevTools throttling)

With skeleton loaders:
- [ ] Metrics skeletons show immediately
- [ ] Kanban columns load progressively
- [ ] Forms are interactive during load

## Zoom Testing (200%)

Per Phase 10 spec:
```
DevTools → Three dots → More tools → Rendering → emulate CSS media feature prefers-reduced-data
Or: Browser zoom to 200% manually
```

Test at 200% zoom:
- [ ] Layout reflows properly (no horizontal scroll)
- [ ] Text remains readable
- [ ] Buttons are still clickable
- [ ] Images scale appropriately

## Orientation Testing

**Landscape:**
- [ ] Mobile (320px height, 568px+ width)
- [ ] Tablet (600px height, 1000px+ width)

**Portrait:**
- [ ] Mobile (375px width, 812px+ height)
- [ ] Tablet (768px width, 1024px+ height)

## Color Contrast Validation

At different breakpoints, ensure:
- [ ] Text remains ≥4.5:1 contrast (WCAG AA)
- [ ] Large text (24px+) maintains ≥3:1 contrast
- [ ] No color-only indicators (use icons + color)

## Sign-off Checklist

- [ ] All pages tested at 320px (no horizontal scroll)
- [ ] All pages tested at 375px (primary mobile target)
- [ ] All pages tested at 768px (tablet)
- [ ] All pages tested at 1024px (desktop)
- [ ] All pages tested at 1440px (large desktop)
- [ ] Touch targets are ≥44px
- [ ] No responsive regressions detected
- [ ] Zoom to 200% works smoothly
- [ ] Landscape orientation works
- [ ] Loading states appear correctly
- [ ] Forms are usable on mobile
- [ ] Navigation is accessible on mobile

## Pages to Test

1. **Login** (`/login`) — small width focus
2. **Apply** (`/apply`) — form validation on mobile
3. **Status Lookup** (`/status`) — search form
4. **Consultant Dashboard** (`/dashboard/consultant`) — kanban board
5. **Admin Dashboard** (`/dashboard/admin`) — data tables
6. **Student Dashboard** (`/dashboard/student`) — lead cards
7. **Lead Detail Drawer** — modal responsiveness
8. **Notification Bell** — dropdown on mobile

## Manual Testing Steps

### For Each Breakpoint:
```bash
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Set viewport to: 320, 375, 768, 1024, 1440
4. Navigate to each page
5. Check:
   - No horizontal overflow
   - All text readable
   - Buttons are tap-friendly
   - Forms are usable
   - Images scale properly
   - Modals fit on screen
6. Zoom to 200% and repeat
7. Test in landscape orientation
8. Test on actual device if available
```

### Before Production Deploy:
```bash
npm run build  # Verify no build errors
npm run start  # Test production build locally
# Then test with all breakpoints and devices
```

## Known Issues & Solutions

### Issue: Kanban too wide on mobile
**Solution:** Already implemented with `hidden` class and responsive grid
- Verify: `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` on kanban

### Issue: Form labels overflow on mobile
**Solution:** Use responsive font sizes
- Check: All labels use `text-sm` or smaller on mobile

### Issue: Table horizontal scroll on tablet
**Solution:** Implement responsive table display
- Check: Sticky headers remain when scrolling

### Issue: Drawer closes on mobile
**Solution:** Increase modal z-index and viewport constraints
- Check: Modal is full-width on mobile with proper padding

## References

- [WCAG 2.1 Touch Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [Responsive Design in Tailwind](https://tailwindcss.com/docs/responsive-design)
- [Testing Responsive Web Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [Mobile Accessibility](https://www.w3.org/WAI/standards-guidelines/wcag/mobile/)
