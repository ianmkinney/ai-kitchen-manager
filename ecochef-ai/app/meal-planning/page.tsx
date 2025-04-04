"use client";

import Link from 'next/link';
import { useState } from 'react';

export default function MealPlanning() {
  const [query, setQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGetMealIdeas = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setAiResponse('');
    
    try {
      const response = await fetch('/api/meal-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get meal suggestions');
      }
      
      const data = await response.json();
      setAiResponse(data.suggestions);
    } catch (error) {
      console.error('Error fetching meal suggestions:', error);
      setAiResponse('Sorry, there was an error getting meal suggestions. Please try again.');
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
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Dietary Restrictions
              </label>
              <select className="input-field">
                <option>None</option>
                <option>Vegetarian</option>
                <option>Vegan</option>
                <option>Gluten-Free</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Cooking Time Preference
              </label>
              <select className="input-field">
                <option>Quick (15-30 mins)</option>
                <option>Medium (30-60 mins)</option>
                <option>Any duration</option>
              </select>
            </div>
            <button type="submit" className="btn-primary w-full">
              Update Preferences
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