'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface UserPreferences {
  id: string;
  user_id: string;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  is_dairy_free: boolean;
  is_nut_free: boolean;
  max_cooking_time: number | null;
  cooking_skill_level: string | null;
  spicy_preference: number | null;
  sweet_preference: number | null;
  savory_preference: number | null;
  cuisine: string | null;
  people_count: number | null;
  preferred_cuisines: string[] | null;
  diet_goals: string[] | null;
  allergies: string[] | null;
  disliked_ingredients: string[] | null;
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
        // Fetch preferences from our API
        const response = await fetch('/api/preferences');
        
        if (!response.ok) {
          throw new Error('Failed to fetch preferences');
        }
        
        const data = await response.json();
        
        if (data.preferences) {
          setPreferences(data.preferences);
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
      
      // Ensure preferences are in snake_case format for the API
      const prefCopy = { ...preferences };
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Based on these dietary preferences, suggest 3 healthy meal options and some general nutrition advice.`,
          preferences: prefCopy
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
                  {preferences.is_vegetarian && <li>Vegetarian</li>}
                  {preferences.is_vegan && <li>Vegan</li>}
                  {preferences.is_gluten_free && <li>Gluten-Free</li>}
                  {preferences.is_dairy_free && <li>Dairy-Free</li>}
                  {preferences.is_nut_free && <li>Nut-Free</li>}
                  {!preferences.is_vegetarian && !preferences.is_vegan && 
                   !preferences.is_gluten_free && !preferences.is_dairy_free && 
                   !preferences.is_nut_free && 
                   <li>No specific restrictions</li>}
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium">Cooking Time Preference:</h3>
                <p>Up to {preferences.max_cooking_time} minutes</p>
              </div>
              
              <div>
                <h3 className="font-medium">Cooking Skill Level:</h3>
                <p className="capitalize">{preferences.cooking_skill_level || 'Intermediate'}</p>
              </div>
              
              <div>
                <h3 className="font-medium">Cuisine Preferences:</h3>
                <p>Favorite cuisine: <span className="font-medium">{preferences.cuisine || 'Any'}</span></p>
                {preferences.preferred_cuisines && preferences.preferred_cuisines.length > 0 && (
                  <div className="mt-1">
                    <p>Cuisines to explore:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {preferences.preferred_cuisines.map(cuisine => (
                        <span key={cuisine} className="px-2 py-1 bg-primary-100 text-primary-800 rounded-full text-sm">
                          {cuisine}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="font-medium">Meal Planning:</h3>
                <p>Typically cooking for {preferences.people_count || 2} people</p>
              </div>
              
              {preferences.allergies && preferences.allergies.length > 0 && (
                <div>
                  <h3 className="font-medium">Allergies/Sensitivities:</h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {preferences.allergies.map(allergy => (
                      <span key={allergy} className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                        {allergy}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {preferences.disliked_ingredients && preferences.disliked_ingredients.length > 0 && (
                <div>
                  <h3 className="font-medium">Disliked Ingredients:</h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {preferences.disliked_ingredients.map(ingredient => (
                      <span key={ingredient} className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                        {ingredient}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {preferences.diet_goals && preferences.diet_goals.length > 0 && (
                <div>
                  <h3 className="font-medium">Health/Diet Goals:</h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {preferences.diet_goals.map(goal => (
                      <span key={goal} className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                        {goal}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <h3 className="font-medium">Flavor Preferences:</h3>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="text-center">
                    <div className="font-medium">Spicy</div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-primary-600 h-2.5 rounded-full" 
                        style={{ width: `${(preferences.spicy_preference || 5) * 10}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">Sweet</div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-primary-600 h-2.5 rounded-full" 
                        style={{ width: `${(preferences.sweet_preference || 5) * 10}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">Savory</div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-primary-600 h-2.5 rounded-full" 
                        style={{ width: `${(preferences.savory_preference || 5) * 10}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <Link href="/preferences/quiz" className="btn-secondary block text-center">
                Update Preferences
              </Link>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="mb-4">No preferences found. Take the quiz to set your preferences.</p>
              <Link href="/preferences/quiz" className="btn-primary">
                Take Preferences Quiz
              </Link>
            </div>
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