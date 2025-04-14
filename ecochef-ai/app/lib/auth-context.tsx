'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createBrowserClient } from './supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

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

  useEffect(() => {
    // Check for existing auth session with Supabase
    const checkAuth = async () => {
      try {
        const supabase = createBrowserClient();
        
        // Get session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Get user details
          const { data: { user: supabaseUser } } = await supabase.auth.getUser();
          
          if (supabaseUser) {
            const userData: User = {
              id: supabaseUser.id,
              username: supabaseUser.user_metadata?.username || 'User',
              email: supabaseUser.email,
              isLoggedIn: true
            };
            
            setUser(userData);
            // No longer need custom cookie - Supabase manages this
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
    
    // Setup auth state change listener
    const supabase = createBrowserClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session && session.user) {
          const userData: User = {
            id: session.user.id,
            username: session.user.user_metadata?.username || 'User',
            email: session.user.email,
            isLoggedIn: true
          };
          
          setUser(userData);
          // No longer need custom cookie - Supabase manages this
        } else {
          setUser(null);
          // No longer need to clear custom cookie - Supabase manages this
        }
      }
    );
    
    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        throw error;
      }
      
      if (data.user) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };
  
  const signup = async (email: string, password: string, username: string): Promise<boolean> => {
    try {
      const supabase = createBrowserClient();
      
      console.log('Signup initiated with email:', email, 'and username:', username);
      console.log('Calling supabase.auth.signUp...');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username
          }
        }
      });
      console.log('Supabase signup response:', data, 'Error:', error);

      if (error) {
        console.error('Supabase signup error:', error);
        throw error;
      }

      if (data.user) {
        console.log('User created successfully in auth.users:', data.user);

        console.log('Inserting default user preferences...');
        await supabase.from('user_preferences').insert([
          {
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
            userid: data.user.id,
            createdat: new Date().toISOString(),
            updatedat: new Date().toISOString()
          }
        ]);
        console.log('Default user preferences inserted successfully.');

        console.log('Inserting sample pantry item...');
        await supabase.from('pantry_items').insert([
          {
            name: 'Welcome to your pantry!',
            userid: data.user.id,
            createdat: new Date().toISOString(),
            updatedat: new Date().toISOString()
          }
        ]);
        console.log('Sample pantry item inserted successfully.');

        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Signup error:', error);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const supabase = createBrowserClient();
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // No longer need to clear custom cookie - Supabase manages this
      
      // Update state
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
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