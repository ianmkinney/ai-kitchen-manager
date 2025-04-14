import { NextResponse } from 'next/server';
import { createServerClient } from '../../lib/supabase-server';

async function getUserIdFromAuthUsers(email: string) {
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

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'You must be logged in to access this resource' },
        { status: 401 }
      );
    }

    const userId = await getUserIdFromAuthUsers(authData.user.email);

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

    const supabase = await createServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'You must be logged in to access this resource' },
        { status: 401 }
      );
    }

    const userId = await getUserIdFromAuthUsers(authData.user.email);

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

    const dataToSave = {
      ...preferencesData,
      userid: userId,
      updatedAt: new Date().toISOString(),
    };

    if (!existingPrefs) {
      dataToSave.createdAt = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(dataToSave)
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