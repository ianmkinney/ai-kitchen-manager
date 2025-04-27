'use client';

import { useState, useEffect } from 'react';

interface StorageItems {
  [key: string]: unknown;
}

export default function AuthDebug() {
  const [cookies, setCookies] = useState<string>('');
  const [sessionStorage, setSessionStorage] = useState<StorageItems>({});
  const [localStorage, setLocalStorage] = useState<StorageItems>({});

  useEffect(() => {
    // Get all cookies
    setCookies(document.cookie);

    // Get auth-related items from localStorage
    const localStorageItems: StorageItems = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && (key.includes('auth') || key.includes('supabase'))) {
        try {
          const value = window.localStorage.getItem(key);
          localStorageItems[key] = value ? JSON.parse(value) : value;
        } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
          localStorageItems[key] = window.localStorage.getItem(key);
        }
      }
    }
    setLocalStorage(localStorageItems);

    // Get auth-related items from sessionStorage
    const sessionStorageItems: StorageItems = {};
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key && (key.includes('auth') || key.includes('supabase'))) {
        try {
          const value = window.sessionStorage.getItem(key);
          sessionStorageItems[key] = value ? JSON.parse(value) : value;
        } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
          sessionStorageItems[key] = window.sessionStorage.getItem(key);
        }
      }
    }
    setSessionStorage(sessionStorageItems);
  }, []);

  const clearAuthData = () => {
    // Clear all cookies
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    });

    // Clear local storage auth items
    for (const key in localStorage) {
      window.localStorage.removeItem(key);
    }

    // Clear session storage auth items
    for (const key in sessionStorage) {
      window.sessionStorage.removeItem(key);
    }

    // Refresh the component
    window.location.reload();
  };

  return (
    <div className="mt-6 pt-6 border-t border-gray-200 text-sm">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-gray-700">Auth Debug</h3>
        <button 
          onClick={clearAuthData}
          className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
          type="button"
        >
          Clear All Auth Data
        </button>
      </div>
      
      <div className="mt-4">
        <h4 className="font-medium">Cookies:</h4>
        <pre className="bg-gray-100 p-2 mt-1 rounded overflow-auto max-h-32 text-xs">
          {cookies || 'No cookies found'}
        </pre>
      </div>
      
      <div className="mt-4">
        <h4 className="font-medium">Local Storage (Auth):</h4>
        <pre className="bg-gray-100 p-2 mt-1 rounded overflow-auto max-h-32 text-xs">
          {Object.keys(localStorage).length > 0 
            ? JSON.stringify(localStorage, null, 2) 
            : 'No auth data in local storage'}
        </pre>
      </div>
      
      <div className="mt-4">
        <h4 className="font-medium">Session Storage (Auth):</h4>
        <pre className="bg-gray-100 p-2 mt-1 rounded overflow-auto max-h-32 text-xs">
          {Object.keys(sessionStorage).length > 0 
            ? JSON.stringify(sessionStorage, null, 2) 
            : 'No auth data in session storage'}
        </pre>
      </div>
    </div>
  );
} 