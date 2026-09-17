'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AuthError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Auth error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 bg-white">
      <div className="max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">
          Authentication Error
        </h1>
        <p className="text-zinc-600 mb-6">
          An issue occurred during authentication. Please try again.
        </p>

        <button
          onClick={reset}
          className="w-full px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 transition-colors mb-3"
        >
          Retry
        </button>

        <Link
          href="/"
          className="block w-full px-4 py-2 bg-zinc-200 text-zinc-900 rounded-md text-center hover:bg-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
