'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to monitoring service (e.g., Sentry, DataDog)
    console.error('Global error caught:', error);
  }, [error]);

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 bg-white">
          <div className="max-w-md w-full text-center">
            <h1 className="text-4xl font-bold text-zinc-900 mb-4">Oops!</h1>
            <p className="text-lg text-zinc-600 mb-2">
              Something went wrong.
            </p>
            <p className="text-sm text-zinc-500 mb-8">
              We've been notified of the error. Please try again.
            </p>
            
            {error.message && (
              <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800 font-mono break-words">
                  {error.message}
                </p>
              </div>
            )}

            <button
              onClick={reset}
              className="w-full px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 transition-colors"
            >
              Try again
            </button>

            <p className="text-xs text-zinc-400 mt-6">
              Error ID: {error.digest || 'unknown'}
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
