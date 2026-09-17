/**
 * Skeleton Loader Components
 * Provides shape-matched placeholders for content being loaded
 */

export function SkeletonMetricCard() {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white p-6">
      <div className="mb-2 h-4 w-24 animate-pulse rounded bg-zinc-200" />
      <div className="h-8 w-32 animate-pulse rounded bg-zinc-200" />
      <div className="mt-4 h-3 w-40 animate-pulse rounded bg-zinc-100" />
    </div>
  );
}

export function SkeletonKanbanColumn() {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-md)] bg-zinc-50 p-4">
      {/* Column header */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-20 animate-pulse rounded bg-zinc-200" />
        <div className="h-5 w-8 animate-pulse rounded bg-zinc-200" />
      </div>

      {/* Skeleton cards */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="space-y-2 rounded-[var(--radius-md)] bg-white p-3 shadow-sm"
        >
          <div className="h-3 w-32 animate-pulse rounded bg-zinc-200" />
          <div className="h-3 w-full animate-pulse rounded bg-zinc-100" />
          <div className="h-3 w-24 animate-pulse rounded bg-zinc-100" />
          <div className="mt-2 flex gap-2">
            <div className="h-5 w-12 animate-pulse rounded-full bg-zinc-200" />
            <div className="h-5 w-12 animate-pulse rounded-full bg-zinc-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonLeadCard() {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white p-4">
      <div className="mb-3 h-4 w-40 animate-pulse rounded bg-zinc-200" />
      <div className="mb-2 h-3 w-32 animate-pulse rounded bg-zinc-100" />
      <div className="mb-4 h-3 w-28 animate-pulse rounded bg-zinc-100" />
      <div className="flex gap-2">
        <div className="h-6 w-16 animate-pulse rounded bg-zinc-200" />
        <div className="h-6 w-16 animate-pulse rounded bg-zinc-200" />
      </div>
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <tr className="border-b border-[var(--border)]">
      <td className="px-4 py-3">
        <div className="h-3 w-32 animate-pulse rounded bg-zinc-200" />
      </td>
      <td className="px-4 py-3">
        <div className="h-3 w-28 animate-pulse rounded bg-zinc-200" />
      </td>
      <td className="px-4 py-3">
        <div className="h-3 w-20 animate-pulse rounded bg-zinc-200" />
      </td>
      <td className="px-4 py-3">
        <div className="h-3 w-24 animate-pulse rounded bg-zinc-200" />
      </td>
    </tr>
  );
}

export function SkeletonList() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-[var(--radius-md)] bg-zinc-50 p-3"
        >
          <div className="h-10 w-10 flex-shrink-0 animate-pulse rounded-full bg-zinc-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 animate-pulse rounded bg-zinc-200" />
            <div className="h-2 w-24 animate-pulse rounded bg-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonFormField() {
  return (
    <div className="space-y-2">
      <div className="h-3 w-20 animate-pulse rounded bg-zinc-200" />
      <div className="h-9 w-full animate-pulse rounded border border-[var(--border)] bg-zinc-50" />
    </div>
  );
}

export function SkeletonParagraph() {
  return (
    <div className="space-y-2">
      <div className="h-3 w-full animate-pulse rounded bg-zinc-200" />
      <div className="h-3 w-full animate-pulse rounded bg-zinc-200" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-200" />
    </div>
  );
}
