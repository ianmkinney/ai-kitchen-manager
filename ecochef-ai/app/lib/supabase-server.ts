import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Define interface for test user data
interface TestUser {
  id: string;
  email: string;
  role: string;
}

// Define interface for extended Supabase client
interface ExtendedSupabaseClient extends SupabaseClient {
  testMode?: boolean;
  testUser?: TestUser;
}

/**
 * Creates a Supabase client for server components and API routes
 * with correct authentication handling.
 */
export async function createServerClient(): Promise<ExtendedSupabaseClient> {
  try {
    // Create the Supabase client with consistent configuration
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
        global: {
          headers: {
            'X-Client-Info': 'ecochef-ai-server',
          },
        },
        db: {
          schema: 'public',
        },
      }
    ) as ExtendedSupabaseClient;

    // Check for test user cookie
    try {
      const cookieStore = await cookies();
      // Check if the test_user cookie exists
      if (cookieStore.has('test_user')) {
        console.log('Using test user authentication');
        
        // Instead of trying to manipulate the session directly,
        // we'll use the testMode property to flag that we're using a test user
        // This avoids type errors with the Supabase API
        supabase.testMode = true;
        supabase.testUser = {
          id: '00000000-0000-0000-0000-000000000000',
          email: 'test@ecochef.demo',
          role: 'authenticated',
        };
        
        return supabase;
      }
    } catch (cookieError) {
      console.error('Error checking test user cookie:', cookieError);
    }
    
    // If not a test user, try to use service role key for admin operations
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const adminClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
            db: {
              schema: 'public',
            },
          }
        ) as ExtendedSupabaseClient;
        return adminClient;
      } catch (serviceRoleError) {
        console.error('Error using service role key:', serviceRoleError);
      }
    }
    
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
    // Check for test user cookie
    try {
      const cookieStore = await cookies();
      // Check if the test_user cookie exists
      if (cookieStore.has('test_user')) {
        console.log('Using test user session');
        return {
          id: '00000000-0000-0000-0000-000000000000',
          email: 'test@ecochef.demo',
          role: 'authenticated',
        };
      }
    } catch (cookieError) {
      console.error('Error checking test user cookie:', cookieError);
    }

    // Check for session data in headers if request is provided
    if (request) {
      const userId = request.headers.get('x-user-id');
      const userEmail = request.headers.get('x-user-email');

      if (userId && userEmail) {
        return {
          id: userId,
          email: userEmail,
          role: 'authenticated', 
        };
      }
    }

    // Fallback to Supabase auth session
    const supabase = await createServerClient();
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

/**
 * Authenticate a user using the custom User table in the public schema
 */
export async function authenticateCustomUser(email: string, password: string) {
  try {
    const supabase = await createServerClient();

    // Check the User table for the provided email and password
    const { data, error } = await supabase
      .from('User')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !data) {
      console.error('Error during custom user authentication:', error);
      return { user: null, error: error || new Error('User not found') };
    }

    // For a real application, you would hash passwords, but for simplicity we're using direct comparison
    // TODO: Implement password hashing for production use
    if (data.password !== password) {
      return { user: null, error: new Error('Invalid credentials') };
    }

    return { user: data, error: null };
  } catch (error) {
    console.error('Error authenticating custom user:', error);
    return { user: null, error };
  }
}

/**
 * Create a new user in the custom User table
 */
export async function createCustomUser(email: string, password: string, name: string) {
  try {
    const supabase = await createServerClient();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('User')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return { user: null, error: new Error('User with this email already exists') };
    }

    // Create a new user
    // TODO: Hash password for production use
    const { data, error } = await supabase
      .from('User')
      .insert([{ 
        email: email.toLowerCase(), 
        password: password, // In production, this would be hashed
        name: name 
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating custom user:', error);
      return { user: null, error };
    }

    return { user: data, error: null };
  } catch (error) {
    console.error('Error creating custom user:', error);
    return { user: null, error };
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