'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Define pantry item interface
interface PantryItem {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// Define a type for shopping items
interface ShoppingItem {
  id: string;
  name: string;
  isChecked: boolean;
}

// Define the ShoppingSuggestion type
interface ShoppingSuggestion {
  name: string;
  category: string;
}

// Define recipe interface
interface Recipe {
  name: string;
  ingredients: string[];
  instructions: string[];
}

export default function Pantry() {
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPantryItem, setNewPantryItem] = useState('');
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [newShoppingItem, setNewShoppingItem] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]); // Add state for recipes

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

      setPantryItems(data?.map(item => item) || []);
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
      const item = pantryItems.find(item => item.name === itemName);
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

  // Get AI shopping suggestions
  const getAiSuggestions = async () => {
    setIsGenerating(true);
    setAiSuggestions('');
    setError(null);
    
    try {
      // Extract names from pantry items
      const pantryNames = pantryItems.map(item => item.name);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Here are the items in my pantry: ${pantryNames.join(', ')}. 
          What should I buy next? Please suggest 5-10 items I might need based on what I already have.`,
          pantryItems: pantryNames
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get suggestions');
      }
      
      const data = await response.json();
      setAiSuggestions(data.response || 'No suggestions available.');
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      setAiSuggestions('Sorry, there was an error getting suggestions. Please try again later.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Add item to shopping list
  const addShoppingItem = async () => {
    if (!newShoppingItem.trim()) return;
    
    try {
      const res = await fetch('/api/shopping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newShoppingItem,
          category: 'Other'
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setShoppingItems([...shoppingItems, data.shoppingItem]);
        setNewShoppingItem('');
      }
    } catch (error) {
      console.error('Error adding shopping item:', error);
    }
  };

  // Toggle shopping item check status
  const toggleShoppingItem = async (id: string, isChecked: boolean) => {
    try {
      const res = await fetch('/api/shopping', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          isChecked: !isChecked,
        }),
      });

      if (res.ok) {
        setShoppingItems(
          shoppingItems.map(item =>
            item.id === id ? { ...item, isChecked: !isChecked } : item
          )
        );
      }
    } catch (error) {
      console.error('Error updating shopping item:', error);
    }
  };

  // Remove shopping item
  const removeShoppingItem = async (id: string) => {
    try {
      const res = await fetch(`/api/shopping?id=${id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setShoppingItems(shoppingItems.filter(item => item.id !== id));
      }
    } catch (error) {
      console.error('Error deleting shopping item:', error);
    }
  };

  // Get shopping suggestions
  const getShoppingSuggestions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/shopping/suggestions');
      
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(true);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error getting shopping suggestions:', error);
      setLoading(false);
    }
  };

  // Add suggestion to shopping list
  const addSuggestionToShoppingList = async (suggestion: ShoppingSuggestion) => {
    try {
      const res = await fetch('/api/shopping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: suggestion.name,
          category: suggestion.category
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setShoppingItems([...shoppingItems, data.shoppingItem]);
      }
    } catch (error) {
      console.error('Error adding suggestion to shopping list:', error);
    }
  };

  // Fetch and display recipes
  const getRecipes = async () => {
    try {
      setIsGenerating(true);
      const response = await fetch('/api/recipes/suggestions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRecipes(data); // Store recipes in state
      } else {
        console.error('Error fetching recipes:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
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
          <h2 className="text-xl font-semibold mb-4">My Pantry</h2>
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
                  <span>{item.name}</span>
                  <button 
                    onClick={() => removePantryItem(item.name)}
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

        {/* AI Recipe Suggestions */}
        <section className="card">
          <h2 className="text-xl font-semibold mb-4">AI Recipe Suggestions</h2>
          <p className="text-sm text-gray-600 mb-4">
            Get personalized recipe suggestions based on your pantry items.
          </p>

          <button
            className={`btn-primary w-full mb-4 ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={getRecipes}
            disabled={isGenerating || pantryItems.length === 0 || !!error}
          >
            {isGenerating ? 'Fetching Recipes...' : 'Get Recipe Suggestions'}
          </button>

          <div className="bg-gray-50 rounded-lg p-4 min-h-[300px]">
            {recipes.length > 0 ? (
              <ul className="space-y-4">
                {recipes.map((recipe, index) => (
                  <li key={index} className="p-4 border rounded-lg shadow-sm">
                    <h3 className="text-lg font-bold mb-2">{recipe.name}</h3>
                    <p className="text-sm font-semibold">Ingredients:</p>
                    <ul className="list-disc list-inside mb-2">
                      {recipe.ingredients && recipe.ingredients.map((ingredient, i) => (
                        <li key={i}>{ingredient}</li>
                      ))}
                    </ul>
                    <p className="text-sm font-semibold">Instructions:</p>
                    <ol className="list-decimal list-inside">
                      {recipe.instructions && recipe.instructions.map((instruction, i) => (
                        <li key={i}>{instruction}</li>
                      ))}
                    </ol>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-center mt-32">
                {error ? 'Please fix the database setup first.' : 'Click the button above to get recipe suggestions'}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}