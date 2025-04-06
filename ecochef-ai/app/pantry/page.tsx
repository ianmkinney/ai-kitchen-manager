'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type PantryItem = {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
};

type ShoppingItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  isChecked: boolean;
};

type ShoppingSuggestion = {
  name: string;
  category: string;
  reason: string;
};

type RecipeIdea = {
  name: string;
  ingredients: string[];
  description: string;
};

export default function Pantry() {
  const router = useRouter();
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [newPantryItem, setNewPantryItem] = useState('');
  const [newShoppingItem, setNewShoppingItem] = useState('');
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<{
    shoppingListSuggestions: ShoppingSuggestion[];
    recipeIdeas: RecipeIdea[];
  } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch pantry items and shopping list on component mount
  useEffect(() => {
    const fetchPantryData = async () => {
      try {
        setLoading(true);
        
        // Fetch pantry items
        const pantryRes = await fetch('/api/pantry');
        if (pantryRes.ok) {
          const data = await pantryRes.json();
          setPantryItems(data.pantryItems || []);
        }
        
        // Fetch shopping list
        const shoppingRes = await fetch('/api/shopping');
        if (shoppingRes.ok) {
          const data = await shoppingRes.json();
          setShoppingItems(data.shoppingItems || []);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching pantry data:', error);
        setLoading(false);
      }
    };
    
    fetchPantryData();
  }, []);

  // Add item to pantry
  const addPantryItem = async () => {
    if (!newPantryItem.trim()) return;
    
    try {
      const res = await fetch('/api/pantry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newPantryItem
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setPantryItems([data.pantryItem, ...pantryItems]);
        setNewPantryItem('');
      }
    } catch (error) {
      console.error('Error adding pantry item:', error);
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
          isChecked: !isChecked
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

  // Remove pantry item
  const removePantryItem = async (id: string) => {
    try {
      const res = await fetch(`/api/pantry?id=${id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setPantryItems(pantryItems.filter(item => item.id !== id));
      }
    } catch (error) {
      console.error('Error deleting pantry item:', error);
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Pantry Management</h1>
        <Link href="/" className="btn-secondary">
          Back to Home
        </Link>
      </div>

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
            >
              Add Item
            </button>
          </div>
          
          {loading ? (
            <div className="p-4 text-center">Loading pantry items...</div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4">
              {pantryItems.length > 0 ? (
                <ul className="space-y-2">
                  {pantryItems.map(item => (
                    <li key={item.id} className="flex justify-between items-center p-2 bg-white rounded-md">
                      <span>{item.name}</span>
                      <button 
                        onClick={() => removePantryItem(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✖
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Your pantry is empty. Add some ingredients!
                </p>
              )}
            </div>
          )}
        </section>

        {/* Shopping List Section */}
        <section className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Shopping List</h2>
            <button 
              className="text-sm text-blue-600 hover:text-blue-800"
              onClick={getShoppingSuggestions}
              disabled={loading}
            >
              Get Suggestions
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Add item to list..."
                className="input-field flex-1"
                value={newShoppingItem}
                onChange={(e) => setNewShoppingItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addShoppingItem()}
              />
              <button 
                className="btn-primary whitespace-nowrap"
                onClick={addShoppingItem}
              >
                Add
              </button>
            </div>
            
            {/* Shopping List */}
            <div className="h-96 bg-gray-50 rounded-lg p-4 overflow-y-auto">
              {loading ? (
                <p className="text-gray-500 text-center mt-32">Loading...</p>
              ) : showSuggestions && suggestions ? (
                <div>
                  <div className="mb-4">
                    <h3 className="font-medium text-lg mb-2">Suggested Items to Buy</h3>
                    <ul className="space-y-2">
                      {suggestions.shoppingListSuggestions.map((item, i) => (
                        <li key={i} className="p-2 bg-white rounded shadow-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-medium">{item.name}</span> 
                              <span className="text-xs ml-2 text-gray-500">({item.category})</span>
                              <p className="text-xs text-gray-600 mt-1">{item.reason}</p>
                            </div>
                            <button 
                              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 py-1 px-2 rounded"
                              onClick={() => addSuggestionToShoppingList(item)}
                            >
                              Add to List
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="mt-6">
                    <h3 className="font-medium text-lg mb-2">Recipe Ideas</h3>
                    <ul className="space-y-3">
                      {suggestions.recipeIdeas.map((recipe, i) => (
                        <li key={i} className="p-2 bg-white rounded shadow-sm">
                          <div className="font-medium">{recipe.name}</div>
                          <div className="text-xs text-gray-600 mt-1">
                            <span className="font-medium">Ingredients:</span> {recipe.ingredients.join(', ')}
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{recipe.description}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <button 
                    className="mt-4 w-full py-2 text-sm text-gray-600 hover:text-gray-800"
                    onClick={() => setShowSuggestions(false)}
                  >
                    Back to Shopping List
                  </button>
                </div>
              ) : shoppingItems.length > 0 ? (
                <ul className="space-y-2">
                  {shoppingItems.map(item => (
                    <li key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          checked={item.isChecked}
                          onChange={() => toggleShoppingItem(item.id, item.isChecked)}
                          className="h-4 w-4"
                        />
                        <span className={item.isChecked ? 'line-through text-gray-400' : ''}>
                          {item.name}
                        </span>
                      </div>
                      <button 
                        onClick={() => removeShoppingItem(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✖
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-center mt-32">
                  Your shopping list is empty
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
} 