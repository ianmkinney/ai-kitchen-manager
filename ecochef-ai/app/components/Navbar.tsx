'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { useState } from 'react';

export default function Navbar() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const handleLogout = async () => {
    console.log('Logout button clicked');
    try {
      await logout();
      console.log('Logout completed successfully');
      
      // Force clearing cookies in multiple ways to ensure deletion
      document.cookie = 'ecochef_user_id=; path=/; max-age=0; SameSite=Lax; domain=';
      document.cookie = 'ecochef_user_email=; path=/; max-age=0; SameSite=Lax; domain=';
      document.cookie = 'ecochef_test_user=; path=/; max-age=0; SameSite=Lax; domain=';
      document.cookie = 'ecochef_test_user_id=; path=/; max-age=0; SameSite=Lax; domain=';
      document.cookie = 'ecochef_test_user_email=; path=/; max-age=0; SameSite=Lax; domain=';
      
      // Check cookies after deletion
      console.log('Cookies after deletion:', document.cookie);
      
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };
  
  return (
    <nav className="bg-white shadow">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-primary-600">
            EcoChef AI
          </Link>
          
          {/* Mobile menu button */}
          <button 
            className="md:hidden flex items-center" 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6 text-gray-700"
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
          <div className="hidden md:flex items-center gap-4">
            {!loading && (
              <>
                {user?.isLoggedIn ? (
                  <>
                    <div className="flex gap-6 mr-2">
                      <Link href="/meal-planning" className="nav-link">
                        Meal Planning
                      </Link>
                      <Link href="/pantry" className="nav-link">
                        Pantry
                      </Link>
                      <Link href="/recipes" className="nav-link">
                        Recipes
                      </Link>
                      <Link href="/preferences/results" className="nav-link">
                        My Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="nav-link text-red-500 hover:text-red-700"
                      >
                        Logout
                      </button>
                    </div>
                    <div className="ml-4 text-gray-600">
                      Hi, <span className="font-medium">{user.username}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="btn-secondary text-sm">
                      Login
                    </Link>
                    <Link href="/signup" className="btn-primary text-sm">
                      Sign Up
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Mobile navigation menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t">
            {!loading && (
              <div className="flex flex-col space-y-3">
                {user?.isLoggedIn ? (
                  <>
                    <Link 
                      href="/meal-planning" 
                      className="px-2 py-1 text-gray-700 hover:bg-gray-100 rounded"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Meal Planning
                    </Link>
                    <Link 
                      href="/pantry" 
                      className="px-2 py-1 text-gray-700 hover:bg-gray-100 rounded"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Pantry
                    </Link>
                    <Link 
                      href="/recipes" 
                      className="px-2 py-1 text-gray-700 hover:bg-gray-100 rounded"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Recipes
                    </Link>
                    <Link 
                      href="/preferences/results" 
                      className="px-2 py-1 text-gray-700 hover:bg-gray-100 rounded"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      My Profile
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      className="px-2 py-1 text-left text-red-500 hover:bg-red-50 rounded"
                    >
                      Logout
                    </button>
                    <div className="px-2 py-1 text-gray-600">
                      Hi, <span className="font-medium">{user.username}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <Link 
                      href="/login" 
                      className="px-2 py-1 text-gray-700 hover:bg-gray-100 rounded"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Login
                    </Link>
                    <Link 
                      href="/signup" 
                      className="px-2 py-1 text-gray-700 hover:bg-gray-100 rounded"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
} 