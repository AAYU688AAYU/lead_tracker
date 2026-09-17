/**
 * Loading skeleton for student dashboard
 */

import { SkeletonMetricCard, SkeletonLeadCard, SkeletonParagraph } from '@/app/components/skeleton'

export default function StudentDashboardLoading() {
  return (
    <div className="flex min-h-full flex-col bg-[var(--background)]">
      {/* Top bar skeleton */}
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="h-4 w-24 animate-pulse rounded bg-zinc-200" />
          <div className="flex gap-2">
            <div className="h-5 w-5 animate-pulse rounded bg-zinc-200" />
            <div className="h-3 w-12 animate-pulse rounded bg-zinc-100" />
          </div>
        </div>
      </header>

      {/* Page body */}
      <main className="flex-1 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Title */}
          <div className="space-y-1">
            <div className="h-5 w-40 animate-pulse rounded bg-zinc-200" />
            <div className="h-3 w-48 animate-pulse rounded bg-zinc-100" />
          </div>

          {/* Status metric */}
          <SkeletonMetricCard />

          {/* Application cards */}
          <section>
            <div className="mb-3 h-4 w-28 animate-pulse rounded bg-zinc-200" />
            <div className="space-y-3">
              <SkeletonLeadCard />
              <SkeletonLeadCard />
            </div>
          </section>

          {/* Next steps section */}
          <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white p-4">
            <div className="mb-3 h-4 w-32 animate-pulse rounded bg-zinc-200" />
            <SkeletonParagraph />
          </section>
        </div>
      </main>
    </div>
  )
}
