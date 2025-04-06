'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[70vh]">
      <div className="mb-8 text-6xl font-bold text-primary-500">404</div>
      
      <h1 className="text-3xl font-bold mb-4 text-center">Page Not Found</h1>
      
      <p className="text-lg text-gray-600 mb-8 text-center max-w-lg">
        Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist.
      </p>
      
      <div className="flex gap-4">
        <Link href="/" className="btn-primary">
          Go Home
        </Link>
        
        <Link href="/meal-planning" className="btn-secondary">
          Plan Some Meals
        </Link>
      </div>
      
      <div className="mt-12 text-gray-500">
        <p>
          Looking for something specific? Try exploring our main sections from the header menu.
        </p>
      </div>
    </div>
  );
} 