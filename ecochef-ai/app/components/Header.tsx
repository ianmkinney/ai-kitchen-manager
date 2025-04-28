'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { useRouter } from 'next/navigation';

// Replace the direct supabase instance with a browser client
const supabase = createBrowserClient();

export default function Header() {
  const [hasPreferences, setHasPreferences] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { logout } = useAuth();
  const router = useRouter();

  // Check if user has preferences on component mount
  useEffect(() => {
    const checkUserPreferences = async () => {
      try {
        const { error } = await supabase
          .from('user_preferences')
          .select('id')
          .single();
        
        // If no error or if error is not "no rows returned", then we have preferences
        setHasPreferences(!error || error.code !== 'PGRST116');
      } catch (error) {
        console.error('Error checking preferences:', error);
        setHasPreferences(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserPreferences();
  }, []);

  // Handle logout
  const handleLogout = async () => {
    console.log('Header: Logout button clicked');
    try {
      // Use the auth context's logout function instead of direct Supabase call
      await logout();
      
      // Explicitly clear cookies here as well to ensure logout
      document.cookie = 'ecochef_user_id=; path=/; max-age=0; SameSite=Lax; domain=';
      document.cookie = 'ecochef_user_email=; path=/; max-age=0; SameSite=Lax; domain=';
      
      console.log('Header: Logout completed successfully');
      
      // Use Next router instead of direct window location change
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Header: Error logging out:', error);
    }
  };

  return (
    <header className="bg-gradient-to-r from-primary-600 to-primary-500 text-white py-4 shadow-md">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold flex items-center gap-2">
          <span className="text-3xl">🥗</span> EcoChef AI
        </Link>
        
        {/* Mobile menu button */}
        <button 
          className="md:hidden flex items-center" 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6 text-white"
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            {isMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        
        {/* Desktop navigation */}
        <nav className="hidden md:flex gap-4 md:gap-6 items-center">
          <Link href="/meal-planning" className="hover:text-white/80 transition-colors">
            Meal Planning
          </Link>
          <Link href="/pantry" className="hover:text-white/80 transition-colors">
            Pantry
          </Link>
          <Link href="/recipes" className="hover:text-white/80 transition-colors">
            Cooking Assistant
          </Link>
          <Link href="/profile" className="hover:text-white/80 transition-colors flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            Profile
          </Link>
          <button onClick={handleLogout} className="hover:text-white/80 transition-colors flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h5a1 1 0 011 1v1h-1V3H4v14h5v-1h1v1a1 1 0 01-1 1H4a1 1 0 01-1-1V3z" clipRule="evenodd" />
              <path d="M16.707 10.707a1 1 0 00-1.414-1.414L13.5 11.086V6a1 1 0 10-2 0v5.086l-1.793-1.793a1 1 0 00-1.414 1.414l3.5 3.5a1 1 0 001.414 0l3.5-3.5z" />
            </svg>
            Logout
          </button>
          {!isLoading && !hasPreferences && (
            <Link href="/preferences/quiz" className="hover:text-white/80 transition-colors">
              Dietary Quiz
            </Link>
          )}
        </nav>
      </div>
      
      {/* Mobile navigation menu */}
      {isMenuOpen && (
        <div className="md:hidden mt-2 pt-2 border-t border-white/20">
          <nav className="flex flex-col space-y-3 px-4 py-2">
            <Link 
              href="/meal-planning" 
              className="text-white hover:text-white/80 py-1"
              onClick={() => setIsMenuOpen(false)}
            >
              Meal Planning
            </Link>
            <Link 
              href="/pantry" 
              className="text-white hover:text-white/80 py-1"
              onClick={() => setIsMenuOpen(false)}
            >
              Pantry
            </Link>
            <Link 
              href="/recipes" 
              className="text-white hover:text-white/80 py-1"
              onClick={() => setIsMenuOpen(false)}
            >
              Cooking Assistant
            </Link>
            <Link 
              href="/profile" 
              className="text-white hover:text-white/80 py-1 flex items-center gap-1"
              onClick={() => setIsMenuOpen(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              Profile
            </Link>
            <button 
              onClick={() => {
                handleLogout();
                setIsMenuOpen(false);
              }} 
              className="text-white hover:text-white/80 py-1 text-left flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h5a1 1 0 011 1v1h-1V3H4v14h5v-1h1v1a1 1 0 01-1 1H4a1 1 0 01-1-1V3z" clipRule="evenodd" />
                <path d="M16.707 10.707a1 1 0 00-1.414-1.414L13.5 11.086V6a1 1 0 10-2 0v5.086l-1.793-1.793a1 1 0 00-1.414 1.414l3.5 3.5a1 1 0 001.414 0l3.5-3.5z" />
              </svg>
              Logout
            </button>
            {!isLoading && !hasPreferences && (
              <Link 
                href="/preferences/quiz" 
                className="text-white hover:text-white/80 py-1"
                onClick={() => setIsMenuOpen(false)}
              >
                Dietary Quiz
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}