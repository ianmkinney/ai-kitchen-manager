import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(request: NextRequest) {
  const publicPaths = ['/login', '/signup', '/'];
  const isPublicPath = publicPaths.some(path => 
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/')
  );

  // Define API routes that can bypass authentication
  const bypassAuthApiRoutes = ['/api/setup-database', '/api/initialize-test-user', '/api/setup-db'];
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  const shouldBypassAuth = bypassAuthApiRoutes.some(route => 
    request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route + '/')
  );

  // Allow bypass routes to proceed without auth check
  if (isPublicPath || shouldBypassAuth) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  try {
    // Check for custom ecochef cookies first
    const cookies = request.cookies.getAll();
    const ecochefUserCookie = cookies.find(cookie => cookie.name === 'ecochef_test_user');
    const ecochefUserIdCookie = cookies.find(cookie => cookie.name === 'ecochef_test_user_id');
    const ecochefUserEmailCookie = cookies.find(cookie => cookie.name === 'ecochef_test_user_email');
    
    // Check for custom test user authentication
    const hasCustomTestUser = ecochefUserCookie?.value === 'true';
    
    // Also check the original Supabase auth
    const { data: { session }, error } = await supabase.auth.getSession();
    
    // Special handling for test user - check for test token in cookies
    const hasTestCookie = cookies.some(cookie => 
      cookie.name === 'supabase-auth-token' && 
      cookie.value.includes('test-access-token')
    );

    // Check for test user in localStorage (through cookies) or our custom cookies
    const isTestUser = session?.user?.email === 'test@ecochef.demo' || 
                      hasTestCookie ||
                      session?.access_token === 'test-access-token' ||
                      hasCustomTestUser;

    console.log('Middleware session:', session);
    console.log('Middleware: Checking session for request:', request.url);
    console.log('Middleware: Session data:', session);
    console.log('Is test user:', isTestUser);
    console.log('Has custom test user cookie:', hasCustomTestUser);

    if (error && !isTestUser) {
      console.error('Error fetching session:', error);
      const redirectUrl = new URL('/login', request.url);
      return NextResponse.redirect(redirectUrl);
    }

    if (isApiRoute) {
      if (session || isTestUser) {
        // Attach user info to request headers for API routes
        let userId = session?.user?.id || '';
        let userEmail = session?.user?.email || '';
        
        // Use custom cookie values if available
        if (hasCustomTestUser) {
          userId = ecochefUserIdCookie?.value || '00000000-0000-0000-0000-000000000000';
          userEmail = ecochefUserEmailCookie?.value || 'test@ecochef.demo';
        } else if (!userId) {
          // Fallback for other test users
          userId = isTestUser ? '00000000-0000-0000-0000-000000000000' : '';
          userEmail = isTestUser ? 'test@ecochef.demo' : '';
        }
        
        res.headers.set('x-user-id', userId);
        if (userEmail) {
          res.headers.set('x-user-email', userEmail);
        }
      } else {
        console.warn('Middleware: No session found for API route, returning 401.');
        return new NextResponse('Unauthorized', { status: 401 });
      }
      return res;
    }

    if (!session && !isTestUser) {
      console.warn('Middleware: No session found, redirecting to login.');
      const redirectUrl = new URL('/login', request.url);
      return NextResponse.redirect(redirectUrl);
    }
  } catch (error) {
    console.error('Middleware error during session validation:', error);
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};