'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createBrowserClient } from './supabase';
import { createClient } from '@supabase/supabase-js';

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

  useEffect(() => {
    // Check for existing auth session with custom cookies
    const checkAuth = async () => {
      try {
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
          
          setUser(userData);
          setLoading(false);
          return;
        }
        
        // Check for normal user auth cookie
        const userCookie = cookies.find(c => c.startsWith('ecochef_user_id='));
        
        if (userCookie) {
          const userId = userCookie.split('=')[1];
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
            
            setUser(userData);
          } else {
            // Cookie exists but user not found - clear cookies
            document.cookie = 'ecochef_user_id=; path=/; max-age=0; SameSite=Lax';
            document.cookie = 'ecochef_user_email=; path=/; max-age=0; SameSite=Lax';
          }
        }
        
        // Also check Supabase auth as fallback
        const supabase = createBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const { data: { user: supabaseUser } } = await supabase.auth.getUser();
          
          if (supabaseUser) {
            const userData: User = {
              id: supabaseUser.id,
              username: supabaseUser.user_metadata?.username || 'User',
              email: supabaseUser.email,
              isLoggedIn: true
            };
            
            setUser(userData);
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Special handling for test account
      if (email === 'test@ecochef.demo' && password === 'password123') {
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
      
      // Try to authenticate with custom User table
      const supabase = createDirectClient();
      
      // Check if the user exists in the User table
      const { data, error } = await supabase
        .from('User')
        .select('id, email, name, password')
        .eq('email', email.toLowerCase())
        .single();
      
      if (error || !data) {
        console.error('User not found:', error);
        // Try Supabase auth as fallback
        const authClient = createBrowserClient();
        const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
          email,
          password
        });
        
        if (authError || !authData.user) {
          throw new Error(authError?.message || 'Login failed. Please check your credentials.');
        }
        
        const userData: User = {
          id: authData.user.id,
          username: authData.user.user_metadata?.username || 'User',
          email: authData.user.email!,
          isLoggedIn: true
        };
        
        setUser(userData);
        return true;
      }
      
      // Check password (in a real app, this would be hashed)
      if (data.password !== password) {
        throw new Error('Invalid password');
      }
      
      // Authentication successful
      const userData: User = {
        id: data.id,
        username: data.name || 'User',
        email: data.email,
        isLoggedIn: true
      };
      
      // Set custom auth cookies
      document.cookie = `ecochef_user_id=${userData.id}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `ecochef_user_email=${userData.email}; path=/; max-age=86400; SameSite=Lax`;
      
      setUser(userData);
      return true;
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
      // Create user in custom User table
      const supabase = createDirectClient();
      
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('User')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();
      
      if (existingUser) {
        throw new Error('User with this email already exists');
      }
      
      // Create new user in the User table
      const { data, error } = await supabase
        .from('User')
        .insert([{
          email: email.toLowerCase(),
          password: password, // In production, this would be hashed
          name: username
        }])
        .select()
        .single();
      
      if (error || !data) {
        // Try Supabase auth as fallback
        const authClient = createBrowserClient();
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
          throw new Error(authError.message || 'Signup failed. Please try again.');
        }

        if (authData.user) {
          // Create default user preferences with consistent lowercase column naming
          const { error: prefsError } = await authClient.from('user_preferences').insert([
            {
              userid: authData.user.id,
              isvegetarian: false,
              isvegan: false,
              isglutenfree: false,
              isdairyfree: false,
              isnutfree: false,
              maxcookingtime: 30,
              cookingskilllevel: 'intermediate',
              peoplecount: 1,
              preferredcuisines: [],
              dietgoals: [],
              allergies: [],
              spicypreference: 5,
              sweetpreference: 5,
              savorypreference: 5,
              createdat: new Date().toISOString(),
              updatedat: new Date().toISOString()
            }
          ]);
          
          if (prefsError) {
            console.error('Error creating user preferences:', prefsError);
          }
          
          return true;
        }
        
        return false;
      }
      
      // Create user preferences for the new custom user
      const { error: prefsError } = await supabase.from('user_preferences').insert([
        {
          userid: data.id,
          isvegetarian: false,
          isvegan: false,
          isglutenfree: false,
          isdairyfree: false,
          isnutfree: false,
          maxcookingtime: 30,
          cookingskilllevel: 'intermediate',
          peoplecount: 1,
          preferredcuisines: [],
          dietgoals: [],
          allergies: [],
          spicypreference: 5,
          sweetpreference: 5,
          savorypreference: 5,
          createdat: new Date().toISOString(),
          updatedat: new Date().toISOString()
        }
      ]);
      
      if (prefsError) {
        console.error('Error creating user preferences:', prefsError);
      }
      
      // Add initial pantry item
      const { error: pantryError } = await supabase.from('pantry_items').insert([
        {
          name: 'Welcome to your pantry!',
          userId: data.id,
          category: 'other',
          quantity: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]);
      
      if (pantryError) {
        console.error('Error creating initial pantry item:', pantryError);
      }
      
      // Set custom auth cookies
      document.cookie = `ecochef_user_id=${data.id}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `ecochef_user_email=${data.email}; path=/; max-age=86400; SameSite=Lax`;
      
      // Update user state
      const userData: User = {
        id: data.id,
        username: username,
        email: data.email,
        isLoggedIn: true
      };
      
      setUser(userData);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        console.error('Signup error:', error.message);
        throw error;
      }
      console.error('Signup error:', error);
      throw new Error('Signup failed. Please try again later.');
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Clear custom auth cookies
      document.cookie = 'ecochef_user_id=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'ecochef_user_email=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'ecochef_test_user=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'ecochef_test_user_id=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'ecochef_test_user_email=; path=/; max-age=0; SameSite=Lax';
      
      // Also sign out from Supabase (as fallback)
      const supabase = createBrowserClient();
      await supabase.auth.signOut();
      
      // Update state
      setUser(null);
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