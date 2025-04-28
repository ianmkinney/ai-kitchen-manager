'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import AiDisclaimer from '../components/AiDisclaimer';
// Remove direct Supabase import as we'll use the API routes
// import { supabase } from '../lib/supabase';

// Define pantry item interface
interface PantryItem {
  id: string;
  itemName: string;
  userid: string;
  createdAt: string;
  updatedAt: string;
}

// Define shopping suggestion interfaces
interface ShoppingItemSuggestion {
  name: string;
  category: string;
  reason: string;
}

interface RecipeIdea {
  name: string;
  ingredients: string[];
  description: string;
}

interface ShoppingSuggestion {
  shoppingListSuggestions: ShoppingItemSuggestion[];
  recipeIdeas: RecipeIdea[];
}

export default function Pantry() {
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<ShoppingSuggestion | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPantryItem, setNewPantryItem] = useState('');

  // Load pantry items on component mount
  useEffect(() => {
    fetchPantryItems();
  }, []);

  // Fetch pantry items from API route instead of directly from Supabase
  const fetchPantryItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use API route instead of direct Supabase call
      const response = await fetch('/api/pantry', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch pantry items');
      }

      const data = await response.json();
      setPantryItems(data.pantryItems || []);
    } catch (error) {
      console.error('Error fetching pantry items:', error);
      setError('There was an error loading your pantry items. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Add item to pantry
  const addPantryItem = async () => {
    if (!newPantryItem.trim()) return;
    
    try {
      // Use API route instead of direct Supabase client
      const response = await fetch('/api/pantry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newPantryItem.trim()
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add item');
      }
      
      // Refresh the pantry items list
      fetchPantryItems();
      setNewPantryItem('');
    } catch (error) {
      console.error('Error adding pantry item:', error);
      setError('There was an error adding the item. Please check your connection and try again.');
    }
  };

  // Remove item from pantry
  const removePantryItem = async (itemName: string) => {
    try {
      // Find the item ID based on name
      const item = pantryItems.find(item => item.itemName === itemName);
      if (!item) {
        console.error('Item not found:', itemName);
        return;
      }
      
      // Use API route instead of direct Supabase client
      const response = await fetch(`/api/pantry?id=${item.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove item');
      }
      
      // Refresh the pantry items
      fetchPantryItems();
    } catch (error) {
      console.error('Error removing pantry item:', error);
      setError('There was an error removing the item. Please try again later.');
    }
  };

  // Get AI shopping suggestions from dedicated API
  const getAiSuggestions = async () => {
    setIsGenerating(true);
    setAiSuggestions(null);
    setError(null);
    
    try {
      const response = await fetch('/api/shopping/suggestions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get suggestions');
      }
      
      const data = await response.json();
      setAiSuggestions(data);
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      setError('Sorry, there was an error getting shopping suggestions. Please try again later.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Clear all pantry items
  const clearAllPantryItems = async () => {
    if (!confirm("Are you sure you want to remove ALL items from your pantry?")) {
      return;
    }
    
    try {
      const response = await fetch('/api/pantry/clear', {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear pantry');
      }
      
      // Refresh the pantry items
      fetchPantryItems();
    } catch (error) {
      console.error('Error clearing pantry:', error);
      setError('There was an error clearing your pantry. Please try again later.');
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Inventory Section */}
        <section className="card md:col-span-1">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">My Pantry</h2>
            {pantryItems.length > 0 && (
              <button 
                className="text-red-500 hover:text-red-700 text-sm font-medium"
                onClick={clearAllPantryItems}
              >
                Clear All Items
              </button>
            )}
          </div>
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              placeholder="Add new item..."
              className="input-field flex-1"
              value={newPantryItem}
              onChange={(e) => setNewPantryItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPantryItem()}
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
                <li key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                  <span>{item.itemName}</span>
                  <button 
                    onClick={() => removePantryItem(item.itemName)}
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
          <AiDisclaimer className="mb-4" />
          <p className="text-sm text-gray-600 mb-4">
            Get a personalized shopping list based on what&apos;s missing from your pantry and your dietary preferences.
          </p>
          
          <button 
            className={`btn-primary w-full mb-4 ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={getAiSuggestions}
            disabled={isGenerating || !!error}
          >
            {isGenerating ? 'Generating Shopping List...' : 'Get Shopping List'}
          </button>
          
          <div className="bg-gray-50 rounded-lg p-4 min-h-[300px] overflow-y-auto">
            {aiSuggestions ? (
              <div>
                <h3 className="text-lg font-semibold mb-2">Suggested Shopping List</h3>
                {aiSuggestions.shoppingListSuggestions.length > 0 ? (
                  <div className="space-y-4">
                    {/* Group suggestions by category */}
                    {Array.from(new Set(aiSuggestions.shoppingListSuggestions.map(item => item.category))).map(category => (
                      <div key={category} className="mb-3">
                        <h4 className="font-medium text-sm border-b pb-1 mb-2">{category}</h4>
                        <ul className="pl-4 space-y-2">
                          {aiSuggestions.shoppingListSuggestions
                            .filter(item => item.category === category)
                            .map((item, index) => (
                              <li key={index} className="text-sm">
                                <span className="font-medium">{item.name}</span>
                                <p className="text-xs text-gray-600 mt-1">{item.reason}</p>
                              </li>
                            ))
                          }
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No shopping suggestions available.</p>
                )}
                
                {aiSuggestions.recipeIdeas && aiSuggestions.recipeIdeas.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="text-lg font-semibold mb-2">Recipe Ideas With These Ingredients</h3>
                    <div className="space-y-3">
                      {aiSuggestions.recipeIdeas.map((recipe, index) => (
                        <div key={index} className="bg-white p-3 rounded-lg shadow-sm">
                          <h4 className="font-medium text-base">{recipe.name}</h4>
                          <p className="text-xs text-gray-600 mt-1">{recipe.description}</p>
                          <div className="mt-2">
                            <span className="text-xs font-medium">Ingredients: </span>
                            <span className="text-xs">{recipe.ingredients.join(', ')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center mt-32">
                {error ? 'Please fix the database setup first.' 
                  : 'Click the button above to get AI shopping suggestions'}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}