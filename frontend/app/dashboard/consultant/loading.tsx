/**
 * Loading skeleton for consultant dashboard
 * Displays while the page is hydrating with async data
 */

import { SkeletonMetricCard, SkeletonKanbanColumn } from '@/app/components/skeleton'

export default function ConsultantDashboardLoading() {
  return (
    <div className="flex min-h-full flex-col bg-[var(--background)]">
      {/* ── Top bar skeleton ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-4 w-24 animate-pulse rounded bg-zinc-200" />
            <div className="hidden sm:block h-3 w-16 animate-pulse rounded bg-zinc-100" />
          </div>

          <div className="hidden md:block h-4 w-32 animate-pulse rounded bg-zinc-100" />

          <div className="flex items-center gap-3 shrink-0">
            <div className="h-5 w-5 animate-pulse rounded bg-zinc-200" />
            <div className="h-3 w-12 animate-pulse rounded bg-zinc-100" />
          </div>
        </div>
      </header>

      {/* ── Page body ───────────────────────────────────────────────────── */}
      <main className="flex-1 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-screen-xl space-y-6">
          {/* Title and subtitle */}
          <div className="space-y-1">
            <div className="h-5 w-40 animate-pulse rounded bg-zinc-200" />
            <div className="h-3 w-56 animate-pulse rounded bg-zinc-100" />
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-3 gap-3">
            <SkeletonMetricCard />
            <SkeletonMetricCard />
            <SkeletonMetricCard />
          </div>

          {/* Kanban columns */}
          <section>
            <div className="mb-3 h-3 w-20 animate-pulse rounded bg-zinc-200" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <SkeletonKanbanColumn />
              <SkeletonKanbanColumn />
              <SkeletonKanbanColumn />
              <SkeletonKanbanColumn />
              <SkeletonKanbanColumn />
              <SkeletonKanbanColumn />
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
