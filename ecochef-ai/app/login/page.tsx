'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const success = await login(username, passcode);
      
      if (success) {
        router.push('/');
        router.refresh();
      } else {
        throw new Error('Invalid username or passcode');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <div className="card">
        <h1 className="text-2xl font-bold text-center mb-6">Login to EcoChef AI</h1>
        
        <div className="bg-blue-50 p-4 rounded-md mb-6 text-center">
          <p className="text-blue-700 font-medium mb-1">Test Account</p>
          <p className="text-blue-600">Username: <span className="font-mono">test</span></p>
          <p className="text-blue-600">Passcode: <span className="font-mono">123</span></p>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-md mb-6">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field w-full"
              required
              placeholder="Enter your username"
            />
          </div>
          
          <div>
            <label htmlFor="passcode" className="block text-sm font-medium mb-1">
              Passcode
            </label>
            <input
              id="passcode"
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="input-field w-full"
              required
              placeholder="Enter your passcode"
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
          <p>Just use the test account above.</p>
          <p className="text-sm text-gray-500 mt-2">This is a demo version with hardcoded credentials.</p>
        </div>
      </div>
    </div>
  );
} 