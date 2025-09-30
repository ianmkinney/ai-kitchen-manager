import { NextResponse } from 'next/server';
import { createServerClient, getCurrentUser } from '../../../lib/supabase-server';

// DELETE endpoint to clear all pantry items
export async function DELETE() {
  try {
    // Get the current user
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Initialize Supabase client
    const supabase = await createServerClient();
    
    // Delete all pantry items for the current user
    const { error } = await supabase
      .from('pantry_items')
      .delete()
      .eq('userid', user.id);
    
    if (error) {
      console.error('Error clearing pantry items:', error);
      return NextResponse.json(
        { error: 'Failed to clear pantry items' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, message: 'All pantry items cleared successfully' });
  } catch (error) {
    console.error('Error clearing pantry items:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while clearing pantry items' },
      { status: 500 }
    );
  }
} 