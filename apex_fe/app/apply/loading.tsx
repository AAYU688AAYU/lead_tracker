/**
 * Loading skeleton for application form
 */

import { SkeletonFormField } from '@/app/components/skeleton'

export default function ApplyLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4 py-12 sm:px-6 sm:py-16">
      <div className="w-full max-w-[560px] space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="h-6 w-48 mx-auto animate-pulse rounded bg-zinc-200" />
          <div className="h-3 w-64 mx-auto animate-pulse rounded bg-zinc-100" />
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          <SkeletonFormField />
          <SkeletonFormField />
          <SkeletonFormField />
          <SkeletonFormField />
          
          {/* Large textarea */}
          <div className="space-y-2">
            <div className="h-3 w-20 animate-pulse rounded bg-zinc-200" />
            <div className="h-20 w-full animate-pulse rounded border border-[var(--border)] bg-zinc-50" />
          </div>

          {/* File upload area */}
          <div className="space-y-2">
            <div className="h-3 w-20 animate-pulse rounded bg-zinc-200" />
            <div className="h-24 w-full animate-pulse rounded border-2 border-dashed border-[var(--border)] bg-zinc-50" />
          </div>
        </div>

        {/* Submit button */}
        <div className="h-9 w-full animate-pulse rounded bg-zinc-200" />
      </div>
    </div>
  )
}
