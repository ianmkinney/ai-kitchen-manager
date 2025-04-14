import { createClient } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

/**
 * Creates a Supabase client for server components and API routes
 * with correct authentication handling.
 */
export async function createServerClient() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    );
    
    return supabase;
  } catch (error) {
    console.error('Error creating Supabase server client:', error);
    throw error;
  }
}

/**
 * Gets the current authenticated user from Supabase auth
 * Returns null if no user is authenticated
 */
export async function getCurrentUser(request?: Request) {
  try {
    const supabase = await createServerClient();

    // Check for session data in headers if request is provided
    if (request) {
      const userId = request.headers.get('x-user-id');
      const userEmail = request.headers.get('x-user-email');

      if (userId && userEmail) {
        return {
          id: userId,
          email: userEmail,
          role: 'authenticated', // Default role for authenticated users
        };
      }
    }

    // Fallback to Supabase auth session
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.app_metadata?.role || 'user',
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

const supabase = createClientComponentClient();

export async function ensureUserExists() {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    console.error('Error fetching authenticated user:', error);
    return;
  }

  const { id, email } = user;

  // Check if the user exists in the 'auth.users' table
  const { data: existingUser, error: fetchError } = await supabase
    .from('auth.users')
    .select('id')
    .eq('id', id)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // Ignore "No rows found" error
    console.error('Error checking user existence:', fetchError);
    return;
  }

  if (!existingUser) {
    // Insert the user into the 'auth.users' table
    const { error: insertError } = await supabase
      .from('auth.users')
      .insert([{ id, email }]);

    if (insertError) {
      console.error('Error inserting user into auth.users table:', insertError);
    }
  }
}