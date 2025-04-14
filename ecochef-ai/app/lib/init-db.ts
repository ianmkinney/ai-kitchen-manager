import { createClient } from '@supabase/supabase-js';
import { ensureAdminUser } from './admin-check';

/**
 * Initialize database tables if they don't exist 
 * This function runs once at server startup
 */
export async function initializeDatabase() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials for database initialization');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Run the database setup function
    await supabase.rpc('setup_database', {});
    
    console.log('Database initialization completed successfully');
    
    // Ensure admin user exists
    await ensureAdminUser();
  } catch (error) {
    console.error('Error initializing database:', error);
  }
} 