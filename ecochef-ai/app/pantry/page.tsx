'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import AiDisclaimer from '../components/AiDisclaimer';
// Import required Supabase functions
import { createClientComponentClient } from '../lib/supabase';

// Define pantry item interface
interface PantryItem {
  id: string;
  itemName: string;
  userid: string;
  createdAt: string;
  updatedAt: string;
}

// Function to create a Supabase client
const createSupabaseClient = () => {
  return createClientComponentClient();
};

// Function to get the current user ID from cookies
const getCurrentUserFromCookies = () => {
  // Get user ID from cookies (ecochef_user_id)
  const cookies = document.cookie.split(';');
  const userIdCookie = cookies.find(cookie => cookie.trim().startsWith('ecochef_user_id='));
  const userId = userIdCookie ? userIdCookie.split('=')[1] : null;
  
  // Also check for test user
  const testUserCookie = cookies.find(cookie => cookie.trim().startsWith('ecochef_test_user='));
  const testUserIdCookie = cookies.find(cookie => cookie.trim().startsWith('ecochef_test_user_id='));
  const testUserId = testUserIdCookie ? testUserIdCookie.split('=')[1] : null;
  
  // Return the appropriate user ID
  if (userId) {
    return userId;
  } else if (testUserCookie && testUserId === '00000000-0000-0000-0000-000000000000') {
    return '00000000-0000-0000-0000-000000000000';
  }
  
  return null;
};

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

