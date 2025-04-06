import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Initialize response
  const res = NextResponse.next();
  
  // Check if the path requires authentication
  const publicPaths = ['/login', '/signup'];
  const isPublicPath = publicPaths.some(path => 
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/')
  );
  
  // Check if this is an API route
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  
  // For client-side authentication, we can't check localStorage here,
  // but we can set a cookie on login that we can check
  
  // Get auth cookie
  const hasCookie = request.cookies.has('ecochef_auth');
  
  // Skip authentication for API routes and public paths
  if (isApiRoute || isPublicPath) {
    return res;
  }
  
  // If user is not authenticated, redirect to login
  if (!hasCookie) {
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  return res;
}

// Define which routes this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 