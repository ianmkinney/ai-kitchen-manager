import { NextResponse } from 'next/server';
import { createServerClient } from '../../lib/supabase-server';
import { cookies } from 'next/headers';

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

    const { data: existingPrefs, error: queryError } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('userid', userId)
      .single();

    if (queryError && queryError.code !== 'PGRST116') {
      console.error('Error checking existing preferences:', queryError);
      throw queryError;
    }

    if (existingPrefs) {
      const { error: deleteError } = await supabase
        .from('user_preferences')
        .delete()
        .eq('userid', userId);

      if (deleteError) {
        console.error('Error deleting existing preferences:', deleteError);
        throw deleteError;
      }
    }

    // Filter out any properties that don't match the database schema
    // Only include known valid columns
    const validData: {
      userid: string;
      isVegetarian: boolean | null;
      isVegan: boolean | null;
      isGlutenFree: boolean | null;
      isDairyFree: boolean | null;
      isNutFree: boolean | null;
      spicyPreference: number | null;
      sweetPreference: number | null;
      savoryPreference: number | null;
      maxCookingTime: number | null;
      cookingSkillLevel: string | null;
      peopleCount: number | null;
      cuisine: string;
      cuisinePreferences: string[] | null;
      flavorPreferences: string[] | null;
      healthGoals: string[] | null;
      allergies: string[] | null;
      sustainabilityPreference: string | null;
      nutritionFocus: string[] | null;
      calorieTarget?: number | null;
      proteinTarget?: number | null;
      carbTarget?: number | null;
      fatTarget?: number | null;
      rawQuizAnswers?: Record<string, unknown>;
      updatedAt: string;
      createdAt?: string;
    } = {
      userid: userId,
      isVegetarian: preferencesData.isVegetarian || false,
      isVegan: preferencesData.isVegan || false,
      isGlutenFree: preferencesData.isGlutenFree || false,
      isDairyFree: preferencesData.isDairyFree || false,
      isNutFree: preferencesData.isNutFree || false,
      spicyPreference: preferencesData.spicyPreference || 5,
      sweetPreference: preferencesData.sweetPreference || 5,
      savoryPreference: preferencesData.savoryPreference || 5,
      maxCookingTime: preferencesData.maxCookingTime || 30,
      cookingSkillLevel: preferencesData.cookingSkillLevel || 'intermediate',
      peopleCount: preferencesData.peopleCount || 1,
      cuisine: preferencesData.cuisine || 'Any',
      cuisinePreferences: preferencesData.cuisinePreferences || [],
      flavorPreferences: preferencesData.flavorPreferences || [],
      healthGoals: preferencesData.healthGoals || [],
      allergies: preferencesData.allergies || [],
      sustainabilityPreference: preferencesData.sustainabilityPreference || 'medium',
      nutritionFocus: preferencesData.nutritionFocus || [],
      calorieTarget: preferencesData.calorieTarget,
      proteinTarget: preferencesData.proteinTarget,
      carbTarget: preferencesData.carbTarget,
      fatTarget: preferencesData.fatTarget,
      rawQuizAnswers: preferencesData.rawQuizAnswers || {},
      updatedAt: new Date().toISOString()
    };

    if (!existingPrefs) {
      validData.createdAt = new Date().toISOString();
    }

    console.log('Saving filtered preferences data:', JSON.stringify(validData, null, 2));

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(validData)
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