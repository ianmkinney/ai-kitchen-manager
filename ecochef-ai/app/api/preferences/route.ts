import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// In a real app, this would connect to a database
// For now, we'll use cookies for simplicity

export async function GET() {
  try {
    const cookieStore = cookies();
    const preferencesStr = cookieStore.get('userPreferences')?.value;
    
    let preferences = null;
    if (preferencesStr) {
      try {
        preferences = JSON.parse(preferencesStr);
      } catch (e) {
        console.error('Error parsing preferences cookie:', e);
      }
    }
    
    return NextResponse.json({ preferences }, { status: 200 });
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
    const { preferences } = await request.json();
    
    if (!preferences) {
      return NextResponse.json(
        { error: 'Preferences are required' },
        { status: 400 }
      );
    }
    
    // In a real app, save to database
    // For now, save to cookies
    const cookieStore = cookies();
    cookieStore.set('userPreferences', JSON.stringify(preferences), {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error saving preferences:', error);
    return NextResponse.json(
      { error: 'Failed to save preferences' },
      { status: 500 }
    );
  }
} 