import { NextResponse } from 'next/server';
import { createServerClient } from '../../lib/supabase-server';
import { cookies } from 'next/headers';

// Define interfaces for preferences data
interface UserPreferences {
  userid: string;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isDairyFree?: boolean;
  isNutFree?: boolean;
  spicyPreference?: number;
  sweetPreference?: number;
  savoryPreference?: number;
  maxCookingTime?: number;
  cookingSkillLevel?: string;
  peopleCount?: number;
  cuisine?: string;
  cuisinePreferences?: unknown;
  flavorPreferences?: unknown;
  healthGoals?: unknown;
  allergies?: unknown;
  sustainabilityPreference?: string;
  nutritionFocus?: unknown;
  calorieTarget?: number;
  proteinTarget?: number;
  carbTarget?: number;
  fatTarget?: number;
  dietaryNotes?: string;
  rawQuizAnswers?: unknown;
  createdAt?: string;
  updatedAt?: string;
}

async function getUserIdFromAuthUsers(email: string) {
  // Special case for test user
  if (email === 'test@ecochef.demo') {
    return '00000000-0000-0000-0000-000000000000';
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('auth.users')
    .select('id')
    .eq('email', email)
    .single();

  if (error || !data) {
    // Try to find the user in our custom User table
    const { data: userData, error: userError } = await supabase
      .from('User')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      throw new Error('Failed to fetch user ID from auth.users or User table');
    }

    return userData.id;
  }

  return data.id;
}

// Helper function to extract user information from cookies
async function getUserFromCookies(request?: Request) {
  let isTestUser = false;
  let isCustomUser = false;
  let userId = '';
  let userEmail = '';

  try {
    // Check cookies from Next.js cookies API (server-side)
    const cookieStore = await cookies();
    
    // First check for regular user, prioritize this over test user
    const customUserId = cookieStore.get('ecochef_user_id')?.value;
    const customUserEmail = cookieStore.get('ecochef_user_email')?.value;
    
    if (customUserId && customUserEmail) {
      isCustomUser = true;
      userId = customUserId;
      userEmail = customUserEmail;
      console.log('Detected custom user from cookies, prioritizing over test user');
      // If we have a regular user, we'll use that and ignore test user cookies
    } else {
      // Only check for test user if no regular user found
      isTestUser = cookieStore.has('test_user') || cookieStore.has('ecochef_test_user');
      if (isTestUser) {
        const testUserId = cookieStore.get('ecochef_test_user_id')?.value || '00000000-0000-0000-0000-000000000000';
        const testUserEmail = cookieStore.get('ecochef_test_user_email')?.value || 'test@ecochef.demo';
        userId = testUserId;
        userEmail = testUserEmail;
        console.log('Detected test user from cookies (no regular user found)');
      }
    }
  } catch (cookieError) {
    console.error('Error checking cookies:', cookieError);
  }
  
  // If request object is provided, also check request headers
  if (request && !isCustomUser) { // Only check headers if we don't already have a custom user
    const requestCookies = request.headers.get('cookie') || '';
    
    // First check for custom user in request cookies
    const userIdMatch = requestCookies.match(/ecochef_user_id=([^;]+)/);
    const userEmailMatch = requestCookies.match(/ecochef_user_email=([^;]+)/);
    
    if (userIdMatch && userEmailMatch) {
      isCustomUser = true;
      isTestUser = false; // Override test user status if we find a regular user
      userId = userIdMatch[1];
      userEmail = decodeURIComponent(userEmailMatch[1]);
      console.log('Detected custom user from request headers, prioritizing over test user');
    } else if (!isTestUser) {
      // Only check for test user if we don't have a regular user or test user yet
      if (requestCookies.includes('test_user=') || requestCookies.includes('ecochef_test_user=')) {
        isTestUser = true;
        // Extract test user ID from cookies if available
        const testUserIdMatch = requestCookies.match(/ecochef_test_user_id=([^;]+)/);
        userId = testUserIdMatch ? testUserIdMatch[1] : '00000000-0000-0000-0000-000000000000';
        userEmail = 'test@ecochef.demo';
        console.log('Detected test user from request headers (no regular user found)');
      }
    }
  }
  
  // Check for user ID in headers (set by middleware)
  if (!userId && !isCustomUser && !isTestUser && request) {
    userId = request.headers.get('x-user-id') || '';
    userEmail = request.headers.get('x-user-email') || '';
    
    if (userId && userEmail) {
      console.log('Using user ID from request headers:', userId);
      isCustomUser = true;
    }
  }
  
  return { 
    isAuthenticated: isTestUser || isCustomUser || (!!userId && !!userEmail),
    isTestUser,
    isCustomUser,
    userId,
    userEmail
  };
}

