'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Header() {
  const [hasPreferences, setHasPreferences] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user has preferences on component mount
  useEffect(() => {
    const checkUserPreferences = async () => {
      try {
        const { data, error } = await supabase
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

  return (
    <header className="bg-gradient-to-r from-primary-600 to-primary-500 text-white py-4 shadow-md">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold flex items-center gap-2">
          <span className="text-3xl">🥗</span> EcoChef AI
        </Link>
        
        <nav className="flex gap-4 md:gap-6 items-center">
          <Link href="/meal-planning" className="hover:text-white/80 transition-colors">
            Meal Planning
          </Link>
          <Link href="/pantry" className="hover:text-white/80 transition-colors">
            Pantry
          </Link>
          <Link href="/recipes" className="hover:text-white/80 transition-colors">
            Cooking Assistant
          </Link>
          {!isLoading && (
            hasPreferences ? (
              <Link href="/profile" className="hover:text-white/80 transition-colors flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                Profile
              </Link>
            ) : (
              <Link href="/preferences/quiz" className="hover:text-white/80 transition-colors">
                Dietary Quiz
              </Link>
            )
          )}
        </nav>
      </div>
    </header>
  );
} 