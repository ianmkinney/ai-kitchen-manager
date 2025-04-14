import { createClient } from '@supabase/supabase-js';

/**
 * Ensures an admin user exists in the system
 * This is run during initialization to make sure there's always
 * at least one account available for login
 */
export async function ensureAdminUser() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPasscode = process.env.ADMIN_PASSCODE || 'admin123';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials for admin user check');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if admin user exists
    const { data: existingAdmin } = await supabase
      .from('User')
      .select('id')
      .eq('name', adminUsername)
      .maybeSingle();
    
    if (existingAdmin) {
      console.log('Admin user already exists, skipping creation');
      return;
    }
    
    // If admin doesn't exist, create one
    const email = `admin-${Date.now()}@ecochef.internal`;
    
    // Create admin user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: adminPasscode,
      user_metadata: { username: adminUsername, role: 'admin' },
    });
    
    if (error) {
      throw error;
    }
    
    if (data.user) {
      // Create admin record in User table
      await supabase.from('User').insert([
        {
          id: data.user.id,
          email: email,
          name: adminUsername,
        }
      ]);
      
      console.log('Admin user created successfully');
    }
  } catch (error) {
    console.error('Error ensuring admin user exists:', error);
  }
} 