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

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await fetch('/api/preferences');
        if (response.ok) {
          const data = await response.json();
          setPreferences(data.preferences);
          
          // Get AI suggestions based on preferences
          if (data.preferences) {
            getAiSuggestions(data.preferences);
          }
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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Based on these dietary preferences: ${JSON.stringify(preferences)}, 
            suggest 3 healthy meal options and some general nutrition advice.`
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiSuggestions(data.response);
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
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
          <h2 className="text-xl font-semibold mb-4">AI Recommendations</h2>
          <div className="prose">
            {aiSuggestions ? (
              <div dangerouslySetInnerHTML={{ __html: aiSuggestions.replace(/\n/g, '<br>') }} />
            ) : (
              <p>Loading personalized recommendations...</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}