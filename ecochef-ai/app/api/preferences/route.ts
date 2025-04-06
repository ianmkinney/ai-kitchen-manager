import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';

// In a real app, this would connect to a database
// For now, we'll use cookies for simplicity

export async function GET() {
  try {
    // Get user preferences from Supabase
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .single();
      
    if (error) {
      console.error('Error fetching preferences:', error);
      
      // Table doesn't exist yet
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Database tables not initialized. Please run the setup script.' },
          { status: 500 }
        );
      }
      
      // Column doesn't exist (common with camelCase issues)
      if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Database schema mismatch. Please re-initialize with the correct column names.' },
          { status: 500 }
        );
      }
      
      // Not found is acceptable - return null
      if (error.code === 'PGRST116') {
        return NextResponse.json({ preferences: null }, { status: 200 });
      }
      
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
    
    // First check if the user already has preferences
    const { data: existingPrefs, error: queryError } = await supabase
      .from('user_preferences')
      .select('id')
      .single();
      
    // Handle query errors
    if (queryError && queryError.code !== 'PGRST116') {
      console.error('Error checking existing preferences:', queryError);
      
      // Table doesn't exist yet
      if (queryError.code === '42P01') {
        return NextResponse.json(
          { error: 'Database tables not initialized. Please run the setup script.' },
          { status: 500 }
        );
      }
      
      // Column naming issues
      if (queryError.message && queryError.message.includes('column') && queryError.message.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Database schema mismatch. Please re-initialize with the correct column names.' },
          { status: 500 }
        );
      }
    }
      
    // If user has existing preferences, update them
    if (existingPrefs?.id) {
      const { error } = await supabase
        .from('user_preferences')
        .update({
          // Instead of spreading {...preferences} which causes issues,
          // explicitly list all fields we want to update
          isVegetarian: preferencesData.isVegetarian || false,
          isVegan: preferencesData.isVegan || false,
          isGlutenFree: preferencesData.isGlutenFree || false,
          isDairyFree: preferencesData.isDairyFree || false,
          isNutFree: preferencesData.isNutFree || false,
          maxCookingTime: preferencesData.maxCookingTime || 60,
          cookingSkillLevel: preferencesData.cookingSkillLevel || 'intermediate',
          peopleCount: preferencesData.peopleCount || 1,
          cuisinePreferences: preferencesData.cuisinePreferences || [],
          flavorPreferences: preferencesData.flavorPreferences || [],
          healthGoals: preferencesData.healthGoals || [],
          allergies: preferencesData.allergies || [],
          sustainabilityPreference: preferencesData.sustainabilityPreference || 'medium',
          nutritionFocus: preferencesData.nutritionFocus || [],
          rawQuizAnswers: preferencesData.rawQuizAnswers || {},
          updatedAt: new Date().toISOString()
        })
        .eq('id', existingPrefs.id);
        
      if (error) {
        console.error('Error updating preferences:', error);
        
        // Column naming issues
        if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
          return NextResponse.json(
            { error: 'Database schema mismatch. Column names may be incorrect. Please reinitialize the database.' },
            { status: 500 }
          );
        }
        
        throw error;
      }
    } 
    // Otherwise, insert new preferences
    else {
      const { error } = await supabase
        .from('user_preferences')
        .insert([{
          // Instead of spreading {...preferences} which causes issues,
          // explicitly list all fields we want to insert
          isVegetarian: preferencesData.isVegetarian || false,
          isVegan: preferencesData.isVegan || false,
          isGlutenFree: preferencesData.isGlutenFree || false,
          isDairyFree: preferencesData.isDairyFree || false,
          isNutFree: preferencesData.isNutFree || false,
          maxCookingTime: preferencesData.maxCookingTime || 60,
          cookingSkillLevel: preferencesData.cookingSkillLevel || 'intermediate',
          peopleCount: preferencesData.peopleCount || 1,
          cuisinePreferences: preferencesData.cuisinePreferences || [],
          flavorPreferences: preferencesData.flavorPreferences || [],
          healthGoals: preferencesData.healthGoals || [],
          allergies: preferencesData.allergies || [],
          sustainabilityPreference: preferencesData.sustainabilityPreference || 'medium',
          nutritionFocus: preferencesData.nutritionFocus || [],
          rawQuizAnswers: preferencesData.rawQuizAnswers || {},
          // In a real app with authentication, you'd use the authenticated user's ID
          userId: '00000000-0000-0000-0000-000000000000',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]);
        
      if (error) {
        console.error('Error inserting preferences:', error);
        
        // Column naming issues
        if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
          return NextResponse.json(
            { error: 'Database schema mismatch. Column names may be incorrect. Please reinitialize the database.' },
            { status: 500 }
          );
        }
        
        throw error;
      }
    }
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error saving preferences:', error);
    return NextResponse.json(
      { error: 'Failed to save preferences' },
      { status: 500 }
    );
  }
} 