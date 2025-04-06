import { createClient } from '@supabase/supabase-js';

// Test user ID
export const TEST_USER_ID = '00000000-0000-0000-0000-000000000000';

// Function to create a Supabase client
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
};

// Make sure test user exists in the database
export async function ensureTestUser() {
  try {
    const supabase = getSupabaseClient();
    
    // Check if test user already exists
    const { data: existingUser } = await supabase
      .from('User')
      .select('id')
      .eq('id', TEST_USER_ID)
      .single();
    
    if (!existingUser) {
      // Create test user record
      await supabase
        .from('User')
        .insert([
          {
            id: TEST_USER_ID,
            email: 'test@ecochef.demo',
            name: 'Test User',
          }
        ]);
      
      console.log('Test user created successfully');
    }
    
    // Check if user preferences exist
    const { data: existingPrefs } = await supabase
      .from('UserPreferences')
      .select('id')
      .eq('user_id', TEST_USER_ID)
      .single();
      
    if (!existingPrefs) {
      // Create default preferences
      await supabase
        .from('UserPreferences')
        .insert([
          {
            user_id: TEST_USER_ID,
            is_vegetarian: false,
            is_vegan: false,
            is_gluten_free: false,
            is_dairy_free: false,
            is_nut_free: false,
            max_cooking_time: 30,
            cooking_skill_level: 'intermediate',
            spicy_preference: 5,
            sweet_preference: 5,
            savory_preference: 5,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);
        
      console.log('Default preferences created for test user');
    }
  } catch (error) {
    console.error('Error ensuring test user exists:', error);
  }
}

// Get user preferences
export async function getUserPreferences() {
  try {
    const supabase = getSupabaseClient();
    
    // Fetch preferences
    const { data, error } = await supabase
      .from('UserPreferences')
      .select('*')
      .eq('user_id', TEST_USER_ID)
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

// Save user preferences
export async function saveUserPreferences(preferences: any) {
  try {
    const supabase = getSupabaseClient();
    
    // First ensure the test user exists
    await ensureTestUser();
    
    // Check if preferences already exist
    const { data: existingPrefs } = await supabase
      .from('UserPreferences')
      .select('id')
      .eq('user_id', TEST_USER_ID)
      .single();
    
    // Ensure required fields are in snake_case format
    const requiredFields = [
      'is_vegetarian',
      'is_vegan', 
      'is_gluten_free', 
      'is_dairy_free', 
      'is_nut_free',
      'max_cooking_time',
      'cooking_skill_level',
      'spicy_preference',
      'sweet_preference',
      'savory_preference',
      'cuisine',
      'people_count',
      'preferred_cuisines',
      'diet_goals',
      'allergies',
      'disliked_ingredients'
    ];
    
    // Validate that required fields are present
    for (const field of requiredFields) {
      if (preferences[field] === undefined) {
        console.warn(`Field ${field} is missing in preferences, will use default value`);
      }
    }
    
    // Add user_id to preferences
    const prefsWithUserId = {
      ...preferences,
      user_id: TEST_USER_ID,
      updated_at: new Date().toISOString()
    };
    
    if (existingPrefs) {
      // Update existing preferences
      const { error } = await supabase
        .from('UserPreferences')
        .update(prefsWithUserId)
        .eq('user_id', TEST_USER_ID);
      
      if (error) {
        console.error('Error updating preferences:', error);
        throw error;
      }
    } else {
      // Insert new preferences
      const { error } = await supabase
        .from('UserPreferences')
        .insert([prefsWithUserId]);
      
      if (error) {
        console.error('Error inserting preferences:', error);
        throw error;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error saving user preferences:', error);
    return false;
  }
} 