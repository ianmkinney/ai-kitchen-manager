'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[70vh]">
      <div className="mb-6 text-5xl font-bold text-red-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      
      <h1 className="text-3xl font-bold mb-4 text-center">Something Went Wrong</h1>
      
      <p className="text-lg text-gray-600 mb-8 text-center max-w-xl">
        We&apos;re sorry, but we encountered an unexpected error. Our team has been notified and we&apos;re working to fix the issue.
      </p>
      
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="btn-primary"
        >
          Try Again
        </button>
        
        <Link href="/" className="btn-secondary">
          Go Home
        </Link>
      </div>
      
      <div className="mt-10 text-gray-500 text-sm">
        <p>
          If this issue persists, please contact support or try again later.
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-100 rounded-lg max-w-2xl overflow-auto">
            <h2 className="font-semibold mb-2">Error details (visible in development mode only):</h2>
            <p className="font-mono text-xs whitespace-pre-wrap">{error.message}</p>
            {error.stack && (
              <pre className="mt-2 font-mono text-xs whitespace-pre-wrap overflow-x-auto">
                {error.stack.split("\n").slice(1).join("\n")}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 