'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/auth-context';

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
  preferredCuisines: string[];
  dietGoals: string[];
  allergies: string[];
  spicyPreference: number;
  sweetPreference: number;
  savoryPreference: number;
  dietaryNotes: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempEditValue, setTempEditValue] = useState<string | number | string[]>('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Add a ref for the textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Fetch user preferences from API
    const fetchUserPreferences = async () => {
      setIsLoading(true);
      setError(null);
      
      if (!user) {
        setError('Please log in to view your preferences');
        setIsLoading(false);
        return;
      }
      
      try {
        const response = await fetch('/api/preferences');
        
        if (!response.ok) {
          if (response.status === 401) {
            setError('You are not authorized to view these preferences');
            setIsLoading(false);
            return;
          }
          
          if (response.status === 404) {
            setError('No preferences found. Please complete the dietary quiz first.');
            setIsLoading(false);
            return;
          }
          
          throw new Error(`API error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.preferences) {
          setError('No preferences found. Please complete the dietary quiz first.');
          setIsLoading(false);
          return;
        }
        
        const data = result.preferences;

        // Map the database response to our interface with the correct property names
        const mappedPreferences: UserPreferences = {
          isVegetarian: data.isVegetarian || false,
          isVegan: data.isVegan || false,
          isGlutenFree: data.isGlutenFree || false,
          isDairyFree: data.isDairyFree || false,
          isNutFree: data.isNutFree || false,
          maxCookingTime: data.maxCookingTime || 30,
          cookingSkillLevel: data.cookingSkillLevel || 'intermediate',
          peopleCount: data.peopleCount || 1,
          preferredCuisines: data.cuisinePreferences || [],
          dietGoals: data.healthGoals || [],
          allergies: data.allergies || [],
          spicyPreference: data.spicyPreference || 5,
          sweetPreference: data.sweetPreference || 5, 
          savoryPreference: data.savoryPreference || 5,
          dietaryNotes: data.dietaryNotes || '',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
        };

        setPreferences(mappedPreferences);
      } catch (error) {
        console.error('Error fetching preferences:', error);
        setError('There was an error loading your preferences. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchUserPreferences();
    } else {
      setIsLoading(false);
      setError('Please log in to view your preferences');
    }
  }, [user]);

  // Helper function to format arrays for display
  const formatArrayForDisplay = (arr: string[] | undefined) => {
    if (!arr || arr.length === 0) return 'None';
    return arr.map(item => item.replace(/-/g, ' ')).join(', ');
  };

  // Helper function to format booleans for display
  const formatBoolean = (value: boolean | undefined) => {
    return value ? 'Yes' : 'No';
  };

  const startEditing = (field: string, value: unknown) => {
    setEditingField(field);
    // Handle different types of values appropriately for the form
    if (typeof value === 'boolean') {
      setTempEditValue(value ? 'true' : 'false');
    } else if (typeof value === 'string' || typeof value === 'number') {
      setTempEditValue(value);
    } else if (Array.isArray(value)) {
      setTempEditValue(value as string[]);
    } else {
      // Default to empty string for unsupported types
      setTempEditValue('');
    }
  };

  const cancelEditing = () => {
    setEditingField(null);
    setTempEditValue('');
  };

  // Function to handle saving edited field
  const handleSaveField = async (fieldName: string) => {
    if (!preferences) return;
    setIsSaving(true);
    try {
      const updatedPreferences = { ...preferences };
      // Process the tempEditValue based on the field type
      let valueToSave: string | number | boolean | string[];
      // Handle different data types appropriately
      if ([
        'isVegetarian', 'isVegan', 'isGlutenFree', 'isDairyFree', 'isNutFree'
      ].includes(fieldName)) {
        // Convert string 'true'/'false' back to boolean for boolean fields
        valueToSave = tempEditValue === 'true';
      } else if ([
        'maxCookingTime', 'peopleCount', 'spicyPreference', 'sweetPreference', 'savoryPreference'
      ].includes(fieldName)) {
        // Ensure numbers are stored as numbers, not strings
        valueToSave = typeof tempEditValue === 'string' ? parseInt(tempEditValue, 10) : tempEditValue;
      } else if (Array.isArray(tempEditValue)) {
        valueToSave = tempEditValue;
      } else {
        valueToSave = tempEditValue as string;
      }
      // Update the preference object with the proper type
      (updatedPreferences as Record<string, unknown>)[fieldName] = valueToSave;
      
      // Prepare payload for API - use proper column casing for the database
      const payload: Record<string, unknown> = {};
      
      // Map the field names with proper casing for the database
      switch (fieldName) {
        case 'isVegetarian':
          payload["isVegetarian"] = valueToSave;
          break;
        case 'isVegan':
          payload["isVegan"] = valueToSave;
          break;
        case 'isGlutenFree':
          payload["isGlutenFree"] = valueToSave;
          break;
        case 'isDairyFree':
          payload["isDairyFree"] = valueToSave;
          break;
        case 'isNutFree':
          payload["isNutFree"] = valueToSave;
          break;
        case 'maxCookingTime':
          payload["maxCookingTime"] = valueToSave;
          break;
        case 'cookingSkillLevel': 
          payload["cookingSkillLevel"] = valueToSave;
          break;
        case 'peopleCount':
          payload["peopleCount"] = valueToSave;
          break;
        case 'preferredCuisines':
          payload["cuisinePreferences"] = valueToSave;
          break;
        case 'dietGoals':
          payload["healthGoals"] = valueToSave;
          break;
        case 'spicyPreference':
          payload["spicyPreference"] = valueToSave;
          break;
        case 'sweetPreference':
          payload["sweetPreference"] = valueToSave;
          break;
        case 'savoryPreference':
          payload["savoryPreference"] = valueToSave;
          break;
        case 'allergies':
          payload.allergies = valueToSave;
          break;
        case 'sustainabilityPreference':
          payload["sustainabilityPreference"] = valueToSave;
          break;
        case 'nutritionFocus':
          payload["nutritionFocus"] = valueToSave;
          break;
        default:
          payload[fieldName] = valueToSave;
      }
      
      // Call API to update preferences
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }
      // Update local state
      setPreferences(updatedPreferences);
    } catch (error) {
      console.error('Error updating preference:', error);
      alert('Failed to update preference. Please try again.');
    } finally {
      setIsSaving(false);
      setEditingField(null);
      setTempEditValue('');
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card text-center">
          <h1 className="text-2xl font-bold mb-4">Please Log In</h1>
          <p className="mb-6">You need to be logged in to view your profile.</p>
          <Link href="/login" className="btn-primary">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

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
              {/* Boolean fields */}
              {['isVegetarian', 'isVegan', 'isGlutenFree', 'isDairyFree', 'isNutFree'].map(field => {
                const label = field.replace('is', '').replace(/([A-Z])/g, ' $1').trim();
                const isEditing = editingField === field;
                const fieldValue = preferences[field as keyof UserPreferences] as boolean;
                
                return (
                  <div key={field} className="flex justify-between items-center">
                    <span className="text-gray-600">{label}:</span>
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <select 
                          value={typeof tempEditValue === 'string' ? tempEditValue : 'false'} 
                          onChange={(e) => setTempEditValue(e.target.value)}
                          className="border rounded p-1 text-sm"
                          autoFocus
                        >
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                        <button 
                          onClick={() => handleSaveField(field)}
                          disabled={isSaving}
                          className="text-green-600 hover:text-green-800 ml-2"
                        >
                          Save
                        </button>
                        <button 
                          onClick={cancelEditing}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <span className="font-medium">{formatBoolean(fieldValue)}</span>
                        <button 
                          onClick={() => startEditing(field, fieldValue)}
                          className="ml-2 text-gray-500 hover:text-gray-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Arrays field */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Allergies:</span>
                {editingField === 'allergies' ? (
                  <div className="flex items-center space-x-2">
                    <input 
                      type="text" 
                      value={Array.isArray(tempEditValue) ? tempEditValue.join(', ') : ''}
                      onChange={(e) => setTempEditValue(e.target.value.split(',').map(item => item.trim()))}
                      className="border rounded p-1 text-sm"
                      autoFocus
                    />
                    <button 
                      onClick={() => handleSaveField('allergies')}
                      disabled={isSaving}
                      className="text-green-600 hover:text-green-800 ml-2"
                    >
                      Save
                    </button>
                    <button 
                      onClick={cancelEditing}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span className="font-medium">{formatArrayForDisplay(preferences.allergies)}</span>
                    <button 
                      onClick={() => startEditing('allergies', preferences.allergies)}
                      className="ml-2 text-gray-500 hover:text-gray-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="card">
            <h2 className="text-xl font-semibold mb-4">Cooking Preferences</h2>
            <div className="space-y-3">
              {/* Number fields */}
              {[
                { field: 'maxCookingTime', label: 'Max Cooking Time (minutes)' },
                { field: 'peopleCount', label: 'Serving Size (people)' }
              ].map(item => {
                const isEditing = editingField === item.field;
                const fieldValue = preferences[item.field as keyof UserPreferences] as number;
                
                return (
                  <div key={item.field} className="flex justify-between items-center">
                    <span className="text-gray-600">{item.label}:</span>
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <input 
                          type="number" 
                          value={tempEditValue}
                          onChange={(e) => setTempEditValue(parseInt(e.target.value))}
                          className="border rounded p-1 text-sm w-20"
                          autoFocus
                        />
                        <button 
                          onClick={() => handleSaveField(item.field)}
                          disabled={isSaving}
                          className="text-green-600 hover:text-green-800 ml-2"
                        >
                          Save
                        </button>
                        <button 
                          onClick={cancelEditing}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <span className="font-medium">{fieldValue}</span>
                        <button 
                          onClick={() => startEditing(item.field, fieldValue)}
                          className="ml-2 text-gray-500 hover:text-gray-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Text field */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Cooking Skill:</span>
                {editingField === 'cookingSkillLevel' ? (
                  <div className="flex items-center space-x-2">
                    <select
                      value={tempEditValue}
                      onChange={(e) => setTempEditValue(e.target.value)}
                      className="border rounded p-1 text-sm"
                      autoFocus
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                    <button 
                      onClick={() => handleSaveField('cookingSkillLevel')}
                      disabled={isSaving}
                      className="text-green-600 hover:text-green-800 ml-2"
                    >
                      Save
                    </button>
                    <button 
                      onClick={cancelEditing}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span className="font-medium">{preferences.cookingSkillLevel}</span>
                    <button 
                      onClick={() => startEditing('cookingSkillLevel', preferences.cookingSkillLevel)}
                      className="ml-2 text-gray-500 hover:text-gray-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="card">
            <h2 className="text-xl font-semibold mb-4">Flavor & Cuisine Preferences</h2>
            <div className="space-y-3">
              {/* Arrays field */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Preferred Cuisines:</span>
                {editingField === 'preferredCuisines' ? (
                  <div className="flex items-center space-x-2">
                    <input 
                      type="text" 
                      value={Array.isArray(tempEditValue) ? tempEditValue.join(', ') : ''}
                      onChange={(e) => setTempEditValue(e.target.value.split(',').map(item => item.trim()))}
                      className="border rounded p-1 text-sm"
                      autoFocus
                    />
                    <button 
                      onClick={() => handleSaveField('preferredCuisines')}
                      disabled={isSaving}
                      className="text-green-600 hover:text-green-800 ml-2"
                    >
                      Save
                    </button>
                    <button 
                      onClick={cancelEditing}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span className="font-medium">{formatArrayForDisplay(preferences.preferredCuisines)}</span>
                    <button 
                      onClick={() => startEditing('preferredCuisines', preferences.preferredCuisines)}
                      className="ml-2 text-gray-500 hover:text-gray-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              
              {/* Number fields */}
              {[
                { field: 'spicyPreference', label: 'Spicy Preference (1-10)' },
                { field: 'sweetPreference', label: 'Sweet Preference (1-10)' },
                { field: 'savoryPreference', label: 'Savory Preference (1-10)' }
              ].map(item => {
                const isEditing = editingField === item.field;
                const fieldValue = preferences[item.field as keyof UserPreferences] as number;
                
                return (
                  <div key={item.field} className="flex justify-between items-center">
                    <span className="text-gray-600">{item.label}:</span>
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <input 
                          type="number" 
                          value={tempEditValue}
                          onChange={(e) => setTempEditValue(parseInt(e.target.value))}
                          min={1}
                          max={10}
                          className="border rounded p-1 text-sm w-20"
                          autoFocus
                        />
                        <button 
                          onClick={() => handleSaveField(item.field)}
                          disabled={isSaving}
                          className="text-green-600 hover:text-green-800 ml-2"
                        >
                          Save
                        </button>
                        <button 
                          onClick={cancelEditing}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <span className="font-medium">{fieldValue}/10</span>
                        <button 
                          onClick={() => startEditing(item.field, fieldValue)}
                          className="ml-2 text-gray-500 hover:text-gray-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card">
            <h2 className="text-xl font-semibold mb-4">Health & Nutrition</h2>
            <div className="space-y-3">
              {/* Arrays field */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Health Goals:</span>
                {editingField === 'dietGoals' ? (
                  <div className="flex items-center space-x-2">
                    <input 
                      type="text" 
                      value={Array.isArray(tempEditValue) ? tempEditValue.join(', ') : ''}
                      onChange={(e) => setTempEditValue(e.target.value.split(',').map(item => item.trim()))}
                      className="border rounded p-1 text-sm"
                      autoFocus
                    />
                    <button 
                      onClick={() => handleSaveField('dietGoals')}
                      disabled={isSaving}
                      className="text-green-600 hover:text-green-800 ml-2"
                    >
                      Save
                    </button>
                    <button 
                      onClick={cancelEditing}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span className="font-medium">{formatArrayForDisplay(preferences.dietGoals)}</span>
                    <button 
                      onClick={() => startEditing('dietGoals', preferences.dietGoals)}
                      className="ml-2 text-gray-500 hover:text-gray-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="col-span-1 md:col-span-2 card">
            <h2 className="text-xl font-semibold mb-4">Additional Dietary Notes</h2>
            <div className="space-y-3">
              {/* Textarea field */}
              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Notes:</span>
                  {editingField !== 'dietaryNotes' && (
                    <button 
                      onClick={() => startEditing('dietaryNotes', preferences.dietaryNotes)}
                      className="ml-2 text-gray-500 hover:text-gray-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}
                </div>
                
                {editingField === 'dietaryNotes' ? (
                  <div className="w-full">
                    <textarea
                      ref={textareaRef}
                      value={tempEditValue || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setTempEditValue(value);
                      }}
                      className="border rounded p-2 text-base w-full"
                      rows={6}
                      autoFocus
                    />
                    <div className="flex justify-end mt-2 space-x-2">
                      <button 
                        onClick={() => handleSaveField('dietaryNotes')}
                        disabled={isSaving}
                        className="text-green-600 hover:text-green-800 px-2 py-1 text-sm border border-green-600 rounded"
                      >
                        Save
                      </button>
                      <button 
                        onClick={cancelEditing}
                        className="text-gray-600 hover:text-gray-800 px-2 py-1 text-sm border border-gray-300 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full bg-gray-50 p-3 rounded-lg min-h-[80px] whitespace-pre-wrap">
                    {preferences.dietaryNotes ? preferences.dietaryNotes : 
                      <span className="text-gray-400">No additional dietary notes provided</span>
                    }
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-2">
                  Use this space to add any additional dietary information or preferences not covered by the quiz.
                  This information will be used to personalize your recipe suggestions.
                </p>
              </div>
            </div>
          </section>

          <section className="col-span-1 md:col-span-2 card">
            <h2 className="text-xl font-semibold mb-4">Your AI-Powered Nutrition Insights</h2>
            {/* ...existing code... */}
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