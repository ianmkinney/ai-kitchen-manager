import { NextResponse } from 'next/server';
import { createServerClient } from '../../lib/supabase-server';

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

async function getUserIdFromAuth() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    console.error('Error getting authenticated user:', error);
    return null;
  }

  return user.id;
}

// Note: Cookie-based authentication removed in favor of pure Supabase Auth

export async function GET() {
  try {
    const supabase = await createServerClient();
    
    // Get authenticated user from Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'You must be logged in to access this resource' },
        { status: 401 }
      );
    }
    
    // Use the user ID from Supabase Auth directly
    const userId = authData.user.id;
    console.log('Using Supabase Auth user ID:', userId);
    
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
    
    // Get authenticated user from Supabase Auth
    const finalUserId = await getUserIdFromAuth();
    
    if (!finalUserId) {
      console.log('No authenticated user found, returning 401');
      return NextResponse.json(
        { error: 'You must be logged in to access this resource' },
        { status: 401 }
      );
    }
    
    console.log('Using authenticated user ID:', finalUserId);

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

    // Use upsert to insert or update the record
    const preferencesId = existingPrefs?.id;
    
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