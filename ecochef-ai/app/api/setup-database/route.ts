import { createServerClient } from "../../lib/supabase-server";
import { NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

// Function to split SQL into individual statements
function splitSqlStatements(sql: string): string[] {
  return sql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0)
    .map(stmt => stmt + ';');
}

export async function GET() {
  try {
    const supabase = await createServerClient();
    
    // First, check if we need to create the exec_sql function
    const execSqlFunctionPath = path.join(process.cwd(), 'supabase', 'exec_sql_function.sql');
    let execSqlFunction: string;
    
    try {
      execSqlFunction = fs.readFileSync(execSqlFunctionPath, 'utf8');
      
      // First attempt to create the exec_sql function using raw SQL execution
      // This is a direct attempt using the PostgreSQL REST API
      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql_string: execSqlFunction
        });
        
        if (error) {
          console.log('Note: Could not create exec_sql function. This is expected if you don\'t have superuser privileges.');
        } else {
          console.log('Successfully created exec_sql function');
        }
      } catch {
        console.log('Note: exec_sql function creation skipped - requires manual creation by superuser');
      }
    } catch {
      console.log('Could not read exec_sql function file - continuing with setup');
    }
    
    // Read the setup SQL script
    const setupScriptPath = path.join(process.cwd(), 'prisma', 'setup_database.sql');
    let setupScript: string;
    
    try {
      setupScript = fs.readFileSync(setupScriptPath, 'utf8');
    } catch (error) {
      console.error('Error reading setup SQL file:', error);
      return NextResponse.json(
        { error: 'Failed to read setup SQL file' },
        { status: 500 }
      );
    }

    // Read the RLS policies SQL script
    const rlsPoliciesPath = path.join(process.cwd(), 'supabase', 'rls_policies.sql');
    let rlsPoliciesScript: string = "";
    
    try {
      rlsPoliciesScript = fs.readFileSync(rlsPoliciesPath, 'utf8');
      console.log('Successfully read RLS policies file');
    } catch (error) {
      console.error('Error reading RLS policies file:', error);
      // Continue anyway, as the main setup should still work
    }

    // Combine setup script with RLS policies
    const combinedScript = setupScript + '\n\n' + rlsPoliciesScript;

    // Split the script into individual statements
    const statements = splitSqlStatements(combinedScript);
    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{statement: string, error: unknown}> = [];

    // Try multiple execution methods in order of preference
    for (const statement of statements) {
      try {
        // Method 1: Try using exec_sql function if it exists
        try {
          const { error: rpcError } = await supabase.rpc('exec_sql', { 
            sql_string: statement 
          });
          
          if (!rpcError) {
            successCount++;
            continue;
          }
        } catch {
          // Function not available, continue to next method
        }

        // Method 2: Try using direct query if available (some statements may work)
        try {
          // For statements that are simple SELECT, INSERT, UPDATE, DELETE
          if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE TABLE|ALTER TABLE|DROP TABLE)/i.test(statement)) {
            try {
              const result = await supabase.from('_exec_direct').select('*').eq('query', statement);
              
              if (!result.error) {
                successCount++;
                continue;
              }
            } catch {
              // Method not available
            }
          }
        } catch {
          // Failed to execute directly, continue to next method
        }

        // Method 3: Try to execute as a stored procedure (if it's a function or procedure call)
        if (/^\s*CALL|EXECUTE/i.test(statement)) {
          try {
            const procedureResult = await supabase.rpc('execute_procedure', { 
              procedure_call: statement 
            });

            if (!procedureResult.error) {
              successCount++;
              continue;
            }
          } catch {
            // Failed to execute as procedure, will fall through to error handling
          }
        }

        // If we reached here, all methods failed for this statement
        errorCount++;
        errors.push({ statement, error: 'Failed to execute SQL statement with available methods' });
        
      } catch (stmtError) {
        errorCount++;
        errors.push({ statement, error: stmtError });
      }
    }

    // Return results based on success/failure counts
    if (errorCount === 0) {
      return NextResponse.json(
        { 
          message: 'Database setup completed successfully', 
          details: `Executed ${successCount} statements` 
        },
        { status: 200 }
      );
    } else if (successCount > 0) {
      return NextResponse.json(
        { 
          message: 'Database setup partially completed', 
          details: `Executed ${successCount} statements, ${errorCount} failed`,
          errors
        },
        { status: 207 } // 207 Multi-Status
      );
    } else {
      return NextResponse.json(
        { 
          error: 'Database setup failed completely', 
          details: `All ${errorCount} statements failed`,
          errors 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error during database setup:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during database setup', details: error },
      { status: 500 }
    );
  }
}