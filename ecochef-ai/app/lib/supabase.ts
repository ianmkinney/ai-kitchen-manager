import { createClient } from '@supabase/supabase-js';
import { env } from './env';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Legacy client - prefer using createBrowserClient() instead for better cookie handling
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Creates a Supabase client for client-side components with proper cookie handling
 * This should be used instead of the direct supabase instance for auth operations
 */
export function createBrowserClient() {
  return createClientComponentClient();
} 