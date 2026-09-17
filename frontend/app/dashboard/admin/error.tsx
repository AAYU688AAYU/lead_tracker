'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Admin dashboard error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-4 py-12">
      <div className="max-w-md w-full text-center">
        <h1 className="text-xl font-bold text-zinc-900 mb-2">
          Admin Panel Error
        </h1>
        <p className="text-sm text-zinc-600 mb-6">
          Failed to load admin data. This has been logged.
        </p>

        <div className="flex gap-2 justify-center">
          <button
            onClick={reset}
            className="px-3 py-2 bg-zinc-900 text-white rounded text-sm hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 transition-colors"
          >
            Retry
          </button>
          <Link
            href="/dashboard"
            className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded text-sm hover:bg-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
