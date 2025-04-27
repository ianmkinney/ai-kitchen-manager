'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';

export default function Navbar() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  
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
          
          <div className="flex items-center gap-4">
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
      </div>
    </nav>
  );
} 