import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from './env';
import type { SupabaseClient } from '@supabase/supabase-js';

// Extended Supabase client type for better type safety
export type ExtendedSupabaseClient = SupabaseClient;

/**
 * Creates a Supabase client for server-side components with proper cookie handling
 * This should be used in server components and API routes
 */
export async function createServerClient(): Promise<ExtendedSupabaseClient> {
  try {
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );
    return supabase;
  } catch (error) {
    console.error('Error creating server Supabase client:', error);
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
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Error getting current user:', error);
      return null;
    }

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: 'authenticated',
    };
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return null;
  }
}

/**
 * Creates a new user in the user_preferences table
 * This is called after a user signs up to create their default preferences
 */
export async function createUserPreferences(userId: string) {
  try {
    const supabase = await createServerClient();
    
    // Check if preferences already exist
    const { data: existingPrefs } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('userid', userId)
      .maybeSingle();
    
    if (existingPrefs) {
      console.log('User preferences already exist');
      return { success: true, message: 'Preferences already exist' };
    }

    // Create default preferences
    const { error } = await supabase
      .from('user_preferences')
      .insert([
        {
          userid: userId,
          "isVegetarian": false,
          "isVegan": false,
          "isGlutenFree": false,
          "isDairyFree": false,
          "isNutFree": false,
          "maxCookingTime": 30,
          "cookingSkillLevel": 'intermediate',
          "peopleCount": 1,
          "cuisinePreferences": [],
          "healthGoals": [],
          allergies: [],
          "spicyPreference": 5,
          "sweetPreference": 5,
          "savoryPreference": 5,
          "createdAt": new Date().toISOString(),
          "updatedAt": new Date().toISOString()
        }
      ]);
    
    if (error) {
      console.error('Error creating user preferences:', error);
      return { success: false, error: error.message };
    }

    return { success: true, message: 'Preferences created successfully' };
  } catch (error) {
    console.error('Error in createUserPreferences:', error);
    return { success: false, error: 'Failed to create preferences' };
  }
}