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
    throw new Error('Failed to fetch user ID from auth.users');
  }

  return data.id;
}

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    // Check for test user from cookies
    let isTestUser = false;
    let testUserEmail = '';
    try {
      const cookieStore = await cookies();
      isTestUser = cookieStore.has('test_user') || cookieStore.has('ecochef_test_user');
      if (isTestUser) {
        testUserEmail = 'test@ecochef.demo';
        console.log('Detected test user from cookies in GET /preferences');
      }
    } catch (cookieError) {
      console.error('Error checking test user cookie:', cookieError);
    }

    // If no auth data but we have a test user, proceed with test user
    if ((authError || !authData.user) && !isTestUser) {
      return NextResponse.json(
        { error: 'You must be logged in to access this resource' },
        { status: 401 }
      );
    }

    // Get the user email - either from auth or test user
    const userEmail = isTestUser ? testUserEmail : authData.user?.email;
    
    if (!userEmail) {
      throw new Error('No user email found');
    }

    const userId = await getUserIdFromAuthUsers(userEmail);

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
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    // Check for test user from cookies
    let isTestUser = false;
    let testUserEmail = '';
    try {
      const cookieStore = await cookies();
      isTestUser = cookieStore.has('test_user') || cookieStore.has('ecochef_test_user');
      if (isTestUser) {
        testUserEmail = 'test@ecochef.demo';
        console.log('Detected test user from cookies');
      }
    } catch (cookieError) {
      console.error('Error checking test user cookie:', cookieError);
    }
    
    // Check request headers for test user indicators
    const requestCookies = request.headers.get('cookie') || '';
    if (requestCookies.includes('test_user=') || requestCookies.includes('ecochef_test_user=')) {
      isTestUser = true;
      testUserEmail = 'test@ecochef.demo';
      console.log('Detected test user from request headers');
    }

    // If no auth data but we have a test user, proceed with test user
    if ((authError || !authData.user) && !isTestUser) {
      console.log('Auth error and not test user, returning 401');
      return NextResponse.json(
        { error: 'You must be logged in to access this resource' },
        { status: 401 }
      );
    }

    // Get the user email - either from auth or test user
    const userEmail = isTestUser ? testUserEmail : authData.user?.email;
    
    if (!userEmail) {
      throw new Error('No user email found');
    }

    const userId = await getUserIdFromAuthUsers(userEmail);
    console.log('Using user ID for preferences:', userId);

    // First, check if we have existing preferences
    const { data: existingPrefs, error: queryError } = await supabase
      .from('user_preferences')
      .select('*')  // Select all columns so we can merge with new data
      .eq('userid', userId)
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
      console.log('Performing partial update for user', userId);
      finalData = { ...existingPrefs, ...preferencesData, updatedAt: new Date().toISOString() };
    } else {
      // For a complete update or new record, use the standard approach
      // Filter out any properties that don't match the database schema
      // Only include known valid columns
      finalData = {
        userid: userId,
        isVegetarian: preferencesData.isVegetarian !== undefined ? preferencesData.isVegetarian : (existingPrefs?.isVegetarian || false),
        isVegan: preferencesData.isVegan !== undefined ? preferencesData.isVegan : (existingPrefs?.isVegan || false),
        isGlutenFree: preferencesData.isGlutenFree !== undefined ? preferencesData.isGlutenFree : (existingPrefs?.isGlutenFree || false),
        isDairyFree: preferencesData.isDairyFree !== undefined ? preferencesData.isDairyFree : (existingPrefs?.isDairyFree || false),
        isNutFree: preferencesData.isNutFree !== undefined ? preferencesData.isNutFree : (existingPrefs?.isNutFree || false),
        spicyPreference: preferencesData.spicyPreference !== undefined ? preferencesData.spicyPreference : (existingPrefs?.spicyPreference || 5),
        sweetPreference: preferencesData.sweetPreference !== undefined ? preferencesData.sweetPreference : (existingPrefs?.sweetPreference || 5),
        savoryPreference: preferencesData.savoryPreference !== undefined ? preferencesData.savoryPreference : (existingPrefs?.savoryPreference || 5),
        maxCookingTime: preferencesData.maxCookingTime !== undefined ? preferencesData.maxCookingTime : (existingPrefs?.maxCookingTime || 30),
        cookingSkillLevel: preferencesData.cookingSkillLevel !== undefined ? preferencesData.cookingSkillLevel : (existingPrefs?.cookingSkillLevel || 'intermediate'),
        peopleCount: preferencesData.peopleCount !== undefined ? preferencesData.peopleCount : (existingPrefs?.peopleCount || 1),
        cuisine: preferencesData.cuisine !== undefined ? preferencesData.cuisine : (existingPrefs?.cuisine || 'Any'),
        cuisinePreferences: preferencesData.cuisinePreferences !== undefined ? preferencesData.cuisinePreferences : (existingPrefs?.cuisinePreferences || []),
        flavorPreferences: preferencesData.flavorPreferences !== undefined ? preferencesData.flavorPreferences : (existingPrefs?.flavorPreferences || []),
        healthGoals: preferencesData.healthGoals !== undefined ? preferencesData.healthGoals : (existingPrefs?.healthGoals || []),
        allergies: preferencesData.allergies !== undefined ? preferencesData.allergies : (existingPrefs?.allergies || []),
        sustainabilityPreference: preferencesData.sustainabilityPreference !== undefined ? preferencesData.sustainabilityPreference : (existingPrefs?.sustainabilityPreference || 'medium'),
        nutritionFocus: preferencesData.nutritionFocus !== undefined ? preferencesData.nutritionFocus : (existingPrefs?.nutritionFocus || []),
        calorieTarget: preferencesData.calorieTarget !== undefined ? preferencesData.calorieTarget : existingPrefs?.calorieTarget,
        proteinTarget: preferencesData.proteinTarget !== undefined ? preferencesData.proteinTarget : existingPrefs?.proteinTarget,
        carbTarget: preferencesData.carbTarget !== undefined ? preferencesData.carbTarget : existingPrefs?.carbTarget,
        fatTarget: preferencesData.fatTarget !== undefined ? preferencesData.fatTarget : existingPrefs?.fatTarget,
        dietaryNotes: preferencesData.dietaryNotes !== undefined ? preferencesData.dietaryNotes : (existingPrefs?.dietaryNotes || ''),
        rawQuizAnswers: preferencesData.rawQuizAnswers !== undefined ? preferencesData.rawQuizAnswers : (existingPrefs?.rawQuizAnswers || {}),
        updatedAt: new Date().toISOString()
      };

      if (!existingPrefs) {
        finalData.createdAt = new Date().toISOString();
      } else if (existingPrefs.createdAt) {
        finalData.createdAt = existingPrefs.createdAt;
      }
    }

    console.log('Saving preferences data:', JSON.stringify(finalData, null, 2));

    // Use upsert to insert or update the record without deleting first
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(finalData)
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