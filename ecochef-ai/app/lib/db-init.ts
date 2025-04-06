import { createClient } from '@supabase/supabase-js';

export async function initializeDatabase() {
  console.log('Starting direct database initialization...');
  
  try {
    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials for database initialization');
    }
    
    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Instead of creating tables (which would be done via SQL in Supabase dashboard)
    // We'll just try to ensure the test user exists and has preferences
    
    try {
      // Try to get test user
      const { data: existingUser, error: userError } = await supabase
        .from('User')
        .select('id')
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .single();
      
      // If there's an error other than "not found", log it
      if (userError && !userError.message.includes('No rows')) {
        console.error('Error checking for test user:', userError);
      }
      
      // If user doesn't exist, create it
      if (!existingUser) {
        console.log('Creating test user...');
        const { error: insertError } = await supabase
          .from('User')
          .insert([
            {
              id: '00000000-0000-0000-0000-000000000000',
              email: 'test@ecochef.demo',
              name: 'Test User',
            }
          ]);
        
        if (insertError) {
          console.error('Error creating test user:', insertError);
        }
      }
    } catch (error) {
      console.error('Error managing test user:', error);
    }
    
    try {
      // Try to get test user preferences
      const { data: existingPrefs, error: prefsError } = await supabase
        .from('UserPreferences')
        .select('id')
        .eq('user_id', '00000000-0000-0000-0000-000000000000')
        .single();
      
      // If there's an error other than "not found", log it
      if (prefsError && !prefsError.message.includes('No rows')) {
        console.error('Error checking for test user preferences:', prefsError);
      }
      
      // If preferences don't exist, create them
      if (!existingPrefs) {
        console.log('Creating default preferences for test user...');
        const { error: insertError } = await supabase
          .from('UserPreferences')
          .insert([
            {
              user_id: '00000000-0000-0000-0000-000000000000',
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
              cuisine: 'Any',
              people_count: 2,
              preferred_cuisines: ['Italian', 'Mexican', 'Asian'],
            }
          ]);
        
        if (insertError) {
          console.error('Error creating test user preferences:', insertError);
        }
      }
    } catch (error) {
      console.error('Error managing test user preferences:', error);
    }
    
    console.log('Database initialization completed');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
} 