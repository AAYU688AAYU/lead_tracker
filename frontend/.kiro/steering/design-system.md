# Design System

## Avoid, everywhere
Gradients (any two-tone), glassmorphism/frosted-blur cards, floating 3D blobs or stock illustration,
emoji as functional icons, fully-rounded "pill" treatment on non-pill elements, decorative stat-cards
with no real data behind them, heavy drop-shadows or neumorphism, lorem ipsum or "Item 1/Item 2" placeholders.

## Tokens (use these exactly — do not invent alternates)
- Background: off-white neutral, `#FAFAF9`. Dark mode not in scope for v1.
- Text: near-black, `#1A1A18`. Secondary text: `#6B6B66`.
- Accent (primary actions, current-stage highlight, links): ONE color only — set as `--accent` CSS variable,
  default `#2B5F4A` (muted forest green — swap for brand color later by changing this one variable, nothing else).
- Stalled indicator: `#B8722E` (muted amber), used only as a small dot + label, never a full-card highlight.
- Destructive actions (reject, delete): `#A13D3D` (muted red), used sparingly.
- Font: a single grotesk sans (e.g. IBM Plex Sans or Public Sans) for all UI text — no second display font.
  Hierarchy comes from weight (400/500/600) and size, not from mixing typefaces.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48px. No arbitrary values outside this scale.
- Radius scale: 4px on inputs/buttons, 8px on cards/panels. Full-round (9999px) reserved only for true pill
  elements — status badges, avatar circles. Never on buttons or cards.
- Motion: opacity/color transitions only, 120–150ms. No scale, bounce, or slide-bounce easing anywhere.

## Layout
Every screen is built mobile-first, then given an explicit desktop layout — never a desktop layout that
gets compressed for small screens. Where a desktop interaction pattern doesn't translate (e.g. drag-and-drop),
the mobile equivalent is specified per-phase below; build that exact pattern, not an improvised one.

Stack: Next.js App Router, Supabase (Postgres + Auth + Realtime + Storage), Tailwind — configured to read
the tokens above as CSS variables, not hardcoded Tailwind defaults.

Hook: configure a Kiro Agent Hook to run typecheck + lint after every task, not just at phase end.
