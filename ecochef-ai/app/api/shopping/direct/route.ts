import { NextResponse } from 'next/server';
import { createServerClient, getCurrentUser } from '../../../lib/supabase-server';

// POST - Add a new shopping list item directly with SQL
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category = 'Other' } = body;
    
    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    
    // Get the current authenticated user
    const user = await getCurrentUser();
    
    // If no user is authenticated, return 401 Unauthorized
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to access this resource' },
        { status: 401 }
      );
    }
    
    // Create server client with our helper
    const supabase = await createServerClient();
    
    // Insert the new shopping list item using SQL
    const { data, error } = await supabase
      .from('ShoppingListItem')
      .insert([{
        name,
        category: category || 'Other',
        quantity: 1,
        unit: 'item',
        isChecked: false,
        userId: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('POST /api/shopping/direct: Error adding shopping list item:', error);
      return NextResponse.json(
        { error: 'Failed to add shopping list item', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ shoppingItem: data });
  } catch (error) {
    console.error('Error adding shopping list item:', error);
    return NextResponse.json(
      { error: 'Failed to add shopping list item' },
      { status: 500 }
    );
  }
}

// GET - Retrieve all shopping list items for the current user
export async function GET() {
  try {
    // Get the current authenticated user
    const user = await getCurrentUser();
    
    // If no user is authenticated, return 401 Unauthorized
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to access this resource' },
        { status: 401 }
      );
    }
    
    // Create server client with our helper
    const supabase = await createServerClient();
    
    // Get shopping list items
    const { data: shoppingItems, error } = await supabase
      .from('ShoppingListItem')
      .select('*')
      .eq('userId', user.id)
      .order('isChecked', { ascending: true })
      .order('category', { ascending: true });

    if (error) {
      console.error('GET /api/shopping/direct: Error fetching shopping list items:', error);
      return NextResponse.json(
        { error: 'Failed to fetch shopping list items', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ shoppingItems });
  } catch (error) {
    console.error('Error fetching shopping list items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shopping list items' },
      { status: 500 }
    );
  }
} 