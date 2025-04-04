"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface UserPreferences {
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  cuisine: string;
  peopleCount: number;
  maxCookingTime: number;
}

export default function MealPlanning() {
  // State for query and AI response
  const [query, setQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // State for user preferences
  const [preferences, setPreferences] = useState<UserPreferences>({
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    isDairyFree: false,
    cuisine: 'Any',
    peopleCount: 2,
    maxCookingTime: 30
  });
  
  // Load saved preferences on component mount
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await fetch('/api/preferences');
        if (response.ok) {
          const data = await response.json();
          if (data.preferences) {
            setPreferences({
              isVegetarian: data.preferences.isVegetarian || false,
              isVegan: data.preferences.isVegan || false,
              isGlutenFree: data.preferences.isGlutenFree || false,
              isDairyFree: data.preferences.isDairyFree || false,
              cuisine: data.preferences.cuisine || 'Any',
              peopleCount: data.preferences.peopleCount || 2,
              maxCookingTime: data.preferences.maxCookingTime || 30
            });
          }
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
      }
    };

    fetchPreferences();
  }, []);
  
  // Handle preference changes
  const handlePreferenceChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setPreferences(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Save preferences
  const savePreferences = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ preferences })
      });
      
      if (response.ok) {
        alert('Preferences saved successfully!');
      } else {
        alert('Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('An error occurred while saving preferences');
    }
  };

  // Get meal ideas from Claude AI
  const handleGetMealIdeas = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setAiResponse('');
    
    try {
      console.log('Sending request with query:', query);
      console.log('Sending preferences:', preferences);
      
      // Call the chat API with preferences and query
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: query,
          preferences: preferences
        }),
      });
      
      // Read the response as text first to debug
      const responseText = await response.text();
      console.log('Raw API response:', responseText);
      
      // Try to parse the response as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        throw new Error('Invalid response format from server');
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get meal suggestions');
      }
      
      setAiResponse(data.response || 'No suggestions available');
    } catch (error) {
      console.error('Error fetching meal suggestions:', error);
      setAiResponse(`Sorry, there was an error getting meal suggestions: ${error.message}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Meal Planning</h1>
        <Link href="/" className="btn-secondary">
          Back to Home
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Preferences Section */}
        <section className="card">
          <h2 className="text-xl font-semibold mb-4">Your Preferences</h2>
          <form className="space-y-4" onSubmit={savePreferences}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Dietary Restrictions
                </label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="isVegetarian"
                      checked={preferences.isVegetarian}
                      onChange={handlePreferenceChange}
                      className="mr-2"
                    />
                    Vegetarian
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="isVegan"
                      checked={preferences.isVegan}
                      onChange={handlePreferenceChange}
                      className="mr-2"
                    />
                    Vegan
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="isGlutenFree"
                      checked={preferences.isGlutenFree}
                      onChange={handlePreferenceChange}
                      className="mr-2"
                    />
                    Gluten-Free
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="isDairyFree"
                      checked={preferences.isDairyFree}
                      onChange={handlePreferenceChange}
                      className="mr-2"
                    />
                    Dairy-Free
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Cooking Time (minutes)
                </label>
                <select 
                  name="maxCookingTime"
                  className="input-field"
                  value={preferences.maxCookingTime}
                  onChange={handlePreferenceChange}
                >
                  <option value="15">Quick (15 mins)</option>
                  <option value="30">Medium (30 mins)</option>
                  <option value="60">Long (60 mins)</option>
                  <option value="120">Any duration</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Number of People
                </label>
                <select 
                  name="peopleCount"
                  className="input-field"
                  value={preferences.peopleCount}
                  onChange={handlePreferenceChange}
                >
                  <option value="1">1 person</option>
                  <option value="2">2 people</option>
                  <option value="4">4 people</option>
                  <option value="6">6+ people</option>
                </select>
              </div>
              
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Cuisine Preference
                </label>
                <select 
                  name="cuisine"
                  className="input-field"
                  value={preferences.cuisine}
                  onChange={handlePreferenceChange}
                >
                  <option value="Any">Any Cuisine</option>
                  <option value="Italian">Italian</option>
                  <option value="Mexican">Mexican</option>
                  <option value="Asian">Asian</option>
                  <option value="Mediterranean">Mediterranean</option>
                  <option value="Indian">Indian</option>
                  <option value="American">American</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full">
              Save Preferences
            </button>
          </form>
        </section>

        {/* AI Suggestion Section */}
        <section className="card">
          <h2 className="text-xl font-semibold mb-4">AI Meal Suggestions</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Ask for meal suggestions..."
                className="input-field"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleGetMealIdeas();
                  }
                }}
              />
              <button 
                className="btn-primary whitespace-nowrap"
                onClick={(e) => {
                  e.preventDefault();
                  handleGetMealIdeas();
                }}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Get Ideas'}
              </button>
            </div>
            <div className="h-64 bg-gray-50 rounded-lg p-4 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                </div>
              ) : aiResponse ? (
                <div className="whitespace-pre-line">{aiResponse}</div>
              ) : (
                <p className="text-gray-500 text-center mt-20">
                  Ask AI for personalized meal suggestions!
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Weekly Plan Section */}
      <section className="mt-8 card">
        <h2 className="text-xl font-semibold mb-4">Your Weekly Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">{day}</h3>
              <button className="btn-secondary w-full text-sm">
                Add Meal
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
} 