import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TEST_USER_ID, getUserPreferences, saveUserPreferences, ensureTestUser } from '../../lib/user-preferences';

// In a real app, this would connect to a database
// For now, we'll use cookies for simplicity

export async function GET() {
  try {
    // First, ensure the test user exists with preferences
    await ensureTestUser();
    
    // Then get the preferences
    const preferences = await getUserPreferences();
    
    if (!preferences) {
      console.error('Preferences not found for test user');
      return NextResponse.json(
        { error: 'Failed to get preferences', details: 'Preferences not found for test user' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ preferences }, { status: 200 });
  } catch (error) {
    console.error('Error getting preferences:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to get preferences', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { preferences } = await request.json();
    
    if (!preferences) {
      return NextResponse.json(
        { error: 'Preferences are required' },
        { status: 400 }
      );
    }
    
    // Ensure the preferences object uses snake_case for Supabase
    const formattedPreferences: Record<string, any> = {};
    
    // Map camelCase to snake_case if present
    const camelToSnake: Record<string, string> = {
      userId: 'user_id',
      isVegetarian: 'is_vegetarian',
      isVegan: 'is_vegan',
      isGlutenFree: 'is_gluten_free',
      isDairyFree: 'is_dairy_free',
      isNutFree: 'is_nut_free',
      maxCookingTime: 'max_cooking_time',
      cookingSkillLevel: 'cooking_skill_level',
      spicyPreference: 'spicy_preference',
      sweetPreference: 'sweet_preference',
      savoryPreference: 'savory_preference',
      peopleCount: 'people_count',
      preferredCuisines: 'preferred_cuisines',
      dietGoals: 'diet_goals',
      dislikedIngredients: 'disliked_ingredients'
    };
    
    // Copy all properties, converting camelCase to snake_case if needed
    Object.keys(preferences).forEach(key => {
      const snakeKey = camelToSnake[key] || key;
      formattedPreferences[snakeKey] = preferences[key];
    });
    
    // First ensure test user exists
    await ensureTestUser();
    
    const success = await saveUserPreferences(formattedPreferences);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to save preferences' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error saving preferences:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to save preferences', details: errorMessage },
      { status: 500 }
    );
  }
} 