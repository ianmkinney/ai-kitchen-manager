import { NextResponse } from 'next/server';
import { createServerClient, getCurrentUser } from '../../../lib/supabase-server';

// Define the shopping item interface
interface ShoppingItem {
  name: string;
  category?: string;
}

// Helper function to get user ID from auth.users table
async function getAuthUserId(email: string) {
  try {
    // Special case for test user
    if (email === 'test@ecochef.demo') {
      return '00000000-0000-0000-0000-000000000000';
    }

    console.log(`Looking for user with email: ${email}`);
    const supabase = await createServerClient();
    
    // First try the current authenticated session user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (!sessionError && session && session.user && session.user.email === email) {
      console.log(`Found matching auth session user with ID: ${session.user.id}`);
      return session.user.id;
    }
    
    // Try to find in User table
    const { data: userData, error: userError } = await supabase
      .from('User')
      .select('id')
      .eq('email', email)
      .single();
      
    if (!userError && userData) {
      console.log(`Found user in User table with ID: ${userData.id}`);
      return userData.id;
    }
    
    console.error('Failed to find user in auth system or User table:', userError);
    
    // As a last resort, create a temporary User entry
    // Generate a UUID in the format similar to auth.users
    const { data: newUserData, error: newUserError } = await supabase
      .from('User')
      .insert({
        email: email,
        name: email.split('@')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();
      
    if (newUserError || !newUserData) {
      console.error('Failed to create User entry:', newUserError);
      throw new Error('Could not find or create user ID');
    }
    
    console.log(`Created new User entry with ID: ${newUserData.id}`);
    return newUserData.id;
  } catch (error) {
    console.error('Error getting auth user ID:', error);
    throw error;
  }
}

// POST - Add multiple shopping list items
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items } = body;
    
    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Valid items array is required' },
        { status: 400 }
      );
    }
    
    // Get the current authenticated user
    const user = await getCurrentUser();
    
    // If no user is authenticated, return 401 Unauthorized
    if (!user || !user.email) {
      return NextResponse.json(
        { error: 'You must be logged in to access this resource' },
        { status: 401 }
      );
    }
    
    console.log('User authenticated with email:', user.email);
    
    // Get the auth.users ID that corresponds to this user's email
    let authUserId;
    try {
      authUserId = await getAuthUserId(user.email);
      console.log(`Found auth.users ID ${authUserId} for email ${user.email}`);
    } catch (error) {
      console.error('Error getting auth user ID:', error);
      return NextResponse.json(
        { error: 'Failed to find your user account in the auth system' },
        { status: 500 }
      );
    }
    
    // Create server client with our helper
    const supabase = await createServerClient();
    
    // Prepare the items for insertion with the auth.users ID
    const itemsToInsert = items.map((item: ShoppingItem) => ({
      name: item.name,
      category: item.category || 'Other',
      quantity: 1,
      unit: 'item',
      isChecked: false,
      userId: authUserId, // Use the ID from auth.users table
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    
    console.log(`Adding ${itemsToInsert.length} items to shopping list for auth user ${authUserId}`);
    
    // Insert all items at once
    const { data, error } = await supabase
      .from('ShoppingListItem')
      .insert(itemsToInsert)
      .select();

    if (error) {
      console.error('Error adding shopping list items:', error);
      return NextResponse.json(
        { error: `Failed to add shopping list items: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      addedCount: data?.length || itemsToInsert.length,
      message: 'Shopping list items added successfully'
    });
  } catch (error) {
    console.error('Error adding shopping list items:', error);
    return NextResponse.json(
      { error: 'Failed to add shopping list items' },
      { status: 500 }
    );
  }
} 