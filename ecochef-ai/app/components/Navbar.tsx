'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';

export default function Navbar() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  
  const handleLogout = () => {
    logout();
    router.push('/login');
    router.refresh();
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
                    </div>
                    <div className="mr-4 text-gray-600">
                      Hi, <span className="font-medium">{user.username}</span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="btn-secondary text-sm"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="btn-secondary text-sm">
                      Login
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