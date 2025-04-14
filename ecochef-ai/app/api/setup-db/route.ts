import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { createAdminClient } from '../../lib/admin-check';
import { createServerClient } from '../../lib/supabase-server';

// This endpoint is for initializing the database 
// It should be called once during deployment or initial setup

export async function GET(req: NextRequest) {
  try {
    // Validate that the request includes the required admin token
    const adminToken = req.headers.get('x-admin-token');
    const validToken = process.env.ADMIN_SETUP_TOKEN || 'ecochef-setup-91a8c3e7f0d2';
    
    if (adminToken !== validToken) {
      console.error('Unauthorized database setup attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not found in environment variables');
    }
    
    // Create admin client
    const adminClient = createAdminClient();
    
    console.log('Reading master schema file...');
    // Read the master schema file
    const schemaFilePath = path.join(process.cwd(), 'supabase', 'consolidated', 'master-schema.sql');
    
    if (!fs.existsSync(schemaFilePath)) {
      console.error('Schema file not found at:', schemaFilePath);
      return NextResponse.json({ 
        error: 'Schema file not found',
        path: schemaFilePath 
      }, { status: 500 });
    }
    
    const schemaSQL = fs.readFileSync(schemaFilePath, 'utf8');
    
    console.log('Executing master schema SQL...');
    
    // Execute the SQL directly with PostgreSQL service role permissions
    const { error } = await adminClient.rpc('exec_sql', { sql: schemaSQL });
    
    if (error) {
      console.error('Error executing schema SQL:', error);
      
      // Try to create the exec_sql function first if it doesn't exist
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION exec_sql(sql text)
        RETURNS void AS $$
        BEGIN
          EXECUTE sql;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `;
      
      const { error: functionError } = await adminClient.rpc('exec_sql', { 
        sql: createFunctionSQL 
      });
      
      if (functionError) {
        console.error('Error creating exec_sql function:', functionError);
        return NextResponse.json({ 
          error: 'Failed to create exec_sql function', 
          details: functionError 
        }, { status: 500 });
      }
      
      // Try executing the schema SQL again
      const { error: retryError } = await adminClient.rpc('exec_sql', { sql: schemaSQL });
      
      if (retryError) {
        console.error('Error executing schema SQL after creating function:', retryError);
        return NextResponse.json({ 
          error: 'Database setup failed', 
          details: retryError 
        }, { status: 500 });
      }
    }
    
    console.log('Schema setup successful, now initializing test user...');
    
    // Initialize test user data using the initialize-test-user endpoint
    try {
      const testUserResponse = await fetch(
        new URL('/api/initialize-test-user', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
        {
          headers: {
            'x-admin-token': validToken
          }
        }
      );
      
      if (!testUserResponse.ok) {
        const errorText = await testUserResponse.text();
        console.error('Test user initialization failed:', errorText);
        return NextResponse.json({ 
          error: 'Test user initialization failed', 
          details: errorText,
          schemaSetup: 'successful'
        }, { status: 207 });
      }
      
      console.log('Test user initialized successfully');
    } catch (testUserError) {
      console.error('Error during test user initialization:', testUserError);
      return NextResponse.json({ 
        error: 'Test user initialization failed', 
        details: testUserError,
        schemaSetup: 'successful'
      }, { status: 207 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database setup and test user initialization completed successfully' 
    });
  } catch (error) {
    console.error('Unexpected error during database setup:', error);
    return NextResponse.json({ 
      error: 'Database setup failed due to an unexpected error', 
      details: error 
    }, { status: 500 });
  }
}

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

// Utility function - not exported as an API route handler
async function getUserPreferences() {
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

// Added API route to access the user preferences
export async function OPTIONS() {
  return getUserPreferences();
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