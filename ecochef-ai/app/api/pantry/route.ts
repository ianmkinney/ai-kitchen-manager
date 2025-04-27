import { NextResponse } from 'next/server';
import { createServerClient, getCurrentUser } from '../../lib/supabase-server';
import { getTestUserDataWithAdmin, insertTestUserDataWithAdmin } from '../../lib/admin-check';

// GET - Retrieve all pantry items for the current user
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    console.log('GET /api/pantry: User:', user);

    // If no user is authenticated, return 401 Unauthorized
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to access this resource' },
        { status: 401 }
      );
    }

    // Check if this is a test user and use admin client if needed
    if (user.id === '00000000-0000-0000-0000-000000000000' && user.email === 'test@ecochef.demo') {
      console.log('Using admin client for test user pantry items');
      const { data, error } = await getTestUserDataWithAdmin('pantry_items');
      
      if (error) {
        console.error('GET /api/pantry: Error fetching test user pantry items:', error);
        return NextResponse.json(
          { error: 'Failed to fetch pantry items', details: error },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ pantryItems: data });
    }

    // For regular users, create server client with our helper
    const supabase = await createServerClient();

    // Get pantry items directly from Supabase
    const { data: pantryItems, error } = await supabase
      .from('pantry_items')
      .select('*')
      .eq('userid', user.id)
      .order('"createdAt"', { ascending: false });

    if (error) {
      console.error('GET /api/pantry: Error fetching pantry items:', error);

      return NextResponse.json(
        { error: 'Failed to fetch pantry items', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ pantryItems });
  } catch (error) {
    console.error('Error fetching pantry items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pantry items' },
      { status: 500 }
    );
  }
}

// POST - Add a new pantry item
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate the required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Get the current authenticated user
    const user = await getCurrentUser(request);
    console.log('POST /api/pantry: User:', user);

    // If no user is authenticated, return 401 Unauthorized
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to access this resource' },
        { status: 401 }
      );
    }
    
    const newItem = {
      "itemName": body.name,
      category: body.category || 'Other',
      quantity: body.quantity || 1,
      userid: user.id,
      "createdAt": new Date().toISOString(),
      "updatedAt": new Date().toISOString()
    };

    // Check if this is a test user and use admin client if needed
    // Only use the admin client if BOTH the ID and email match the test user
    if (user.id === '00000000-0000-0000-0000-000000000000' && user.email === 'test@ecochef.demo') {
      console.log('Using admin client for adding test user pantry item');
      const { data, error } = await insertTestUserDataWithAdmin('pantry_items', newItem);
      
      if (error) {
        console.error('POST /api/pantry: Error adding test user pantry item:', error);
        return NextResponse.json(
          { error: 'Failed to add pantry item', details: error },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ pantryItem: data?.[0] || null });
    }

    // For regular users, create server client with our helper
    const supabase = await createServerClient();

    // Insert the new pantry item
    const { data, error } = await supabase
      .from('pantry_items')
      .insert([newItem])
      .select()
      .single();

    if (error) {
      console.error('POST /api/pantry: Error adding pantry item:', error);
      return NextResponse.json(
        { error: 'Failed to add pantry item', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ pantryItem: data });
  } catch (error) {
    console.error('Error adding pantry item:', error);
    return NextResponse.json(
      { error: 'Failed to add pantry item' },
      { status: 500 }
    );
  }
}

// PUT - Update an existing pantry item
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, category, quantity, unit, expiration } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    // Get the current authenticated user
    const user = await getCurrentUser(request);

    // If no user is authenticated, return 401 Unauthorized
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to access this resource' },
        { status: 401 }
      );
    }

    // Create server client with our helper
    const supabase = await createServerClient();

    // Find the item to check ownership using lowercase column name
    const { data: existingItem, error: findError } = await supabase
      .from('pantry_items')
      .select('*')
      .eq('id', id)
      .eq('userid', user.id)
      .single();

    if (findError || !existingItem) {
      return NextResponse.json(
        { error: 'Item not found or unauthorized' },
        { status: 404 }
      );
    }

    // Update the item
    const { data: updatedItem, error } = await supabase
      .from('pantry_items')
      .update({
        "itemName": name !== undefined ? name : existingItem.itemName,
        category: category !== undefined ? category : existingItem.category,
        quantity: quantity !== undefined ? quantity : existingItem.quantity,
        unit: unit !== undefined ? unit : existingItem.unit,
        "expirationDate": expiration ? new Date(expiration).toISOString() : existingItem.expirationDate,
        "updatedAt": new Date().toISOString()
      })
      .eq('id', id)
      .eq('userid', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating pantry item:', error);
      return NextResponse.json(
        { error: 'Failed to update pantry item', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ pantryItem: updatedItem });
  } catch (error) {
    console.error('Error updating pantry item:', error);
    return NextResponse.json(
      { error: 'Failed to update pantry item' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a pantry item
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    // Get the current authenticated user
    const user = await getCurrentUser(request);

    // If no user is authenticated, return 401 Unauthorized
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to access this resource' },
        { status: 401 }
      );
    }

    // Create server client with our helper
    const supabase = await createServerClient();

    // First verify this item belongs to the user
    const { data: item, error: fetchError } = await supabase
      .from('pantry_items')
      .select('id')
      .eq('id', id)
      .eq('userid', user.id)
      .single();

    if (fetchError || !item) {
      // Item not found or doesn't belong to user
      return NextResponse.json(
        { error: 'Item not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }

    // Delete the pantry item
    const { error } = await supabase
      .from('pantry_items')
      .delete()
      .eq('id', id)
      .eq('userid', user.id); // Added user ID check for extra security

    if (error) {
      console.error('Error deleting pantry item:', error);
      return NextResponse.json(
        { error: 'Failed to delete pantry item', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pantry item:', error);
    return NextResponse.json(
      { error: 'Failed to delete pantry item' },
      { status: 500 }
    );
  }
}