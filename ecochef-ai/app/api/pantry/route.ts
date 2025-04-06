import { NextResponse } from 'next/server';
import { prisma } from '../../lib/db';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET - Retrieve all pantry items for the current user
export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get pantry items directly from Supabase
    const { data: pantryItems, error } = await supabase
      .from('pantry_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching pantry items:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pantry items' },
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
    const { name } = body;
    
    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Insert directly to Supabase
    const { data: newItem, error } = await supabase
      .from('pantry_items')
      .insert({
        name,
        user_id: user.id
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error adding pantry item:', error);
      return NextResponse.json(
        { error: 'Failed to add pantry item' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ pantryItem: newItem });
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
    
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure the item belongs to the current user
    const existingItem = await prisma.pantryItem.findUnique({
      where: { id }
    });
    
    if (!existingItem || existingItem.userId !== user.id) {
      return NextResponse.json(
        { error: 'Item not found or unauthorized' },
        { status: 404 }
      );
    }
    
    const updatedItem = await prisma.pantryItem.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existingItem.name,
        category: category !== undefined ? category : existingItem.category,
        quantity: quantity !== undefined ? quantity : existingItem.quantity,
        unit: unit !== undefined ? unit : existingItem.unit,
        expiration: expiration ? new Date(expiration) : existingItem.expiration
      }
    });
    
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
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }
    
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Delete directly from Supabase
    const { error } = await supabase
      .from('pantry_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error deleting pantry item:', error);
      return NextResponse.json(
        { error: 'Failed to delete pantry item' },
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