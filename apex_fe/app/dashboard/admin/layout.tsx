'use client'

/**
 * Admin shell layout — wraps every /dashboard/admin/* page.
 *
 * Renders a top nav bar with:
 *   Overview  |  Team  |  Pipeline Settings  |  Analytics
 *
 * Uses usePathname() so the active tab is highlighted without a full
 * page reload. Server Components nested inside are still server-rendered
 * because the layout only adds a client shell around {children}.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// ---------------------------------------------------------------------------
// Nav item definitions
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { label: 'Overview',          href: '/dashboard/admin' },
  { label: 'Team',              href: '/dashboard/admin/team' },
  { label: 'Pipeline Settings', href: '/dashboard/admin/pipeline-settings' },
  { label: 'Analytics',         href: '/dashboard/admin/analytics' },
] as const

// ---------------------------------------------------------------------------
// AdminLayout
// ---------------------------------------------------------------------------

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-full bg-[var(--background)]">
      {/* ── Top nav bar ─────────────────────────────────────────────── */}
      <nav
        aria-label="Admin navigation"
        className="border-b border-[var(--border)] bg-white"
      >
        <div className="mx-auto flex max-w-5xl items-end gap-0 px-4 sm:px-6">
          {NAV_ITEMS.map(item => {
            // Exact match for Overview (so /team doesn't highlight it too)
            const isActive =
              item.href === '/dashboard/admin'
                ? pathname === '/dashboard/admin'
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'inline-block border-b-2 px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1',
                  isActive
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'border-transparent text-[var(--text-muted)] hover:border-[var(--border)] hover:text-[var(--text)]',
                ].join(' ')}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* ── Page content ────────────────────────────────────────────── */}
      {children}
    </div>
  )
}
