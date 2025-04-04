import { NextResponse } from 'next/server';
import { prisma } from '../../lib/db';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const body = await request.json();
    
    // Map quiz answers to database model
    const preferences = {
      isVegetarian: body.dietary?.includes('vegetarian') || false,
      isVegan: body.dietary?.includes('vegan') || false,
      isGlutenFree: body.dietary?.includes('gluten-free') || false,
      isDairyFree: body.dietary?.includes('dairy-free') || false,
      maxCookingTime: parseInt(body['cooking-time'] || '60', 10),
      // Map other preferences as needed
    };
    
    // Upsert the preferences (create or update)
    const result = await prisma.userPreferences.upsert({
      where: { userId },
      update: preferences,
      create: {
        userId,
        ...preferences
      }
    });
    
    return NextResponse.json({ success: true, preferences: result });
  } catch (error) {
    console.error('Error saving preferences:', error);
    return NextResponse.json(
      { error: 'Failed to save preferences' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    // For demo purposes, allow access without auth
    let userId = 'demo';
    
    // If authenticated, use actual user ID
    if (session) {
      userId = session.user.id;
    }
    
    const preferences = await prisma.userPreferences.findUnique({
      where: { userId }
    });
    
    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
} 