'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface UserPreferences {
  id: string;
  userId: string;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isNutFree: boolean;
  maxCookingTime: number | null;
  cookingSkillLevel: string | null;
  // Add other fields as needed
}

export default function QuizResults() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await fetch('/api/preferences');
        if (response.ok) {
          const data = await response.json();
          setPreferences(data.preferences);
          
          // Remove automatic API call on load
          // if (data.preferences) {
          //   getAiSuggestions(data.preferences);
          // }
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  const getAiSuggestions = async (preferences: UserPreferences) => {
    try {
      setAiLoading(true);
      setAiError(null);
      setAiSuggestions(''); // Clear previous suggestions
      
      console.log('Requesting AI suggestions with preferences:', preferences);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Based on these dietary preferences, suggest 3 healthy meal options and some general nutrition advice.`,
          preferences: preferences // Explicitly pass preferences as a separate property
        }),
        signal: AbortSignal.timeout(30000), // 30 seconds timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('AI response received:', data);
        setAiSuggestions(data.response);
      } else {
        console.error('API returned error status:', response.status);
        setAiError('Failed to get meal suggestions. Please try again.');
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      setAiError('Error generating meal suggestions. The request may have timed out.');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Your Dietary Profile</h1>
        <Link href="/meal-planning" className="btn-primary">
          Start Planning Meals
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="card">
          <h2 className="text-xl font-semibold mb-4">Your Preferences</h2>
          
          {preferences ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Dietary Restrictions:</h3>
                <ul className="list-disc list-inside ml-4">
                  {preferences.isVegetarian && <li>Vegetarian</li>}
                  {preferences.isVegan && <li>Vegan</li>}
                  {preferences.isGlutenFree && <li>Gluten-Free</li>}
                  {preferences.isDairyFree && <li>Dairy-Free</li>}
                  {!preferences.isVegetarian && !preferences.isVegan && 
                   !preferences.isGlutenFree && !preferences.isDairyFree && 
                   <li>No specific restrictions</li>}
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium">Cooking Time Preference:</h3>
                <p>Up to {preferences.maxCookingTime} minutes</p>
              </div>
              
              <Link href="/preferences/edit" className="btn-secondary block text-center">
                Edit Preferences
              </Link>
            </div>
          ) : (
            <p>No preferences found. Take the quiz to set your preferences.</p>
          )}
        </section>

        <section className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">AI Recommendations</h2>
            {preferences && !aiLoading && (
              <button 
                onClick={() => getAiSuggestions(preferences)}
                className="btn-secondary text-sm px-3 py-1"
              >
                Get New Ideas
              </button>
            )}
          </div>
          
          <div className="prose">
            {aiLoading ? (
              <div className="flex flex-col items-center space-y-4 py-6">
                <p>Generating personalized recommendations...</p>
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : aiError ? (
              <div className="text-red-500">
                <p>{aiError}</p>
                <button 
                  onClick={() => preferences && getAiSuggestions(preferences)}
                  className="btn-primary mt-4"
                >
                  Try Again
                </button>
              </div>
            ) : aiSuggestions ? (
              <div dangerouslySetInnerHTML={{ __html: aiSuggestions.replace(/\n/g, '<br>') }} />
            ) : (
              <p className="text-center italic">Click &quot;Get New Ideas&quot; to generate meal suggestions</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}