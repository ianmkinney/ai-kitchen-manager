'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Pantry() {
  const [pantryItems, setPantryItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load pantry items on component mount
  useEffect(() => {
    fetchPantryItems();
  }, []);

  // Fetch pantry items from Supabase
  const fetchPantryItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('pantry_items')
        .select('*')
        .order('createdAt', { ascending: false });

      // Handle common database errors
      if (error) {
        console.error('Database error:', error);
        
        // Table doesn't exist yet
        if (error.code === '42P01') {
          setError('Database tables not initialized yet. Please run the Supabase setup script.');
          setPantryItems([]);
          return;
        }
        
        // Column doesn't exist (common with camelCase issues)
        if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
          setError('Database schema mismatch. Please re-initialize the database with the correct column names.');
          setPantryItems([]);
          return;
        }
        
        throw error;
      }

      setPantryItems(data?.map(item => item.name) || []);
    } catch (error) {
      console.error('Error fetching pantry items:', error);
      setError('There was an error loading your pantry items. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Add item to pantry
  const addPantryItem = async () => {
    if (!newItem.trim()) return;
    
    try {
      const { error } = await supabase
        .from('pantry_items')
        .insert([{ 
          name: newItem.trim(),
          // Use anonymous user ID if needed
          userId: '00000000-0000-0000-0000-000000000000'
        }]);

      if (error) {
        console.error('Error adding item:', error);
        
        // Handle column name mismatch
        if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
          setError('Database schema mismatch. Column names may be incorrect. Please reinitialize the database.');
          return;
        }
        
        throw error;
      }
      
      setPantryItems([newItem.trim(), ...pantryItems]);
      setNewItem('');
    } catch (error) {
      console.error('Error adding pantry item:', error);
      setError('There was an error adding the item. Please make sure your database is set up correctly.');
    }
  };

  // Remove item from pantry
  const removePantryItem = async (itemToRemove: string) => {
    try {
      const { error } = await supabase
        .from('pantry_items')
        .delete()
        .match({ name: itemToRemove });

      if (error) throw error;
      
      setPantryItems(pantryItems.filter(item => item !== itemToRemove));
    } catch (error) {
      console.error('Error removing pantry item:', error);
      setError('There was an error removing the item. Please try again later.');
    }
  };

  // Get AI shopping suggestions
  const getAiSuggestions = async () => {
    setIsGenerating(true);
    setAiSuggestions('');
    setError(null);
    
    try {
      // Get user preferences
      const { data: preferencesData, error: preferencesError } = await supabase
        .from('user_preferences')
        .select('*')
        .single();
      
      if (preferencesError && preferencesError.code !== 'PGRST116') {
        console.error('Error fetching preferences:', preferencesError);
      }
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Based on my current pantry items (${pantryItems.join(', ')}), what additional ingredients should I buy to make interesting meals? Please suggest 3-5 ingredients that would pair well with what I already have.`,
          preferences: preferencesData || {},
          pantryItems
        }),
      });
      
      if (!response.ok) throw new Error('Failed to get AI suggestions');
      
      const data = await response.json();
      setAiSuggestions(data.response);
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      setAiSuggestions('Sorry, there was an error getting AI suggestions. Please try again later.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Pantry Management</h1>
        <Link href="/" className="btn-secondary">
          Back to Home
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-8">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          {error.includes('schema mismatch') || error.includes('not initialized') ? (
            <div className="mt-2">
              <p className="font-semibold">To fix database issues:</p>
              <ol className="list-decimal ml-5 mt-1">
                <li>Run <code className="bg-gray-200 px-1 rounded">npm run supabase:manual</code> from the project root</li>
                <li>Follow the instructions to set up the database in the Supabase SQL Editor</li>
                <li>Make sure to use the <strong>exact SQL provided</strong> with proper column names</li>
                <li>Column names must use camelCase with double quotes in SQL (e.g., <code className="bg-gray-200 px-1 rounded">&quot;createdAt&quot;</code>)</li>
              </ol>
            </div>
          ) : null}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Inventory Section */}
        <section className="card md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Current Inventory</h2>
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              placeholder="Add new item..."
              className="input-field"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPantryItem()}
              disabled={!!error?.includes('not initialized') || !!error?.includes('schema mismatch')}
            />
            <button 
              className="btn-primary whitespace-nowrap"
              onClick={addPantryItem}
              disabled={!!error?.includes('not initialized') || !!error?.includes('schema mismatch')}
            >
              Add Item
            </button>
          </div>
          
          {isLoading ? (
            <div className="p-8 text-center">Loading pantry items...</div>
          ) : pantryItems.length > 0 ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pantryItems.map((item) => (
                <li key={item} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                  <span>{item}</span>
                  <button 
                    onClick={() => removePantryItem(item)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 text-center text-gray-500">
              {error ? 'Please fix the database setup first.' : 'No items in your pantry yet. Add some ingredients to get started!'}
            </div>
          )}
        </section>

        {/* AI Shopping Assistant */}
        <section className="card">
          <h2 className="text-xl font-semibold mb-4">AI Shopping Assistant</h2>
          <p className="text-sm text-gray-600 mb-4">
            Get personalized suggestions for ingredients to buy based on what&apos;s already in your pantry and your dietary preferences.
          </p>
          
          <button 
            className={`btn-primary w-full mb-4 ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={getAiSuggestions}
            disabled={isGenerating || pantryItems.length === 0 || !!error}
          >
            {isGenerating ? 'Generating Suggestions...' : 'Get Shopping Suggestions'}
          </button>
          
          <div className="bg-gray-50 rounded-lg p-4 min-h-[300px]">
            {aiSuggestions ? (
              <div className="whitespace-pre-line">{aiSuggestions}</div>
            ) : (
              <p className="text-gray-500 text-center mt-32">
                {error ? 'Please fix the database setup first.' 
                  : pantryItems.length === 0 
                  ? 'Add items to your pantry first'
                  : 'Click the button above to get AI suggestions'}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
} 