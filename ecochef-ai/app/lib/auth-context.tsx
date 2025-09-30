'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClientComponentClient } from './supabase';

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
    const checkAuth = async () => {
      try {
        console.log('Checking Supabase Auth session');
        const supabase = createClientComponentClient();
        
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('Found existing Supabase Auth session');
          setUser({
            id: session.user.id,
            username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
            email: session.user.email,
              isLoggedIn: true
          });
        } else {
          console.log('No existing Supabase Auth session');
          setUser(null);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
        const supabase = createClientComponentClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (session?.user) {
        setUser({
          id: session.user.id,
          username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
          email: session.user.email,
          isLoggedIn: true
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('Login attempt for:', email);
      
        const supabase = createClientComponentClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Supabase Auth login failed:', error.message);
        throw new Error(error.message || 'Login failed. Please check your credentials.');
      }

      if (!data.user) {
        throw new Error('Login failed. Please check your credentials.');
      }

      console.log('Supabase Auth login successful');
      
      // Create default user preferences if they don't exist
      try {
        const { error: prefsError } = await supabase
          .from('user_preferences')
          .insert([
            {
              userid: data.user.id,
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
          ])
          .select();
          
        if (prefsError && !prefsError.message.includes('duplicate key')) {
          console.error('Error creating user preferences:', prefsError);
        } else if (!prefsError) {
          console.log('Successfully created user preferences');
        }
      } catch (prefsError) {
        console.error('Error setting up user preferences:', prefsError);
      }

      // User state will be set by the auth state change listener
      return true;
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Login failed. Please try again later.');
    }
  };
  
  const signup = async (email: string, password: string, username: string): Promise<boolean> => {
    try {
      console.log('Starting user signup process for:', email);
      
        const supabase = createClientComponentClient();
      
      console.log('Creating user with Supabase Auth');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username
          }
        }
      });

      if (error) {
        console.error('Error creating user with Supabase Auth:', error);
        throw new Error(error.message || 'Signup failed. Please try again.');
      }

      if (!data.user) {
        console.error('No user returned from Supabase Auth signup');
        throw new Error('Failed to create user account');
      }
      
      console.log('Successfully created user in Supabase Auth');
      console.log('User ID:', data.user.id);

      // Create default user preferences
      console.log('Creating user preferences for:', data.user.id);
      
      try {
        const { error: prefsError } = await supabase
          .from('user_preferences')
          .insert([
            {
              userid: data.user.id,
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
        } else {
          console.log('Successfully created user preferences');
        }
      } catch (prefsError) {
        console.error('Error setting up user preferences:', prefsError);
      }
      
      console.log('Signup process completed successfully');
      return true;
    } catch (err: unknown) {
      console.error('Signup error:', err);
      if (err instanceof Error) {
      throw err;
      }
      throw new Error('Signup failed. Please try again.');
    }
  };

  const logout = async (): Promise<void> => {
    try {
      console.log('Starting logout process...');
      
        const supabase = createClientComponentClient();
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Supabase signOut error:', error);
        throw new Error('Logout failed. Please try again.');
      }
      
      console.log('Logout process completed');
      // User state will be reset by the auth state change listener
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