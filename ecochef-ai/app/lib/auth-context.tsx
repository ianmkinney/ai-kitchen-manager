'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ensureTestUser } from './user-preferences';

export interface User {
  id: string;
  username: string;
  isLoggedIn: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, passcode: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth in localStorage
    const checkAuth = async () => {
      try {
        // Make sure test user exists in Supabase (even before login)
        await ensureTestUser();
        
        const authData = localStorage.getItem('ecochef_auth');
        if (authData) {
          const userData = JSON.parse(authData) as User;
          setUser(userData);
        }
      } catch (error) {
        console.error('Error reading auth data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const login = async (username: string, passcode: string): Promise<boolean> => {
    // Check hardcoded credentials
    if (username === 'test' && passcode === '123') {
      // Use test user ID
      const testUserId = '00000000-0000-0000-0000-000000000000';
      
      // Create user object
      const userData: User = {
        id: testUserId,
        username: 'test',
        isLoggedIn: true
      };
      
      // Store in localStorage
      localStorage.setItem('ecochef_auth', JSON.stringify(userData));
      
      // Set cookie for middleware
      document.cookie = `ecochef_auth=${testUserId}; path=/; max-age=86400`;
      
      // Update state
      setUser(userData);
      
      // Make sure test user exists in Supabase
      await ensureTestUser();
      
      return true;
    }
    
    return false;
  };

  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('ecochef_auth');
    
    // Clear cookie
    document.cookie = 'ecochef_auth=; path=/; max-age=0';
    
    // Update state
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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