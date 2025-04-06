import { NextResponse } from 'next/server';
import { prisma } from '../../lib/db';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET - Retrieve all shopping list items for the current user
export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const shoppingItems = await prisma.shoppingListItem.findMany({
      where: {
        userId: user.id
      },
      orderBy: [
        { isChecked: 'asc' },
        { category: 'asc' }
      ]
    });
    
    return NextResponse.json({ shoppingItems });
  } catch (error) {
    console.error('Error fetching shopping list items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shopping list items' },
      { status: 500 }
    );
  }
}

// POST - Add a new shopping list item
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, quantity, unit } = body;
    
    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const newShoppingItem = await prisma.shoppingListItem.create({
      data: {
        name,
        category: category || 'Other',
        quantity: quantity || 1,
        unit: unit || 'item',
        isChecked: false,
        userId: user.id
      }
    });
    
    return NextResponse.json({ shoppingItem: newShoppingItem });
  } catch (error) {
    console.error('Error adding shopping list item:', error);
    return NextResponse.json(
      { error: 'Failed to add shopping list item' },
      { status: 500 }
    );
  }
}

// PUT - Update an existing shopping list item
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, category, quantity, unit, isChecked } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure the item belongs to the current user
    const existingItem = await prisma.shoppingListItem.findUnique({
      where: { id }
    });
    
    if (!existingItem || existingItem.userId !== user.id) {
      return NextResponse.json(
        { error: 'Item not found or unauthorized' },
        { status: 404 }
      );
    }
    
    const updatedItem = await prisma.shoppingListItem.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existingItem.name,
        category: category !== undefined ? category : existingItem.category,
        quantity: quantity !== undefined ? quantity : existingItem.quantity,
        unit: unit !== undefined ? unit : existingItem.unit,
        isChecked: isChecked !== undefined ? isChecked : existingItem.isChecked
      }
    });
    
    return NextResponse.json({ shoppingItem: updatedItem });
  } catch (error) {
    console.error('Error updating shopping list item:', error);
    return NextResponse.json(
      { error: 'Failed to update shopping list item' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a shopping list item
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
    
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure the item belongs to the current user
    const existingItem = await prisma.shoppingListItem.findUnique({
      where: { id }
    });
    
    if (!existingItem || existingItem.userId !== user.id) {
      return NextResponse.json(
        { error: 'Item not found or unauthorized' },
        { status: 404 }
      );
    }
    
    await prisma.shoppingListItem.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting shopping list item:', error);
    return NextResponse.json(
      { error: 'Failed to delete shopping list item' },
      { status: 500 }
    );
  }
} 