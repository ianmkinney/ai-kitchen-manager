import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../lib/admin-check';
import { getCurrentUser } from '../../lib/supabase-server';

interface UserDetails {
  id: string;
  email: string;
  name: string;
}

interface ErrorDetails {
  error: string;
}

interface User {
  id: string;
  email: string | undefined;
  role?: unknown;
  [key: string]: unknown;
}

interface AuthInfo {
  cookies: {
    userIdCookie: string | null;
    userEmailCookie: string | null;
    testUserCookie: string | null;
    allCookies: string[];
  };
  userDetails: UserDetails | ErrorDetails | null;
  currentUser: User | null;
  pantryAccess: {
    canRead: boolean;
    canWrite: boolean;
    reasons: string[];
  };
  headers: {
    userIdHeader: string | null;
    userEmailHeader: string | null;
  };
}

export async function GET(req: NextRequest) {
  try {
    // Get cookies from the request
    const cookieHeader = req.headers.get('cookie') || '';
    const cookies = cookieHeader.split(';').map(c => c.trim());
    
    // Parse relevant cookies
    const userIdCookie = cookies.find(c => c.startsWith('ecochef_user_id='));
    const userEmailCookie = cookies.find(c => c.startsWith('ecochef_user_email='));
    const testUserCookie = cookies.find(c => c.startsWith('ecochef_test_user='));
    
    let userId = null;
    if (userIdCookie) {
      userId = userIdCookie.split('=')[1];
    } else if (testUserCookie) {
      const testUserIdCookie = cookies.find(c => c.startsWith('ecochef_test_user_id='));
      if (testUserIdCookie) {
        userId = testUserIdCookie.split('=')[1];
      }
    }
    
    // Check headers (set by middleware)
    const userIdHeader = req.headers.get('x-user-id');
    const userEmailHeader = req.headers.get('x-user-email');
    
    // Gather auth information
    const authInfo: AuthInfo = {
      cookies: {
        userIdCookie: userIdCookie || null,
        userEmailCookie: userEmailCookie || null,
        testUserCookie: testUserCookie || null,
        allCookies: cookies,
      },
      userDetails: null,
      currentUser: null,
      pantryAccess: {
        canRead: false,
        canWrite: false,
        reasons: []
      },
      headers: {
        userIdHeader,
        userEmailHeader
      }
    };
    
    // Get current user via the same method used by API routes
    const currentUser = await getCurrentUser();
    authInfo.currentUser = currentUser;
    
    // Check pantry access
    if (currentUser) {
      authInfo.pantryAccess.canRead = true;
      authInfo.pantryAccess.canWrite = true;
      authInfo.pantryAccess.reasons.push('User is authenticated');
      
      if (currentUser.id === '00000000-0000-0000-0000-000000000000' && 
          currentUser.email === 'test@ecochef.demo') {
        authInfo.pantryAccess.reasons.push('User is a test user');
      }
    } else {
      authInfo.pantryAccess.reasons.push('No authenticated user found');
      
      // Check if there are authentication cookies but getCurrentUser fails
      if (userId || userIdHeader) {
        authInfo.pantryAccess.reasons.push('Has auth cookies/headers but getCurrentUser failed');
      }
    }
    
    // If we have a user ID, get user details
    if (userId) {
      const adminClient = createAdminClient();
      const { data, error } = await adminClient
        .from('User')
        .select('id, email, name')
        .eq('id', userId)
        .single();
        
      if (data && !error) {
        authInfo.userDetails = {
          id: data.id,
          email: data.email,
          name: data.name
        };
      } else {
        authInfo.userDetails = { error: 'User not found in database' };
        authInfo.pantryAccess.reasons.push('User ID in cookie not found in database');
      }
    }
    
    return NextResponse.json(authInfo);
  } catch (error) {
    console.error('Error in debug-auth route:', error);
    return NextResponse.json({ error: 'Failed to debug auth state' }, { status: 500 });
  }
} 