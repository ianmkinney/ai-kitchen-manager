'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from './supabase';
import { createClient } from '@supabase/supabase-js';
import { hashPassword, verifyPassword } from './auth-utils';

export interface User {
  id: string;
  username: string;
  isLoggedIn: boolean;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, username: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Direct Supabase client for public schema access
  const createDirectClient = () => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  };

  const checkAuth = useCallback(async () => {
    try {
      console.log('Checking for existing authentication session');
      let userAuthenticated = false;
      
      // Check if we have cookies indicating a logged in user
      const cookies = document.cookie.split(';').map(cookie => cookie.trim());
      const testUserCookie = cookies.find(c => c.startsWith('ecochef_test_user='));
      const userIdCookie = cookies.find(c => c.startsWith('ecochef_test_user_id='));
      const userEmailCookie = cookies.find(c => c.startsWith('ecochef_test_user_email='));
      
      // Check for test user first
      if (testUserCookie && userIdCookie && userEmailCookie) {
        const userId = userIdCookie.split('=')[1];
        const userEmail = userEmailCookie.split('=')[1];
        
        const userData: User = {
          id: userId,
          username: 'testuser',
          email: userEmail,
          isLoggedIn: true
        };
        
        console.log('Found test user session:', userData);
        setUser(userData);
        setLoading(false);
        return; // Exit early since we found a valid user
      }
      
      // Check for normal user auth cookie
      const normalUserCookie = cookies.find(c => c.startsWith('ecochef_user_id='));
      
      if (normalUserCookie) {
        const userId = normalUserCookie.split('=')[1];
        console.log('Found user cookie with ID:', userId);
        const supabase = createDirectClient();
        
        // Get user details from custom User table
        const { data, error } = await supabase
          .from('User')
          .select('id, email, name')
          .eq('id', userId)
          .single();
          
        if (data && !error) {
          const userData: User = {
            id: data.id,
            username: data.name || 'User',
            email: data.email,
            isLoggedIn: true
          };
          
          console.log('Found valid user in database:', userData);
          setUser(userData);
          userAuthenticated = true; // Mark that we've found a valid user
        } else {
          // Cookie exists but user not found - clear cookies
          console.log('User ID from cookie not found in database, clearing cookies');
          document.cookie = 'ecochef_user_id=; path=/; max-age=0; SameSite=Lax';
          document.cookie = 'ecochef_user_email=; path=/; max-age=0; SameSite=Lax';
        }
      } else {
        console.log('No user cookie found');
      }
      
      // Only check Supabase auth if we haven't already authenticated a user
      if (!userAuthenticated) {
        console.log('Checking Supabase Auth session');
        const supabase = createBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('Found Supabase Auth session');
          const { data: { user: supabaseUser } } = await supabase.auth.getUser();
          
          if (supabaseUser) {
            const userData: User = {
              id: supabaseUser.id,
              username: supabaseUser.user_metadata?.username || 'User',
              email: supabaseUser.email,
              isLoggedIn: true
            };
            
            console.log('Using Supabase Auth user:', userData);
            setUser(userData);
            
            // Set our custom cookies to remember this user
            document.cookie = `ecochef_user_id=${userData.id}; path=/; max-age=86400; SameSite=Lax`;
            document.cookie = `ecochef_user_email=${userData.email}; path=/; max-age=86400; SameSite=Lax`;
          }
        } else {
          console.log('No Supabase Auth session found');
        }
      } else {
        console.log('User already authenticated via custom table, skipping Supabase Auth check');
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('Login attempt for:', email);
      
      // Clear any existing cookies to ensure a clean state
      document.cookie = 'ecochef_user_id=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'ecochef_user_email=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'ecochef_test_user=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'ecochef_test_user_id=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'ecochef_test_user_email=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'test_user=; path=/; max-age=0; SameSite=Lax';
      
      // Special handling for test account
      if (email === 'test@ecochef.demo' && password === 'password123') {
        console.log('Using special test user login flow');
        // Create a user object for the test account
        const testUser: User = {
          id: '00000000-0000-0000-0000-000000000000',
          username: 'testuser',
          email: 'test@ecochef.demo',
          isLoggedIn: true
        };
        
        // Set cookies that the middleware can read
        document.cookie = `ecochef_test_user=true; path=/; max-age=3600; SameSite=Lax`;
        document.cookie = `ecochef_test_user_id=${testUser.id}; path=/; max-age=3600; SameSite=Lax`;
        document.cookie = `ecochef_test_user_email=${testUser.email}; path=/; max-age=3600; SameSite=Lax`;
        
        // Set the test_user cookie that's checked in supabase-server.ts
        document.cookie = `test_user=true; path=/; max-age=3600; SameSite=Lax`;
        
        setUser(testUser);
        return true;
      }
      
      // First check our custom User table directly - this is our primary authentication method
      console.log('Checking user in custom User table');
      const supabase = createDirectClient();
      
      // Check if the user exists in the User table
      const { data, error } = await supabase
        .from('User')
        .select('id, email, name, password')
        .eq('email', email.toLowerCase())
        .single();
      
      if (data && !error) {
        console.log('User found in custom table, verifying password');
        
        try {
          // Debug output for password verification
          const storedHash = data.password;
          const generatedHash = hashPassword(password);
          const passwordMatches = verifyPassword(password, storedHash);
          
          console.log('Password verification debug:');
          console.log('- Stored hash:', storedHash);
          console.log('- Generated hash:', generatedHash);
          console.log('- Password match:', passwordMatches);
          
          if (passwordMatches) {
            console.log('Password verification succeeded');
            
            // Authentication successful with custom table
            const userData: User = {
              id: data.id,
              username: data.name || 'User',
              email: data.email,
              isLoggedIn: true
            };
            
            // Set custom auth cookies
            document.cookie = `ecochef_user_id=${userData.id}; path=/; max-age=86400; SameSite=Lax`;
            document.cookie = `ecochef_user_email=${userData.email}; path=/; max-age=86400; SameSite=Lax`;
            
            // Ensure browser gets the updated cookies
            console.log('Setting user state and completing login');
            
            // Force a slight delay to ensure cookies are properly set before proceeding
            await new Promise(resolve => setTimeout(resolve, 100));
            
            setUser(userData);
            console.log('Login successful, user state set:', userData);
            return true;
          } else {
            console.log('Password verification failed');
            throw new Error('Invalid password');
          }
        } catch (verifyError) {
          console.error('Error during password verification:', verifyError);
          throw new Error('Invalid password');
        }
      }
      
      // If we reach here, we didn't find the user in our custom table or password verification failed
      // Try authenticating with Supabase Auth as fallback
      console.log('User not found in custom table or password verification failed, trying Supabase Auth');
      const authClient = createBrowserClient();
      
      try {
        const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
          email,
          password
        });
        
        if (authError || !authData.user) {
          console.error('Supabase Auth login failed:', authError?.message);
          throw new Error(authError?.message || 'Login failed. Please check your credentials.');
        }
        
        console.log('Supabase Auth login successful, setting up user in custom table');
        
        // If we get here, the user was authenticated by Supabase Auth but not in our custom User table
        // Add them to our custom User table
        const hashedPassword = hashPassword(password);
        const username = authData.user.user_metadata?.username || email.split('@')[0];
        
        const { error: insertError } = await supabase
          .from('User')
          .insert([{
            id: authData.user.id,
            email: email.toLowerCase(),
            password: hashedPassword,
            name: username,
            "createdAt": new Date().toISOString(),
            "updatedAt": new Date().toISOString()
          }]);
          
        if (insertError) {
          console.error('Error adding authenticated user to custom table:', insertError);
        } else {
          console.log('Successfully added user to custom table');
        }
        
        // Create default user preferences
        const { error: prefsError } = await supabase
          .from('user_preferences')
          .insert([
            {
              userid: authData.user.id,
              "isVegetarian": false,
              "isVegan": false,
              "isGlutenFree": false,
              "isDairyFree": false,
              "isNutFree": false,
              "maxCookingTime": 30,
              "cookingSkillLevel": 'intermediate',
              "peopleCount": 1,
              "cuisinePreferences": [],
              "healthGoals": [],
              allergies: [],
              "spicyPreference": 5,
              "sweetPreference": 5,
              "savoryPreference": 5,
              "createdAt": new Date().toISOString(),
              "updatedAt": new Date().toISOString()
            }
          ]);
          
        if (prefsError) {
          console.error('Error creating user preferences for new user:', prefsError);
        }
        
        const userData: User = {
          id: authData.user.id,
          username: username,
          email: authData.user.email || '',
          isLoggedIn: true
        };
        
        // Set custom auth cookies
        document.cookie = `ecochef_user_id=${userData.id}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `ecochef_user_email=${userData.email}; path=/; max-age=86400; SameSite=Lax`;
        
        setUser(userData);
        return true;
      } catch (authError) {
        console.error('All authentication methods failed');
        if (authError instanceof Error) {
          throw authError;
        }
        throw new Error('Login failed. Please check your credentials.');
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Login error:', error.message);
        throw error;
      }
      console.error('Login error:', error);
      throw new Error('Login failed. Please try again later.');
    }
  };
  
  const signup = async (email: string, password: string, username: string): Promise<boolean> => {
    try {
      console.log('Starting user signup process for:', email);
      
      // First create the user in Supabase Auth
      const authClient = createBrowserClient();
      
      console.log('Creating user with Supabase Auth');
      const { data: authData, error: authError } = await authClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            username
          }
        }
      });

      if (authError) {
        console.error('Error creating user with Supabase Auth:', authError);
        throw new Error(authError.message || 'Signup failed. Please try again.');
      }

      if (!authData.user) {
        console.error('No user returned from Supabase Auth signup');
        throw new Error('Failed to create user account');
      }
      
      console.log('Successfully created user in Supabase Auth');
      console.log('User ID:', authData.user.id);
      
      // Hash the password for storage
      const hashedPassword = hashPassword(password);
      console.log('Generated password hash for new user:', hashedPassword);
      
      // Create the user in our custom User table with the same ID
      const supabase = createDirectClient();
      
      // Check if user already exists in our custom table
      console.log('Checking if user exists in custom User table');
      const { data: existingUser, error: existingUserError } = await supabase
        .from('User')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();
      
      if (existingUserError) {
        console.error('Error checking existing user:', existingUserError);
      }
      
      if (existingUser) {
        console.log('User already exists in custom User table, updating information');
        // Update the existing user
        const { error: updateError } = await supabase
          .from('User')
          .update({
            id: authData.user.id, // Update to match Auth ID
            email: email.toLowerCase(),
            password: hashedPassword, // Update with new password hash
            name: username,
            "updatedAt": new Date().toISOString()
          })
          .eq('id', existingUser.id);
          
        if (updateError) {
          console.error('Error updating existing user in custom User table:', updateError);
        } else {
          console.log('Successfully updated existing user');
        }
      } else {
        console.log('Creating user in custom User table with ID:', authData.user.id);
        
        // Verify we can properly hash and verify the password before saving
        const testVerify = verifyPassword(password, hashedPassword);
        console.log('Password hash verification test:', testVerify);
        
        const { data, error } = await supabase
          .from('User')
          .insert([{
            id: authData.user.id, // Use the ID from Auth
            email: email.toLowerCase(),
            password: hashedPassword, // Store hashed password
            name: username,
            "createdAt": new Date().toISOString(),
            "updatedAt": new Date().toISOString()
          }])
          .select();
        
        if (error) {
          console.error('Error creating user in custom User table:', error);
          console.error('Error message:', error.message);
          console.error('Error details:', error.details);
          // Continue anyway since the auth user was created
        } else {
          console.log('Successfully created user in custom User table:', data);
        }
      }

      // Create default user preferences
      console.log('Creating user preferences for:', authData.user.id);
      
      // First check if preferences already exist
      const { data: existingPrefs, error: existingPrefsError } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('userid', authData.user.id)
        .maybeSingle();
        
      if (existingPrefsError) {
        console.error('Error checking existing preferences:', existingPrefsError);
      }
      
      if (existingPrefs) {
        console.log('User preferences already exist, skipping creation');
      } else {
        const { error: prefsError } = await supabase
          .from('user_preferences')
          .insert([
            {
              userid: authData.user.id,
              "isVegetarian": false,
              "isVegan": false,
              "isGlutenFree": false,
              "isDairyFree": false,
              "isNutFree": false,
              "maxCookingTime": 30,
              "cookingSkillLevel": 'intermediate',
              "peopleCount": 1,
              "cuisinePreferences": [],
              "healthGoals": [],
              allergies: [],
              "spicyPreference": 5,
              "sweetPreference": 5,
              "savoryPreference": 5,
              "createdAt": new Date().toISOString(),
              "updatedAt": new Date().toISOString()
            }
          ]);
        
        if (prefsError) {
          console.error('Error creating user preferences:', prefsError);
          console.error('Preferences error message:', prefsError.message);
          console.error('Preferences error details:', prefsError.details);
        } else {
          console.log('Successfully created user preferences');
        }
      }
      
      // Ensure we're not setting any test user cookies
      document.cookie = 'test_user=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'ecochef_test_user=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'ecochef_test_user_id=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'ecochef_test_user_email=; path=/; max-age=0; SameSite=Lax';
      
      // Set regular user cookies
      console.log('Setting user cookies for:', authData.user.id);
      document.cookie = `ecochef_user_id=${authData.user.id}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `ecochef_user_email=${authData.user.email}; path=/; max-age=86400; SameSite=Lax`;
      
      setUser({
        id: authData.user.id,
        username: username,
        email: authData.user.email!,
        isLoggedIn: true
      });
      
      console.log('Signup process completed successfully');
      return true;
    } catch (err: unknown) {
      console.error('Signup error:', err);
      throw err;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      console.log('Starting logout process...');
      
      // Clear custom auth cookies with multiple variations to ensure deletion
      // Without domain specification
      document.cookie = 'ecochef_user_id=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'ecochef_user_email=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'ecochef_test_user=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'ecochef_test_user_id=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'ecochef_test_user_email=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'test_user=; path=/; max-age=0; SameSite=Lax';
      
      // With empty domain
      document.cookie = 'ecochef_user_id=; path=/; max-age=0; SameSite=Lax; domain=';
      document.cookie = 'ecochef_user_email=; path=/; max-age=0; SameSite=Lax; domain=';
      document.cookie = 'ecochef_test_user=; path=/; max-age=0; SameSite=Lax; domain=';
      document.cookie = 'ecochef_test_user_id=; path=/; max-age=0; SameSite=Lax; domain=';
      document.cookie = 'ecochef_test_user_email=; path=/; max-age=0; SameSite=Lax; domain=';
      document.cookie = 'test_user=; path=/; max-age=0; SameSite=Lax; domain=';
      
      // With expires attribute
      const pastDate = new Date(0).toUTCString();
      document.cookie = `ecochef_user_id=; path=/; expires=${pastDate}; SameSite=Lax`;
      document.cookie = `ecochef_user_email=; path=/; expires=${pastDate}; SameSite=Lax`;
      document.cookie = `ecochef_test_user=; path=/; expires=${pastDate}; SameSite=Lax`;
      document.cookie = `ecochef_test_user_id=; path=/; expires=${pastDate}; SameSite=Lax`;
      document.cookie = `ecochef_test_user_email=; path=/; expires=${pastDate}; SameSite=Lax`;
      document.cookie = `test_user=; path=/; expires=${pastDate}; SameSite=Lax`;
      
      // Check if cookies are properly cleared
      console.log('Cookies after clearing:', document.cookie);
      
      // Also sign out from Supabase (as fallback)
      const supabase = createBrowserClient();
      await supabase.auth.signOut();
      console.log('Supabase signOut completed');
      
      // Update state
      setUser(null);
      console.log('User state reset to null');
      
      // Force a slight delay to ensure all operations complete
      await new Promise(resolve => setTimeout(resolve, 200));
      console.log('Logout process completed');
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Logout failed. Please try again.');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}