// Define shopping list item interface
interface ShoppingListItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  isChecked: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export default function Pantry() {
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<ShoppingSuggestion | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPantryItem, setNewPantryItem] = useState('');
  
  // Shopping List States
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [isLoadingShoppingList, setIsLoadingShoppingList] = useState(true);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkEditText, setBulkEditText] = useState('');
  const [newShoppingItem, setNewShoppingItem] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('General');
  
  // State for weekly plan shopping list
  const [weeklyPlanShoppingList, setWeeklyPlanShoppingList] = useState<ShoppingListItem[]>([]);
  const [isLoadingWeeklyList, setIsLoadingWeeklyList] = useState(false);
  
  // Ref for the bulk edit textarea to focus when showing
  const bulkEditRef = useRef<HTMLTextAreaElement>(null);

  // State for shopping list tabs
  const [activeTab, setActiveTab] = useState<'regular' | 'weeklyPlan'>('regular');

  // Load pantry items and shopping list on component mount
  useEffect(() => {
    fetchPantryItems();
    fetchShoppingList();
    fetchWeeklyPlanShoppingList();
  }, []);

  // Focus bulk edit textarea when shown
  useEffect(() => {
    if (showBulkEdit && bulkEditRef.current) {
      bulkEditRef.current.focus();
    }
  }, [showBulkEdit]);

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

  // Fetch shopping list items from API route
  const fetchShoppingList = async () => {
    setIsLoadingShoppingList(true);
    setError(null);
    try {
      // Use API route instead of direct Supabase call
      const response = await fetch('/api/shopping/direct', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // If no shopping list exists (404 or empty), just set empty array instead of error
        if (response.status === 404 || response.status === 401) {
          setShoppingList([]);
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch shopping list');
      }

      const data = await response.json();
      console.log('Fetched shopping list:', data);
      setShoppingList(data.shoppingItems || []);
    } catch (error) {
      console.error('Error fetching shopping list:', error);
      // Don't show error for missing shopping list, just set empty array
      setShoppingList([]);
    } finally {
      setIsLoadingShoppingList(false);
    }
  };

  // Fetch weekly plan shopping list
  const fetchWeeklyPlanShoppingList = async () => {
    setIsLoadingWeeklyList(true);
    
    try {
      // Call the API endpoint to generate the shopping list with a cache-busting timestamp
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/shopping/weekly-list?t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate shopping list: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Convert to ShoppingListItem format
      const formattedList = (data.shoppingList || []).map((item: { name: string; category?: string }, index: number) => ({
        id: `weekly-${index}`, // Generate a temporary ID
        name: item.name,
        category: item.category || 'Other',
        quantity: 1,
        unit: 'item',
        isChecked: false,
        userId: 'current',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      
      // Set the shopping list state with the returned data
      setWeeklyPlanShoppingList(formattedList);
      
      // Log the results for debugging
      console.log('Weekly plan shopping list generated:', formattedList.length, 'items');
    } catch (error) {
      console.error('Error generating weekly plan shopping list:', error);
      setError('Failed to generate weekly plan shopping list. Please try again.');
    } finally {
      setIsLoadingWeeklyList(false);
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

  // Add item to shopping list
  const addShoppingItem = async () => {
    if (!newShoppingItem.trim()) return;
    
    try {
      // Use Supabase client directly
      const supabase = createSupabaseClient();
      
      // Get the current user ID from cookies
      const userId = getCurrentUserFromCookies();
      
      if (!userId) {
        throw new Error('You must be logged in to add items to your shopping list');
      }
      
      // Add the item
      const { error } = await supabase
        .from('ShoppingListItem')
        .insert({
          name: newShoppingItem.trim(),
          category: newItemCategory,
          quantity: 1,
          unit: 'item',
          isChecked: false,
          userId: userId
        });
      
      if (error) {
        throw new Error(error.message || 'Failed to add item');
      }
      
      console.log('Added shopping item successfully');
      
      // Clear input and refresh the list
      setNewShoppingItem('');
      fetchShoppingList();
    } catch (error) {
      console.error('Error adding shopping item:', error);
      setError('There was an error adding the item. Please try again later.');
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

  // Remove item from shopping list
  const removeShoppingItem = async (id: string) => {
    try {
      // Use the direct API endpoint with Supabase
      const supabase = createSupabaseClient();
      
      // Get the current user ID from cookies
      const userId = getCurrentUserFromCookies();
      
      if (!userId) {
        throw new Error('You must be logged in to remove items from your shopping list');
      }
      
      const { error } = await supabase
        .from('ShoppingListItem')
        .delete()
        .eq('id', id)
        .eq('userId', userId); // Make sure we only delete the user's own items
      
      if (error) {
        throw new Error(error.message || 'Failed to remove item');
      }
      
      // Update the local state without fetching again
      setShoppingList(prevList => prevList.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error removing shopping item:', error);
      setError('There was an error removing the item. Please try again later.');
    }
  };

  // Toggle checked status of shopping list item
  const toggleShoppingItemChecked = async (id: string, isCurrentlyChecked: boolean) => {
    try {
      // Use the direct API endpoint with Supabase
      const supabase = createSupabaseClient();
      
      // Get the current user ID from cookies
      const userId = getCurrentUserFromCookies();
      
      if (!userId) {
        throw new Error('You must be logged in to update your shopping list');
      }
      
      const { error } = await supabase
        .from('ShoppingListItem')
        .update({ isChecked: !isCurrentlyChecked })
        .eq('id', id)
        .eq('userId', userId); // Make sure we only update the user's own items
      
      if (error) {
        throw new Error(error.message || 'Failed to update item');
      }
      
      // Update the local state without fetching again
      setShoppingList(prevList => 
        prevList.map(item => 
          item.id === id ? { ...item, isChecked: !isCurrentlyChecked } : item
        )
      );
    } catch (error) {
      console.error('Error updating shopping item:', error);
      setError('There was an error updating the item. Please try again later.');
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

  // Clear all checked items from shopping list
  const clearCheckedItems = async () => {
    const checkedItems = shoppingList.filter(item => item.isChecked);
    if (checkedItems.length === 0) return;
    
    if (!confirm(`Are you sure you want to remove ${checkedItems.length} checked items?`)) {
      return;
    }
    
    try {
      // Use the direct API endpoint with Supabase
      const supabase = createSupabaseClient();
      
      // Get the current user ID from cookies
      const userId = getCurrentUserFromCookies();
      
      if (!userId) {
        throw new Error('You must be logged in to update your shopping list');
      }
      
      // Delete all checked items in one query
      const { error } = await supabase
        .from('ShoppingListItem')
        .delete()
        .in('id', checkedItems.map(item => item.id))
        .eq('userId', userId); // Make sure we only delete the user's own items
      
      if (error) {
        throw new Error(error.message || 'Failed to remove checked items');
      }
      
      // Update the local state to remove all checked items
      setShoppingList(prevList => prevList.filter(item => !item.isChecked));
    } catch (error) {
      console.error('Error clearing checked items:', error);
      setError('There was an error removing checked items. Please try again later.');
    }
  };

  // Save bulk edited shopping list
  const saveBulkEditedList = async () => {
    try {
      // Parse the text into items
      const lines = bulkEditText.split('\n').filter(line => line.trim());
      
      // Get Supabase client
      const supabase = createSupabaseClient();
      
      // Get the current user ID from cookies
      const userId = getCurrentUserFromCookies();
      
      if (!userId) {
        throw new Error('You must be logged in to edit your shopping list');
      }
      
      // First delete all existing items
      const { error: deleteError } = await supabase
        .from('ShoppingListItem')
        .delete()
        .in('id', shoppingList.map(item => item.id))
        .eq('userId', userId); // Make sure we only delete the user's own items
      
      if (deleteError) {
        throw new Error(`Error deleting existing items: ${deleteError.message}`);
      }
      
      if (lines.length === 0) {
        // If no new items, just end here
        setShowBulkEdit(false);
        // Update local state
        setShoppingList([]);
        return;
      }
      
      // Prepare new items
      const newItems = lines.map(line => {
        const trimmedLine = line.trim();
        // Simple category detection: if line has colon, first part is category
        let name = trimmedLine;
        let category = 'General';
        
        if (trimmedLine.includes(':')) {
          const parts = trimmedLine.split(':');
          category = parts[0].trim();
          name = parts[1].trim();
        }
        
        return {
          name,
          category,
          quantity: 1,
          unit: 'item',
          isChecked: false,
          userId: userId
        };
      });
      
      // Insert all new items
      const { data: insertedItems, error: insertError } = await supabase
        .from('ShoppingListItem')
        .insert(newItems)
        .select();
      
      if (insertError) {
        throw new Error(`Error adding new items: ${insertError.message}`);
      }
      
      // Update local state with the new items
      setShoppingList(insertedItems || []);
      setShowBulkEdit(false);
    } catch (error) {
      console.error('Error saving bulk edited list:', error);
      setError('There was an error saving your shopping list. Please try again later.');
    }
  };

  // Prepare bulk edit text from current shopping list
  const prepareBulkEditText = () => {
    // Group items by category
    const groupedItems: Record<string, string[]> = {};
    
    shoppingList.forEach(item => {
      if (!groupedItems[item.category]) {
        groupedItems[item.category] = [];
      }
      groupedItems[item.category].push(item.name);
    });
    
    // Format as Category: item per line
    let text = '';
    Object.entries(groupedItems).forEach(([category, items]) => {
      items.forEach(item => {
        text += `${category}: ${item}\n`;
      });
    });
    
    setBulkEditText(text);
    setShowBulkEdit(true);
  };

  // Copy the weekly plan items to the regular shopping list
  const copyWeeklyPlanToShoppingList = async () => {
    try {
      // Only add unchecked items
      const itemsToAdd = weeklyPlanShoppingList
        .filter(item => !item.isChecked)
        .map(item => ({
          name: item.name,
          category: item.category || 'Other'
        }));
      
      if (itemsToAdd.length === 0) {
        alert('No items to add to your shopping list');
        return;
      }
      
      // Use the server-side API endpoint instead of direct Supabase access
      const response = await fetch('/api/shopping/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: itemsToAdd }),
        credentials: 'include', // Include credentials to send cookies
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add items to shopping list');
      }
      
      const data = await response.json();
      console.log(`Added ${data.addedCount || 'all'} items to shopping list`);
      
      // Refresh the shopping list
      await fetchShoppingList();
      
      // Show success message
      alert(`Added ${itemsToAdd.length} items to your shopping list`);
      
      // Switch to the regular tab
      setActiveTab('regular');
    } catch (error) {
      console.error('Error adding items to shopping list:', error);
      alert(`Failed to add items to shopping list: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Copy all shopping list items to clipboard
  const copyToClipboard = (listType: 'regular' | 'weeklyPlan') => {
    const list = listType === 'regular' ? shoppingList : weeklyPlanShoppingList;
    
    // Group items by category and create formatted text
    const categories = Array.from(new Set(list.map(item => item.category)));
    let text = '';
    
    categories.forEach(category => {
      const categoryItems = list.filter(item => item.category === category);
      text += `${category}:\n`;
      categoryItems.forEach(item => {
        text += `- ${item.name}${item.isChecked ? ' (✓)' : ''}\n`;
      });
      text += '\n';
    });
    
    // Copy to clipboard
    navigator.clipboard.writeText(text.trim())
      .then(() => alert('Shopping list copied to clipboard!'))
      .catch(err => {
        console.error('Failed to copy list:', err);
        alert('Failed to copy list to clipboard.');
      });
  };

  // Export shopping list as a text file
  const exportAsTxt = (listType: 'regular' | 'weeklyPlan') => {
    const list = listType === 'regular' ? shoppingList : weeklyPlanShoppingList;
    
    // Group items by category and create formatted text
    const categories = Array.from(new Set(list.map(item => item.category)));
    let text = 'EcoChef Shopping List\n\n';
    
    categories.forEach(category => {
      const categoryItems = list.filter(item => item.category === category);
      text += `${category}:\n`;
      categoryItems.forEach(item => {
        text += `- ${item.name}${item.isChecked ? ' (completed)' : ''}\n`;
      });
      text += '\n';
    });
    
    // Create and download file
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopping-list-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Toggle checked status for weekly plan items
  const toggleWeeklyItemChecked = (id: string, isCurrentlyChecked: boolean) => {
    setWeeklyPlanShoppingList(prev => 
      prev.map(item => 
        item.id === id ? { ...item, isChecked: !isCurrentlyChecked } : item
      )
    );
  };

  // Regular Shopping List Tab content
  const renderRegularShoppingListContent = () => {
    if (showBulkEdit) {
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg mb-4">
            <p className="text-sm text-blue-800">
              Edit your shopping list below. Each item should be on a new line.
              You can add categories by using the format: Category: Item
            </p>
          </div>
          <textarea
            ref={bulkEditRef}
            value={bulkEditText}
            onChange={(e) => setBulkEditText(e.target.value)}
            className="w-full h-[300px] border p-3 rounded resize-none"
            placeholder="Format: Category: Item&#10;Example:&#10;Produce: Spinach&#10;Produce: Carrots&#10;Dairy: Milk"
          />
          <div className="flex justify-end space-x-3 mt-4">
            <button
              className="btn-secondary"
              onClick={() => setShowBulkEdit(false)}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={saveBulkEditedList}
            >
              Save List
            </button>
          </div>
        </div>
      );
    }

    if (isLoadingShoppingList) {
      return <div className="p-8 text-center">Loading shopping list...</div>;
    }

    if (shoppingList.length === 0) {
      return (
        <div className="p-8 text-center text-gray-500">
          Your shopping list is empty. Add some items to get started!
        </div>
      );
    }

    return (
      <div className="max-h-[60vh] overflow-y-auto">
        {/* Group by category and sort checked items to bottom */}
        {Array.from(new Set(shoppingList.map(item => item.category))).map(category => {
          const categoryItems = shoppingList.filter(item => item.category === category);
          // Sort unchecked items first
          const sortedItems = [...categoryItems].sort((a, b) => Number(a.isChecked) - Number(b.isChecked));
          
          return (
            <div key={category} className="mb-4">
              <h3 className="font-medium text-sm border-b pb-1 mb-2">{category}</h3>
              <ul className="pl-1">
                {sortedItems.map((item) => (
                  <li key={item.id} className="flex items-center py-1">
                    <input
                      type="checkbox"
                      checked={item.isChecked}
                      onChange={() => toggleShoppingItemChecked(item.id, item.isChecked)}
                      className="mr-2"
                    />
                    <span className={`flex-grow ${item.isChecked ? 'line-through text-gray-400' : ''}`}>
                      {item.name}
                    </span>
                    <button 
                      onClick={() => removeShoppingItem(item.id)}
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-truncate">Pantry Management</h1>
        <Link href="/" className="btn-secondary w-full sm:w-auto">
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
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4">
            <input
              type="text"
              placeholder="Add new item..."
              className="input-field flex-1 min-w-0"
              value={newPantryItem}
              onChange={(e) => setNewPantryItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPantryItem()}
            />
            <button 
              className="btn-primary w-full sm:w-auto"
              onClick={addPantryItem}
              disabled={!!error?.includes('not initialized') || !!error?.includes('schema mismatch')}
            >
              Add Item
            </button>
          </div>
          
          {isLoading ? (
            <div className="p-8 text-center">Loading pantry items...</div>
          ) : pantryItems.length > 0 ? (
            <ul className="space-y-2">
              {pantryItems.map((item) => (
                <li key={item.id} className="flex justify-between items-center bg-gray-50 p-2 sm:p-3 rounded-lg">
                  <span className="text-truncate flex-1 min-w-0 pr-2">{item.itemName}</span>
                  <button 
                    onClick={() => removePantryItem(item.itemName)}
                    className="btn-sm text-red-600 hover:text-red-800 flex-shrink-0"
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

        {/* Show Shopping List Button - Only show if shopping list is hidden */}
        {shoppingList.length === 0 && weeklyPlanShoppingList.length === 0 && activeTab !== 'regular' && activeTab !== 'weeklyPlan' && (
          <section className="card md:col-span-1">
            <h2 className="text-xl font-semibold mb-4">Shopping List</h2>
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No shopping list items yet.</p>
              <button 
                className="btn-primary"
                onClick={() => setActiveTab('regular')}
              >
                Start Shopping List
              </button>
            </div>
          </section>
        )}

        {/* Shopping List Section - Only show if there are items or user wants to add items */}
        {(shoppingList.length > 0 || weeklyPlanShoppingList.length > 0 || activeTab === 'regular' || activeTab === 'weeklyPlan') && (
        <section className="card md:col-span-1">
          <h2 className="text-xl font-semibold mb-4">Shopping List</h2>
          
          {/* Tab navigation */}
          <div className="border-b mb-4">
            <div className="flex space-x-2 sm:space-x-4 overflow-x-auto">
              <button 
                className={`pb-2 whitespace-nowrap text-sm sm:text-base ${activeTab === 'regular' ? 'border-b-2 border-blue-600 font-medium' : 'text-gray-500'}`}
                onClick={() => setActiveTab('regular')}
              >
                Regular List
              </button>
              <button 
                className={`pb-2 whitespace-nowrap text-sm sm:text-base ${activeTab === 'weeklyPlan' ? 'border-b-2 border-blue-600 font-medium' : 'text-gray-500'}`}
                onClick={() => setActiveTab('weeklyPlan')}
              >
                Weekly Plan List
              </button>
            </div>
          </div>
          
          {/* Regular Shopping List Tab */}
          {activeTab === 'regular' && (
            <>
              {!showBulkEdit && (
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-6">
                  <input
                    type="text"
                    value={newShoppingItem}
                    onChange={(e) => setNewShoppingItem(e.target.value)}
                    placeholder="Add new shopping item..."
                    className="input-field flex-1 min-w-0"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addShoppingItem();
                    }}
                  />
                  <select 
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="input-field w-full sm:w-auto min-w-0"
                  >
                    <option value="General">General</option>
                    <option value="Produce">Produce</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Meat">Meat</option>
                    <option value="Pantry">Pantry</option>
                    <option value="Frozen">Frozen</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Other">Other</option>
                  </select>
                  <button 
                    className="btn-primary w-full sm:w-auto"
                    onClick={addShoppingItem}
                  >
                    Add
                  </button>
                </div>
              )}
              
              {!showBulkEdit && (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                  <div className="flex flex-wrap gap-2">
                    <button 
                      className="btn-sm text-blue-600 hover:text-blue-800"
                      onClick={prepareBulkEditText}
                    >
                      Bulk Edit
                    </button>
                    <button 
                      className="btn-sm text-red-600 hover:text-red-800"
                      onClick={clearCheckedItems}
                      disabled={!shoppingList.some(item => item.isChecked)}
                    >
                      Clear Checked
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      className="btn-sm text-blue-600 hover:text-blue-800"
                      onClick={() => copyToClipboard('regular')}
                    >
                      Copy List
                    </button>
                    <button 
                      className="btn-sm text-green-600 hover:text-green-800"
                      onClick={() => exportAsTxt('regular')}
                    >
                      Export
                    </button>
                  </div>
                </div>
              )}
              
              {renderRegularShoppingListContent()}
            </>
          )}
          
          {/* Weekly Plan Shopping List Tab */}
          {activeTab === 'weeklyPlan' && (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                <button 
                  className={`btn-primary w-full sm:w-auto ${isLoadingWeeklyList ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={fetchWeeklyPlanShoppingList}
                  disabled={isLoadingWeeklyList}
                >
                  {isLoadingWeeklyList ? 'Refreshing...' : 'Refresh List'}
                </button>
                {weeklyPlanShoppingList.length > 0 && (
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <button 
                      className="btn-sm text-blue-600 hover:text-blue-800"
                      onClick={() => copyToClipboard('weeklyPlan')}
                    >
                      Copy List
                    </button>
                    <button 
                      className="btn-sm text-green-600 hover:text-green-800"
                      onClick={() => exportAsTxt('weeklyPlan')}
                    >
                      Export
                    </button>
                    <button 
                      className="btn-secondary text-sm"
                      onClick={copyWeeklyPlanToShoppingList}
                    >
                      Add to Shopping List
                    </button>
                  </div>
                )}
              </div>
              
              {isLoadingWeeklyList ? (
                <div className="p-8 text-center">Loading meal plan shopping list...</div>
              ) : weeklyPlanShoppingList.length > 0 ? (
                <div className="max-h-[60vh] overflow-y-auto">
                  <div className="bg-blue-50 p-2 rounded mb-4">
                    <p className="text-sm text-blue-800">
                      These items are needed for your weekly meal plan. Check them as you shop, or add them to your regular shopping list.
                    </p>
                  </div>
                  
                  {/* Group by category and sort checked items to bottom */}
                  {Array.from(new Set(weeklyPlanShoppingList.map(item => item.category))).map(category => {
                    const categoryItems = weeklyPlanShoppingList.filter(item => item.category === category);
                    // Sort unchecked items first
                    const sortedItems = [...categoryItems].sort((a, b) => Number(a.isChecked) - Number(b.isChecked));
                    
                    return (
                      <div key={category} className="mb-4">
                        <h3 className="font-medium text-sm border-b pb-1 mb-2">{category}</h3>
                        <ul className="pl-1">
                          {sortedItems.map((item) => (
                            <li key={item.id} className="flex items-center py-1">
                              <input
                                type="checkbox"
                                checked={item.isChecked}
                                onChange={() => toggleWeeklyItemChecked(item.id, item.isChecked)}
                                className="mr-2 flex-shrink-0"
                              />
                              <span className={`text-truncate flex-1 min-w-0 ${item.isChecked ? 'line-through text-gray-400' : ''}`}>
                                {item.name}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <p>No items needed for your weekly meal plan.</p>
                  <p className="mt-2 text-sm">Create a meal plan first in the Meal Planning section, then generate a shopping list there.</p>
                </div>
              )}
            </>
          )}
        </section>
        )}

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
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">{item.name}</span>
                                  <button
                                    className="text-blue-600 hover:text-blue-800 text-xs"
                                    onClick={async () => {
                                      try {
                                        const supabase = createSupabaseClient();
                                        
                                        // Get the current user ID from cookies
                                        const userId = getCurrentUserFromCookies();
                                        
                                        if (!userId) {
                                          throw new Error('You must be logged in to add items to your shopping list');
                                        }
                                        
                                        // Add the suggested item to the shopping list
                                        const { error } = await supabase
                                          .from('ShoppingListItem')
                                          .insert({
                                            name: item.name,
                                            category: item.category,
                                            quantity: 1,
                                            unit: 'item',
                                            isChecked: false,
                                            userId: userId // Use user ID from cookies
                                          });
                                          
                                        if (error) {
                                          throw new Error(error.message);
                                        }
                                        
                                        // Update UI state to show the item was added
                                        alert(`Added ${item.name} to shopping list`);
                                        
                                        // Refresh the shopping list
                                        fetchShoppingList();
                                      } catch (error) {
                                        console.error('Error adding item to shopping list:', error);
                                        alert('Could not add item to shopping list');
                                      }
                                    }}
                                  >
                                    Add to List
                                  </button>
                                </div>
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