export async function GET() {
  try {
    const supabase = await createServerClient();
    
    // First try to get user from cookies
    const { isAuthenticated, userId, userEmail } = await getUserFromCookies();
    
    // If not authenticated through cookies, try Supabase Auth
    if (!isAuthenticated) {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authData.user) {
        return NextResponse.json(
          { error: 'You must be logged in to access this resource' },
          { status: 401 }
        );
      }
      
      // Use the user ID from Supabase Auth
      const authUserId = await getUserIdFromAuthUsers(authData.user.email!);
      console.log('Using Supabase Auth user ID:', authUserId);
      
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('userid', authUserId)
        .single();

      if (error) {
        console.error('GET /api/preferences: Error fetching preferences:', error);
        throw error;
      }

      return NextResponse.json({ preferences: data || null }, { status: 200 });
    }
    
    // If we have a valid user from cookies, use that
    console.log('Using user from cookies - ID:', userId, 'Email:', userEmail);
    
    // Get preferences for the authenticated user
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('userid', userId)
      .single();

    if (error) {
      console.error('GET /api/preferences: Error fetching preferences:', error);
      throw error;
    }

    return NextResponse.json({ preferences: data || null }, { status: 200 });
  } catch (error) {
    console.error('Error getting preferences:', error);
    return NextResponse.json(
      { error: 'Failed to get preferences' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const preferencesData = await request.json();

    if (!preferencesData) {
      return NextResponse.json(
        { error: 'Preferences data is required' },
        { status: 400 }
      );
    }

    // Log the incoming data to debug
    console.log('Received preferences data:', JSON.stringify(preferencesData, null, 2));

    const supabase = await createServerClient();
    
    // First try to get user from cookies and request headers
    const { isAuthenticated, userId } = await getUserFromCookies(request);
    
    let finalUserId = userId;
    
    // If not authenticated through cookies, try Supabase Auth
    if (!isAuthenticated) {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authData.user) {
        console.log('Auth error and not authenticated via cookies, returning 401');
        return NextResponse.json(
          { error: 'You must be logged in to access this resource' },
          { status: 401 }
        );
      }
      
      // Use the user ID from Supabase Auth
      finalUserId = await getUserIdFromAuthUsers(authData.user.email!);
      console.log('Using Supabase Auth user ID:', finalUserId);
    } else {
      console.log('Using authenticated user from cookies/headers - ID:', finalUserId);
    }
    
    // Validate we have a user ID
    if (!finalUserId) {
      throw new Error('No user ID found for preferences update');
    }

    // First, check if we have existing preferences
    const { data: existingPrefs, error: queryError } = await supabase
      .from('user_preferences')
      .select('*')  // Select all columns so we can merge with new data
      .eq('userid', finalUserId)
      .single();

    if (queryError && queryError.code !== 'PGRST116') {
      console.error('Error checking existing preferences:', queryError);
      throw queryError;
    }

    // Determine if this is a full update or a partial update
    const isPartialUpdate = Object.keys(preferencesData).length < 10; // If fewer fields, likely a partial update

    let finalData: UserPreferences;

    if (existingPrefs && isPartialUpdate) {
      // For partial updates, merge the new data with existing data
      console.log('Performing partial update for user', finalUserId);
      finalData = { ...existingPrefs, ...preferencesData, updatedAt: new Date().toISOString() };
    } else {
      // For a complete replacement or first-time preferences
      console.log('Performing complete update for user', finalUserId);
      
      // Normalize field names to match the database schema
      // The database uses PascalCase column names with quotes
      const normalizedData: Record<string, unknown> = {};
      
      // Copy the incoming data, ensuring proper casing for known fields
      for (const [key, value] of Object.entries(preferencesData)) {
        switch (key.toLowerCase()) {
          // Handle known fields with specific casing in database
          case 'isvegetarian':
            normalizedData["isVegetarian"] = value;
            break;
          case 'isvegan':
            normalizedData["isVegan"] = value;
            break;
          case 'isglutenfree':
            normalizedData["isGlutenFree"] = value;
            break;
          case 'isdairyfree':
            normalizedData["isDairyFree"] = value;
            break;
          case 'isnutfree':
            normalizedData["isNutFree"] = value;
            break;
          case 'maxcookingtime':
            normalizedData["maxCookingTime"] = value;
            break;
          case 'cookingskilllevel':
            normalizedData["cookingSkillLevel"] = value;
            break;
          case 'peoplecount':
            normalizedData["peopleCount"] = value;
            break;
          case 'spicypreference':
            normalizedData["spicyPreference"] = value;
            break;
          case 'sweetpreference':
            normalizedData["sweetPreference"] = value;
            break;
          case 'savorypreference':
            normalizedData["savoryPreference"] = value;
            break;
          case 'preferredcuisines':
          case 'cuisinepreferences':
            normalizedData["cuisinePreferences"] = value;
            break;
          case 'dietgoals':
          case 'healthgoals':
            normalizedData["healthGoals"] = value;
            break;
          case 'allergies':
            normalizedData["allergies"] = value; // Lowercase to match schema
            break;
          case 'createdat':
            normalizedData["createdAt"] = value;
            break;
          case 'updatedat':
            normalizedData["updatedAt"] = value;
            break;
          // Keep other fields as they are
          default:
            // If the key is already properly formatted according to schema, keep it
            normalizedData[key] = value;
        }
      }
      
      // Add required fields
      finalData = {
        ...normalizedData,
        userid: finalUserId, // Use lowercase to match database schema
        createdAt: existingPrefs?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    console.log('Saving preferences data:', JSON.stringify(finalData, null, 2));

    // Special handling for test user - delete existing preferences first
    if (finalUserId === '00000000-0000-0000-0000-000000000000') {
      console.log('Test user detected - removing existing preferences before saving');
      const { error: deleteError } = await supabase
        .from('user_preferences')
        .delete()
        .eq('userid', finalUserId);
      
      if (deleteError) {
        console.error('Error deleting test user preferences:', deleteError);
      }
      
      // Insert new preferences
      const { data: insertData, error: insertError } = await supabase
        .from('user_preferences')
        .insert(finalData)
        .select()
        .single();
        
      if (insertError) {
        console.error('Error inserting test user preferences:', insertError);
        throw insertError;
      }
      
      return NextResponse.json({ preferences: insertData }, { status: 200 });
    }

    // For regular users, use upsert with ID to prevent duplicate key issues
    const preferencesId = existingPrefs?.id;
    
    // Use upsert to insert or update the record without deleting first
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        ...(preferencesId ? { id: preferencesId } : {}), // Include ID if we have it
        ...finalData
      })
      .select()
      .single();

    if (error) {
      console.error('POST /api/preferences: Error saving preferences:', error);
      throw error;
    }

    return NextResponse.json({ preferences: data }, { status: 200 });
  } catch (error) {
    console.error('Error saving preferences:', error);
    return NextResponse.json(
      { error: 'Failed to save preferences' },
      { status: 500 }
    );
  }
}