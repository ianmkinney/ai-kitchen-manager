"use client";

import { useState } from 'react';

export default function DatabaseSetup() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; error?: string; message?: string } | null>(null);
  const [token, setToken] = useState('');

  const setupDatabase = async () => {
    try {
      setIsLoading(true);
      setResult(null);

      // First run setup-db which executes schema and initializes test user
      const response = await fetch('/api/setup-db', {
        headers: {
          'x-admin-token': token || process.env.NEXT_PUBLIC_ADMIN_SETUP_TOKEN || 'ecochef-setup-91a8c3e7f0d2'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult({
          success: true,
          message: data.message || 'Database setup completed successfully'
        });
      } else {
        setResult({
          success: false,
          error: data.error || 'Database setup failed',
          message: data.details ? JSON.stringify(data.details) : 'Unknown error'
        });
      }
    } catch (error) {
      console.error('Error setting up database:', error);
      setResult({
        success: false,
        error: 'Exception occurred',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">Database Setup</h2>
      <p className="mb-4 text-gray-700">
        This tool will initialize your Supabase database with the required schema and create a test user.
        You&apos;ll need the admin setup token to perform this operation.
      </p>
      
      <div className="mb-4">
        <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
          Admin Setup Token
        </label>
        <input
          type="password"
          id="token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Enter your admin setup token"
          className="w-full p-2 border border-gray-300 rounded-md"
        />
        <p className="text-xs text-gray-500 mt-1">
          Default: ecochef-setup-91a8c3e7f0d2 (but can be changed in .env)
        </p>
      </div>
      
      <button
        onClick={setupDatabase}
        disabled={isLoading}
        className={`w-full py-2 px-4 rounded-md text-white font-medium ${
          isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isLoading ? 'Setting up database...' : 'Set Up Database'}
      </button>
      
      {result && (
        <div className={`mt-4 p-4 rounded-md ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
          <h3 className={`font-bold ${result.success ? 'text-green-700' : 'text-red-700'}`}>
            {result.success ? 'Success!' : 'Error'}
          </h3>
          {result.message && <p className="mt-1 text-sm">{result.message}</p>}
          {result.error && <p className="mt-1 text-sm text-red-600">{result.error}</p>}
          
          {result.success && (
            <div className="mt-3 pt-3 border-t border-green-200">
              <p className="text-sm text-green-800">
                Test user credentials:
                <br />
                Email: test@ecochef.demo
                <br />
                Password: password123
              </p>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-6 text-sm text-gray-600">
        <h3 className="font-semibold">Troubleshooting:</h3>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Make sure your Supabase credentials are correctly set in your .env file</li>
          <li>Ensure your service role key has the necessary permissions</li>
          <li>Check that you&apos;re using the correct admin setup token</li>
          <li>If issues persist, check the console for detailed error messages</li>
        </ul>
      </div>
    </div>
  );
} 