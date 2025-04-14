'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import Link from 'next/link';

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testUserInitialized, setTestUserInitialized] = useState(false);

  // Initialize test user when the component mounts
  useEffect(() => {
    async function initTestUser() {
      try {
        const adminToken = 'ecochef-setup-91a8c3e7f0d2'; // Default token from the API route
        const response = await fetch('/api/initialize-test-user', {
          headers: {
            'x-admin-token': adminToken
          }
        });
        const data = await response.json();
        
        if (response.ok) {
          console.log('Test user setup complete:', data.message);
          setTestUserInitialized(true);
        } else {
          console.error('Failed to initialize test user:', data.error);
        }
      } catch (error) {
        console.error('Error initializing test user:', error);
      }
    }
    
    initTestUser();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const success = await login(email, password);
      
      if (success) {
        router.push('/');
        router.refresh();
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
        console.error(err.message);
      } else {
        setError('An unknown error occurred. Please try again.');
        console.error('An unknown error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillTestCredentials = () => {
    setEmail('test@ecochef.demo');
    setPassword('password123');
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <div className="card">
        <h1 className="text-2xl font-bold text-center mb-6">Login to EcoChef AI</h1>
        
        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-md mb-6">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field w-full"
              required
              placeholder="Enter your email"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field w-full"
              required
              placeholder="Enter your password"
            />
          </div>
          
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p>Don&apos;t have an account? <Link href="/signup" className="text-emerald-600 hover:text-emerald-700 font-medium">Sign up</Link></p>
        </div>

        <div className="mt-8 p-4 border border-gray-200 rounded-md bg-gray-50">
          <h3 className="font-medium text-gray-800 mb-2">Test Account</h3>
          <p className="text-sm text-gray-600 mb-2">You can use the following credentials to test the application:</p>
          <div className="text-sm">
            <p><strong>Email:</strong> test@ecochef.demo</p>
            <p><strong>Password:</strong> password123</p>
          </div>
          <button 
            onClick={fillTestCredentials}
            className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            type="button"
          >
            Fill test credentials
          </button>
          <div className="mt-2 text-xs text-gray-500">
            {testUserInitialized ? 
              '✓ Test account is ready to use' : 
              'Initializing test account...'}
          </div>
        </div>
      </div>
    </div>
  );
}