import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(request: NextRequest) {
  const publicPaths = ['/login', '/signup', '/'];
  const isPublicPath = publicPaths.some(path => 
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/')
  );

  // Define API routes that can bypass authentication
  const bypassAuthApiRoutes = ['/api/setup-database', '/api/initialize-test-user', '/api/setup-db', '/api/debug-auth'];
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
    // Check for custom ecochef cookies
    const cookies = request.cookies.getAll();
    
    // Regular user cookies - check these first and prioritize over test user
    const ecochefUserIdCookie = cookies.find(cookie => cookie.name === 'ecochef_user_id');
    const ecochefUserEmailCookie = cookies.find(cookie => cookie.name === 'ecochef_user_email');
    
    // Test user cookies - only use if no regular user found
    const ecochefTestUserCookie = cookies.find(cookie => cookie.name === 'ecochef_test_user');
    const ecochefTestUserIdCookie = cookies.find(cookie => cookie.name === 'ecochef_test_user_id');
    const ecochefTestUserEmailCookie = cookies.find(cookie => cookie.name === 'ecochef_test_user_email');
    
    // Check for custom user authentication (both test and regular users)
    const hasCustomUser = !!ecochefUserIdCookie?.value;
    
    // Strict check for test user: require BOTH matching ID and email
    const hasCustomTestUser = !hasCustomUser && 
                             ecochefTestUserCookie?.value === 'true' && 
                             ecochefTestUserIdCookie?.value === '00000000-0000-0000-0000-000000000000' && 
                             ecochefTestUserEmailCookie?.value === 'test@ecochef.demo';
    
    console.log('Custom auth check:');
    console.log('- Has regular user cookie:', hasCustomUser);
    console.log('- Has test user cookie:', hasCustomTestUser);
    console.log('- User ID from cookie:', ecochefUserIdCookie?.value || (hasCustomTestUser ? ecochefTestUserIdCookie?.value : 'none'));
    
    // Also check the original Supabase auth
    const { data: { session }, error } = await supabase.auth.getSession();
    
    // Special handling for test user with strict validation
    const isValidTestSession = session?.user?.id === '00000000-0000-0000-0000-000000000000' && 
                             session?.user?.email === 'test@ecochef.demo';

    // Check for test user with better validation
    const isTestUser = !hasCustomUser && (isValidTestSession || hasCustomTestUser);
                      
    // Check if user is authenticated through any method
    const isAuthenticated = !!session || isTestUser || hasCustomUser;

    console.log('Middleware: Authentication check');
    console.log('- Supabase session:', !!session);
    console.log('- Is test user:', isTestUser);
    console.log('- Has custom user cookie:', hasCustomUser);
    console.log('- Is authenticated:', isAuthenticated);

    if (error && !isTestUser && !hasCustomUser) {
      console.error('Error fetching session:', error);
      const redirectUrl = new URL('/login', request.url);
      return NextResponse.redirect(redirectUrl);
    }

    if (isApiRoute) {
      if (session || isTestUser || hasCustomUser) {
        // Attach user info to request headers for API routes
        let userId = session?.user?.id || '';
        let userEmail = session?.user?.email || '';
        
        // Use custom cookie values if available
        if (hasCustomTestUser) {
          // Strictly validated test user
          userId = ecochefTestUserIdCookie?.value || '';
          userEmail = ecochefTestUserEmailCookie?.value || '';
        } else if (hasCustomUser) {
          // Regular user next
          userId = ecochefUserIdCookie?.value || '';
          userEmail = ecochefUserEmailCookie?.value || '';
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

    if (!isAuthenticated) {
      console.warn('Middleware: No authentication found, redirecting to login.');
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