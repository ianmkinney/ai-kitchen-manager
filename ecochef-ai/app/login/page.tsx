'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/auth-context';
import AuthDebug from '../components/AuthDebug';

interface DebugInfo {
  cookies: {
    userIdCookie: string | null;
    userEmailCookie: string | null;
    testUserCookie: string | null;
    allCookies: string[];
  };
  userDetails: {
    id?: string;
    email?: string;
    name?: string;
    error?: string;
  } | null;
}

export default function Login() {
  const { login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testUserInitialized, setTestUserInitialized] = useState(false);
  const [initializingTestUser, setInitializingTestUser] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [showAdvancedDebug, setShowAdvancedDebug] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      console.log('Login form submitted for:', email);
      const success = await login(email, password);
      
      if (success) {
        console.log('Login successful, redirecting to home page');
        
        // Add a slight delay to ensure cookies are set before navigation
        setTimeout(() => {
          // Use window.location for a hard page reload instead of router
          window.location.href = '/';
        }, 500);
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
        console.error('Login error:', err.message);
      } else {
        setError('An unknown error occurred. Please try again.');
        console.error('An unknown login error occurred:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const fillTestCredentials = () => {
    setEmail('test@ecochef.demo');
    setPassword('password123');
  };
  
  const initializeTestUser = async () => {
    setInitializingTestUser(true);
    setTestUserInitialized(false);
    
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
        // Auto-fill test credentials after initialization
        fillTestCredentials();
      } else {
        console.error('Failed to initialize test user:', data.error);
        setError('Failed to initialize test user: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error initializing test user:', error);
      setError('Error initializing test user. Please try again.');
    } finally {
      setInitializingTestUser(false);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/debug-auth');
      const data = await response.json();
      setDebugInfo(data);
      setShowDebug(true);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setError('Failed to check authentication status');
    }
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
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <button 
              onClick={fillTestCredentials}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              type="button"
            >
              Fill test credentials
            </button>
            <button 
              onClick={initializeTestUser}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              type="button"
              disabled={initializingTestUser}
            >
              {initializingTestUser ? 'Initializing...' : 'Initialize new test user'}
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {testUserInitialized && '✓ Test account is ready to use'}
            {initializingTestUser && 'Initializing test account...'}
          </div>
        </div>
        
        {/* Auth Debug Section */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-700">Auth Debug</h3>
            <div className="flex gap-2">
              <button 
                onClick={checkAuthStatus}
                className="text-xs text-blue-600 hover:text-blue-700"
                type="button"
              >
                Check Auth Status
              </button>
              <button 
                onClick={() => setShowAdvancedDebug(!showAdvancedDebug)}
                className="text-xs text-purple-600 hover:text-purple-700"
                type="button"
              >
                {showAdvancedDebug ? 'Hide Advanced Debug' : 'Show Advanced Debug'}
              </button>
            </div>
          </div>
          
          {user && (
            <div className="mt-2 p-2 bg-green-50 text-sm rounded">
              <p><strong>Logged in as:</strong> {user.username} ({user.email})</p>
              <p><strong>User ID:</strong> {user.id}</p>
            </div>
          )}
          
          {showDebug && debugInfo && (
            <div className="mt-2 text-xs">
              <p><strong>Auth Cookies:</strong></p>
              <pre className="bg-gray-100 p-2 mt-1 rounded overflow-auto max-h-32">
                {JSON.stringify(debugInfo.cookies, null, 2)}
              </pre>
              
              {debugInfo.userDetails && (
                <>
                  <p className="mt-2"><strong>User Details:</strong></p>
                  <pre className="bg-gray-100 p-2 mt-1 rounded overflow-auto max-h-32">
                    {JSON.stringify(debugInfo.userDetails, null, 2)}
                  </pre>
                </>
              )}
            </div>
          )}
          
          {/* Advanced Auth Debug Component */}
          {showAdvancedDebug && <AuthDebug />}
        </div>
      </div>
    </div>
  );
}