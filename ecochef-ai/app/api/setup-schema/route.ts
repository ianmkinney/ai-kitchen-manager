import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    // Validate that the request includes the required admin token
    const adminToken = req.headers.get('x-admin-token');
    const validToken = process.env.ADMIN_SECRET_TOKEN || 'admin-setup-token';
    
    if (adminToken !== validToken) {
      console.error('Unauthorized schema setup attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not found in environment variables');
    }
    
    // Create Supabase client with service role key for admin privileges
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    
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
    
    // Execute the SQL directly with PostgreSQL permissions
    // First, check if the exec_sql function is available
    const { error: functionCheckError } = await supabase
      .from('pg_proc')
      .select('proname')
      .eq('proname', 'exec_sql')
      .single();
    
    if (functionCheckError) {
      // If the function doesn't exist, create it
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION exec_sql(sql text)
        RETURNS void AS $$
        BEGIN
          EXECUTE sql;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `;
      
      const { error: createFunctionError } = await supabase.rpc('exec_sql', { 
        sql: createFunctionSQL 
      });
      
      if (createFunctionError) {
        // If we can't create the function, try direct SQL execution
        const { error: directError } = await supabase.rpc('exec_sql', { 
          sql: schemaSQL 
        });
        
        if (directError) {
          console.error('Error executing schema SQL directly:', directError);
          return NextResponse.json({ error: 'Database setup failed', details: directError }, { status: 500 });
        }
      }
    }
    
    // Execute the schema SQL
    const { error } = await supabase.rpc('exec_sql', { sql: schemaSQL });
    
    if (error) {
      console.error('Error executing schema SQL:', error);
      return NextResponse.json({ error: 'Database setup failed', details: error }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database schema successfully initialized with the master schema file' 
    });
  } catch (error) {
    console.error('Unexpected error during database setup:', error);
    return NextResponse.json({ 
      error: 'Database setup failed due to an unexpected error', 
      details: error 
    }, { status: 500 });
  }
}