import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Function to create a Supabase client (client-side only)
export const getSupabaseClient = () => {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
};

// Get user preferences - requires the user to be authenticated
export async function getUserPreferences() {
  try {
    const supabase = getSupabaseClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // User not authenticated
      return null;
    }
    
    // Fetch preferences for the authenticated user
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('userid', user.id) // Updated column name to match database schema
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return null;
  }
}

// Save user preferences - requires the user to be authenticated
export async function saveUserPreferences(preferences: Record<string, unknown>) {
  try {
    const supabase = getSupabaseClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // User not authenticated
      throw new Error('User must be authenticated to save preferences');
    }
    
    // Add userId to preferences
    const prefsWithUserId = {
      ...preferences,
      userId: user.id, // Ensure column name matches database schema
      updatedAt: new Date().toISOString()
    };
    
    // Upsert the preferences
    const { error } = await supabase
      .from('user_preferences')
      .upsert(prefsWithUserId);
    
    if (error) {
      console.error('Error saving preferences:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error saving user preferences:', error);
    return false;
  }
}