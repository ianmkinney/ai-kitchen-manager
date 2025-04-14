import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read the SQL script
    const sqlPath = path.join(process.cwd(), 'update-schema.sql');
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
        message: 'Run this SQL script in your Supabase SQL editor to update the database schema with proper lowercase column names and fix foreign key errors. The latest update removes the test user and adds default preferences for all existing users.',
        sql: sql
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: 'Failed to provide schema update script' },
      { status: 500 }
    );
  }
} 