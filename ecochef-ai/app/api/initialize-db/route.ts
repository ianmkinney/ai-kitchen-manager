import { NextResponse } from 'next/server';
import { initializeDatabase } from '../../lib/db-init';

// This endpoint manually initializes the database tables
export async function POST(request: Request) {
  try {
    // Check for admin token if needed
    const { adminToken } = await request.json();
    const expectedToken = process.env.ADMIN_SETUP_TOKEN;
    
    if (expectedToken && adminToken !== expectedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const success = await initializeDatabase();
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Database initialized successfully' 
      }, { status: 200 });
    } else {
      return NextResponse.json({ 
        error: 'Failed to initialize database' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: 'Failed to initialize database', details: errorMessage },
      { status: 500 }
    );
  }
}

// For easier testing in development
export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }
  
  try {
    const success = await initializeDatabase();
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Database initialized successfully' 
      }, { status: 200 });
    } else {
      return NextResponse.json({ 
        error: 'Failed to initialize database' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: 'Failed to initialize database', details: errorMessage },
      { status: 500 }
    );
  }
} 