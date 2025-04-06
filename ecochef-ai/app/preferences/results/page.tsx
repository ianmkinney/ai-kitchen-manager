'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PreferencesResults() {
  const router = useRouter();

  // Automatically redirect to profile page after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/profile');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-500 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold mb-4">Preferences Saved!</h1>
        
        <p className="text-lg text-gray-600 mb-8">
          Your dietary preferences have been successfully saved. We&apos;ll use these to personalize your experience.
        </p>
        
        <p className="text-gray-500 mb-8">
          Redirecting to your profile page in a moment...
        </p>
        
        <div className="flex justify-center gap-4">
          <Link href="/profile" className="btn-primary">
            Go to Profile
          </Link>
          
          <Link href="/" className="btn-secondary">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}