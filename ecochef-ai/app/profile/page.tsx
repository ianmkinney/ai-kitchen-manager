'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

// Define interfaces for our data structure
interface UserPreferences {
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isNutFree: boolean;
  maxCookingTime: number;
  cookingSkillLevel: string;
  peopleCount: number;
  cuisinePreferences: string[];
  flavorPreferences: string[];
  healthGoals: string[];
  allergies: string[];
  sustainabilityPreference: string;
  nutritionFocus: string[];
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserPreferences();
  }, []);

  // Fetch user preferences from Supabase
  const fetchUserPreferences = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .single();

      if (error) {
        // Handle common database errors
        if (error.code === '42P01') {
          setError('Database tables not initialized yet. Please run the Supabase setup script.');
          return;
        }
        
        // Not found error is ok for new users
        if (error.code === 'PGRST116') {
          setError('No preferences found. Please complete the dietary quiz first.');
          setIsLoading(false);
          return;
        }

        throw error;
      }

      setPreferences(data as UserPreferences);
    } catch (error) {
      console.error('Error fetching preferences:', error);
      setError('There was an error loading your preferences. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to format arrays for display
  const formatArrayForDisplay = (arr: string[] | undefined) => {
    if (!arr || arr.length === 0) return 'None';
    return arr.map(item => item.replace(/-/g, ' ')).join(', ');
  };

  // Helper function to format booleans for display
  const formatBoolean = (value: boolean | undefined) => {
    return value ? 'Yes' : 'No';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Personal Profile</h1>
        <Link href="/preferences/quiz" className="btn-primary">
          Update Preferences
        </Link>
      </div>

      {error && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-8">
          <p className="font-bold">Notice</p>
          <p>{error}</p>
          {error.includes('No preferences found') && (
            <div className="mt-4">
              <Link href="/preferences/quiz" className="btn-primary">
                Take the Dietary Quiz
              </Link>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading your preferences...</p>
        </div>
      ) : preferences ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="card">
            <h2 className="text-xl font-semibold mb-4">Dietary Restrictions</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Vegetarian:</span>
                <span className="font-medium">{formatBoolean(preferences.isVegetarian)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Vegan:</span>
                <span className="font-medium">{formatBoolean(preferences.isVegan)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gluten-Free:</span>
                <span className="font-medium">{formatBoolean(preferences.isGlutenFree)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Dairy-Free:</span>
                <span className="font-medium">{formatBoolean(preferences.isDairyFree)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Nut-Free:</span>
                <span className="font-medium">{formatBoolean(preferences.isNutFree)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Allergies:</span>
                <span className="font-medium">{formatArrayForDisplay(preferences.allergies)}</span>
              </div>
            </div>
          </section>

          <section className="card">
            <h2 className="text-xl font-semibold mb-4">Cooking Preferences</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Max Cooking Time:</span>
                <span className="font-medium">{preferences.maxCookingTime} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cooking Skill:</span>
                <span className="font-medium">{preferences.cookingSkillLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Serving Size:</span>
                <span className="font-medium">{preferences.peopleCount} people</span>
              </div>
            </div>
          </section>

          <section className="card">
            <h2 className="text-xl font-semibold mb-4">Flavor & Cuisine Preferences</h2>
            <div className="space-y-3">
              <div className="flex flex-col">
                <span className="text-gray-600">Preferred Cuisines:</span>
                <span className="font-medium mt-1">{formatArrayForDisplay(preferences.cuisinePreferences)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-600">Flavor Preferences:</span>
                <span className="font-medium mt-1">{formatArrayForDisplay(preferences.flavorPreferences)}</span>
              </div>
            </div>
          </section>

          <section className="card">
            <h2 className="text-xl font-semibold mb-4">Health & Nutrition</h2>
            <div className="space-y-3">
              <div className="flex flex-col">
                <span className="text-gray-600">Health Goals:</span>
                <span className="font-medium mt-1">{formatArrayForDisplay(preferences.healthGoals)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-600">Nutrition Focus:</span>
                <span className="font-medium mt-1">{formatArrayForDisplay(preferences.nutritionFocus)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sustainability Priority:</span>
                <span className="font-medium">{preferences.sustainabilityPreference}</span>
              </div>
            </div>
          </section>

          <section className="col-span-1 md:col-span-2 card">
            <h2 className="text-xl font-semibold mb-4">Your AI-Powered Nutrition Insights</h2>
            <p className="text-gray-600">
              Based on your preferences, we recommend focusing on meals that are:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {preferences.isVegetarian && <li>Rich in plant-based proteins like legumes and tofu</li>}
              {preferences.isGlutenFree && <li>Centered around naturally gluten-free grains like rice and quinoa</li>}
              {preferences.isDairyFree && <li>Using nutritious dairy alternatives like almond or oat milk</li>}
              {preferences.healthGoals?.includes('weight-loss') && <li>Lower in calories but high in nutrients</li>}
              {preferences.healthGoals?.includes('muscle-gain') && <li>Higher in protein with complex carbohydrates</li>}
              {preferences.healthGoals?.includes('energy') && <li>Balanced with complex carbs for sustained energy</li>}
              {preferences.nutritionFocus?.includes('high-protein') && <li>Focused on quality protein sources</li>}
              {preferences.nutritionFocus?.includes('low-carb') && <li>Emphasizing vegetables and healthy fats</li>}
              <li>Quick to prepare (under {preferences.maxCookingTime} minutes)</li>
              <li>Suitable for your {preferences.cookingSkillLevel} cooking skill level</li>
            </ul>
            <div className="mt-6">
              <Link href="/meal-planning" className="btn-secondary">
                Get Personalized Meal Plans
              </Link>
            </div>
          </section>
        </div>
      ) : null}

      <div className="mt-12 text-center">
        <p className="text-sm text-gray-500">
          Last updated: {preferences?.updatedAt ? new Date(preferences.updatedAt).toLocaleDateString() : 'Never'}
        </p>
      </div>
    </div>
  );
} 