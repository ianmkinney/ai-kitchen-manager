/**
 * EcoChef AI Supabase Setup Script
 * This script helps initialize your Supabase project for the EcoChef AI application.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Configuration data
let config = {
  supabaseUrl: '',
  supabaseKey: '',
};

// Main function to run the setup
async function main() {
  console.log('\n=== EcoChef AI Supabase Setup ===\n');
  console.log('This script will help you initialize your Supabase project for the EcoChef AI application.');
  console.log('Please make sure you have already created a Supabase project at https://supabase.com\n');
  
  await collectSupabaseCredentials();
  await checkSupabaseConnection();
  await executeInitSql();
  
  console.log('\n=== Setup Complete! ===\n');
  console.log('Your Supabase database is now set up for EcoChef AI.');
  console.log('Make sure your .env file contains the following variables:');
  console.log(`NEXT_PUBLIC_SUPABASE_URL=${config.supabaseUrl}`);
  console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${config.supabaseKey}`);
  
  rl.close();
}

// Collect Supabase credentials from user
async function collectSupabaseCredentials() {
  return new Promise((resolve) => {
    const promptUrl = () => {
      rl.question('Enter your Supabase project URL (https://your-project.supabase.co): ', (supabaseUrl) => {
        // Validate and clean up URL
        let cleanUrl = supabaseUrl.trim();
        
        // Make sure URL has https:// prefix
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
          cleanUrl = 'https://' + cleanUrl;
        }
        
        // Remove trailing slash if present
        if (cleanUrl.endsWith('/')) {
          cleanUrl = cleanUrl.slice(0, -1);
        }
        
        if (!cleanUrl || !cleanUrl.includes('supabase.co')) {
          console.log('Invalid Supabase URL. It should be in the format: https://your-project.supabase.co');
          promptUrl();
          return;
        }
        
        config.supabaseUrl = cleanUrl;
        promptKey();
      });
    };
    
    const promptKey = () => {
      rl.question('Enter your Supabase anon key: ', (supabaseKey) => {
        const cleanKey = supabaseKey.trim();
        
        if (!cleanKey) {
          console.log('Anon key cannot be empty.');
          promptKey();
          return;
        }
        
        config.supabaseKey = cleanKey;
        resolve();
      });
    };
    
    promptUrl();
  });
}

// Check Supabase connection
async function checkSupabaseConnection() {
  console.log('\nChecking connection to Supabase...');
  console.log(`URL: ${config.supabaseUrl}`);
  console.log(`Key: ${config.supabaseKey.substring(0, 5)}...${config.supabaseKey.substring(config.supabaseKey.length - 5)}`);
  
  try {
    if (!config.supabaseUrl || !config.supabaseKey) {
      throw new Error('Supabase URL and anon key are required');
    }
    
    const supabase = createClient(config.supabaseUrl, config.supabaseKey);
    
    // First try a simple query to test connection
    const { error } = await supabase.from('_metadata').select('*').limit(1).maybeSingle();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is fine
      console.error('Error connecting to Supabase:', error.message);
      process.exit(1);
    }
    
    console.log('Connected to Supabase successfully!');
  } catch (error) {
    console.error('Error connecting to Supabase:', error.message);
    console.error('Please check your Supabase URL and anon key and try again.');
    process.exit(1);
  }
}

// Execute the initialization SQL
async function executeInitSql() {
  console.log('\nExecuting initialization SQL...');
  
  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'init.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split SQL statements by semicolon to execute them one by one
    const statements = sqlContent.split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    const supabase = createClient(config.supabaseUrl, config.supabaseKey);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    let successCount = 0;
    let warningCount = 0;
    
    for (const statement of statements) {
      try {
        console.log(`Executing: ${statement.substring(0, 40)}...`);
        
        // Try to use the SQL function if available
        try {
          const { error } = await supabase.rpc('execute_sql', { sql: statement + ';' });
          if (error) {
            console.warn(`Warning: RPC method failed. Falling back to direct query.`);
            // Fall back to direct query if RPC fails
            const { error: queryError } = await supabase.auth.admin.executeRaw(statement + ';');
            if (queryError) {
              warningCount++;
              console.warn(`Warning executing SQL: ${queryError.message}`);
            } else {
              successCount++;
            }
          } else {
            successCount++;
          }
        } catch (rpcError) {
          console.warn(`Warning: ${rpcError.message}`);
          warningCount++;
        }
      } catch (error) {
        console.warn(`Warning: ${error.message}`);
        warningCount++;
      }
    }
    
    console.log(`Database initialization completed with ${successCount} successful statements and ${warningCount} warnings.`);
    console.log('Some warnings are expected if tables already exist.');
    
    if (warningCount === statements.length) {
      console.log('\nNote: You may need to manually execute the SQL if all statements failed.');
      console.log('1. Go to your Supabase project dashboard');
      console.log('2. Navigate to "SQL Editor"');
      console.log('3. Copy the contents of init.sql and run it');
    }
  } catch (error) {
    console.error('Error executing initialization SQL:', error.message);
    console.log('\nImportant: You can still manually execute the SQL by:');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to "SQL Editor"');
    console.log('3. Copy the contents of init.sql and run it');
    
    return new Promise((resolve) => {
      rl.question('\nPress Enter to continue...', () => {
        resolve();
      });
    });
  }
}

// Run the main function
main().catch(error => {
  console.error('Setup failed:', error);
  process.exit(1);
}); 