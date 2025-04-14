import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(request: NextRequest) {
  const publicPaths = ['/login', '/signup', '/'];
  const isPublicPath = publicPaths.some(path => 
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/')
  );

  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');

  if (isPublicPath) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Error fetching session:', error);
      const redirectUrl = new URL('/login', request.url);
      return NextResponse.redirect(redirectUrl);
    }

    console.log('Middleware session:', session);

    console.log('Middleware: Checking session for request:', request.url);
    console.log('Middleware: Session data:', session);

    if (isApiRoute) {
      if (session) {
        // Attach user info to request headers for API routes
        res.headers.set('x-user-id', session.user.id);
        if (session.user.email) {
          res.headers.set('x-user-email', session.user.email);
        }
      } else {
        console.warn('Middleware: No session found for API route, returning 401.');
        return new NextResponse('Unauthorized', { status: 401 });
      }
      return res;
    }

    if (!session) {
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