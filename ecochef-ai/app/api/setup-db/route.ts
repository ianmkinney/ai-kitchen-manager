import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createServerClient } from '../../lib/supabase-server';

// This endpoint is for initializing the database 
// It should be called once during deployment or initial setup

export async function POST(request: Request) {
  try {
    // Get the admin token from the request
    const body = await request.json();
    const { adminToken } = body;
    
    // Check if admin token is valid
    if (adminToken !== process.env.ADMIN_SETUP_TOKEN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Initialize the Supabase client
    const supabase = await createServerClient();
    
    // Run the database setup function
    await supabase.rpc('setup_database', {});
    
    return NextResponse.json({ success: true, message: 'Database setup completed' }, { status: 200 });
  } catch (error) {
    console.error('Error setting up database:', error);
    return NextResponse.json(
      { error: 'Failed to set up database' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Read the SQL script
    const sqlPath = path.join(process.cwd(), 'setup-user-preferences.sql');
    let sql;
    
    try {
      sql = fs.readFileSync(sqlPath, 'utf8');
    } catch (error) {
      return NextResponse.json(
        { error: `Failed to read SQL file: ${error}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        message: 'Please run the SQL script in your Supabase SQL editor to set up the user_preferences table with camelCase columns',
        sql: sql
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: 'Failed to setup database tables' },
      { status: 500 }
    );
  }
}

// SQL Functions to run on Supabase:
/*
-- Function to create User table if it doesn't exist
CREATE OR REPLACE FUNCTION create_user_table_if_not_exists()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'User'
  ) THEN
    CREATE TABLE "User" (
      id UUID PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create UserPreferences table if it doesn't exist
CREATE OR REPLACE FUNCTION create_preferences_table_if_not_exists()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'UserPreferences'
  ) THEN
    CREATE TABLE "UserPreferences" (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID UNIQUE NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      is_vegetarian BOOLEAN DEFAULT false,
      is_vegan BOOLEAN DEFAULT false,
      is_gluten_free BOOLEAN DEFAULT false,
      is_dairy_free BOOLEAN DEFAULT false,
      is_nut_free BOOLEAN DEFAULT false,
      spicy_preference INTEGER DEFAULT 5,
      sweet_preference INTEGER DEFAULT 5,
      savory_preference INTEGER DEFAULT 5,
      max_cooking_time INTEGER,
      cooking_skill_level TEXT DEFAULT 'intermediate',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/