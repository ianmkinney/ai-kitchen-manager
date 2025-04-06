'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '../lib/supabase';

export default function Signup() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate passwords match
    if (passcode !== confirmPasscode) {
      setError('Passcodes do not match');
      return;
    }
    
    // Validate passcode length
    if (passcode.length < 6) {
      setError('Passcode must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    
    try {
      const supabase = createBrowserClient();
      
      // Create a unique email address that won't be used but satisfies Supabase requirements
      // Using a UUID to ensure it's unique and can't be guessed
      const uniqueId = crypto.randomUUID();
      const dummyEmail = `${uniqueId}@ecochef.internal`;
      
      // Register with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: dummyEmail,
        password: passcode,
        options: {
          data: {
            username: username,
          },
        },
      });
      
      if (error) {
        throw error;
      }
      
      // Check if user was created
      if (data && data.user) {
        // Create initial user profile in the database
        await supabase.from('User').insert([
          { 
            id: data.user.id,
            email: dummyEmail,
            name: username,
          }
        ]);
        
        // Redirect to preferences quiz
        router.push('/preferences/quiz');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <div className="card">
        <h1 className="text-2xl font-bold text-center mb-6">Create Account</h1>
        
        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-md mb-6">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSignup} className="space-y-4">
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
              placeholder="Choose a username"
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
              placeholder="Choose a passcode"
            />
            <p className="text-sm text-gray-500 mt-1">At least 6 characters</p>
          </div>
          
          <div>
            <label htmlFor="confirmPasscode" className="block text-sm font-medium mb-1">
              Confirm Passcode
            </label>
            <input
              id="confirmPasscode"
              type="password"
              value={confirmPasscode}
              onChange={(e) => setConfirmPasscode(e.target.value)}
              className="input-field w-full"
              required
              placeholder="Confirm your passcode"
            />
          </div>
          
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p>Already have an account?</p>
          <Link href="/login" className="text-primary-600 font-medium">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
} 