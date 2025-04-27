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
    
    // Normalize the preferences to match the database schema
    const normalizedPrefs: Record<string, unknown> = {};
    
    // Convert camelCase or lowercase keys to PascalCase where needed
    for (const [key, value] of Object.entries(preferences)) {
      switch (key.toLowerCase()) {
        case 'isvegetarian':
          normalizedPrefs["isVegetarian"] = value;
          break;
        case 'isvegan':
          normalizedPrefs["isVegan"] = value;
          break;
        case 'isglutenfree':
          normalizedPrefs["isGlutenFree"] = value;
          break;
        case 'isdairyfree':
          normalizedPrefs["isDairyFree"] = value;
          break;
        case 'isnutfree':
          normalizedPrefs["isNutFree"] = value;
          break;
        case 'spicypreference':
          normalizedPrefs["spicyPreference"] = value;
          break;
        case 'sweetpreference':
          normalizedPrefs["sweetPreference"] = value;
          break;
        case 'savorypreference':
          normalizedPrefs["savoryPreference"] = value;
          break;
        case 'maxcookingtime':
          normalizedPrefs["maxCookingTime"] = value;
          break;
        case 'cookingskilllevel':
          normalizedPrefs["cookingSkillLevel"] = value;
          break;
        case 'peoplecount':
          normalizedPrefs["peopleCount"] = value;
          break;
        case 'healthgoals':
          normalizedPrefs["healthGoals"] = value;
          break;
        case 'dietgoals':
          normalizedPrefs["healthGoals"] = value;
          break;
        case 'preferredcuisines':
        case 'cuisinepreferences':
          normalizedPrefs["cuisinePreferences"] = value;
          break;
        case 'flavorpreferences':
          normalizedPrefs["flavorPreferences"] = value;
          break;
        case 'allergies':
          normalizedPrefs["allergies"] = value; // lowercase as in schema
          break;
        case 'sustainabilitypreference':
          normalizedPrefs["sustainabilityPreference"] = value;
          break;
        case 'nutritionfocus':
          normalizedPrefs["nutritionFocus"] = value;
          break;
        case 'createdat':
          normalizedPrefs["createdAt"] = value;
          break;
        case 'updatedat':
          normalizedPrefs["updatedAt"] = value;
          break;
        default:
          // If already properly cased or unknown field, keep as is
          normalizedPrefs[key] = value;
      }
    }
    
    // Add userid to preferences - use lowercase to match database schema
    const prefsWithUserId = {
      ...normalizedPrefs,
      userid: user.id, // Changed from userId to userid to match database schema
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