/**
 * Loading skeleton for admin dashboard
 */

import { SkeletonMetricCard, SkeletonTableRow } from '@/app/components/skeleton'

export default function AdminDashboardLoading() {
  return (
    <div className="flex min-h-full bg-[var(--background)]">
      {/* Sidebar skeleton */}
      <div className="hidden md:block w-64 border-r border-[var(--border)] bg-white p-4 space-y-6">
        <div className="h-6 w-32 animate-pulse rounded bg-zinc-200" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-4 w-40 animate-pulse rounded bg-zinc-100" />
          ))}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="h-5 w-40 animate-pulse rounded bg-zinc-200" />
              <div className="mt-1 h-3 w-56 animate-pulse rounded bg-zinc-100" />
            </div>
            <div className="h-9 w-24 animate-pulse rounded bg-zinc-200" />
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SkeletonMetricCard />
            <SkeletonMetricCard />
            <SkeletonMetricCard />
            <SkeletonMetricCard />
          </div>

          {/* Table skeleton */}
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white overflow-hidden">
            <table className="w-full">
              <thead className="bg-zinc-50 border-b border-[var(--border)]">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <div className="h-3 w-24 animate-pulse rounded bg-zinc-200" />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="h-3 w-20 animate-pulse rounded bg-zinc-200" />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="h-3 w-16 animate-pulse rounded bg-zinc-200" />
                  </th>
                  <th className="px-4 py-3 text-right">
                    <div className="h-3 w-16 animate-pulse rounded bg-zinc-200" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <SkeletonTableRow key={i} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
