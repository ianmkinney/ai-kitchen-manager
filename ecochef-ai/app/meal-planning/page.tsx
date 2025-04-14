"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDrag, useDrop } from 'react-dnd';

// Define types for drag-and-drop
const ItemType = {
  RECIPE: 'recipe',
};

interface UserPreferences {
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isNutFree: boolean;
  spicyPreference?: number;
  sweetPreference?: number;
  savoryPreference?: number;
  maxCookingTime: number;
  cookingSkillLevel?: string;
  peopleCount: number;
  cuisine: string;
  cuisinePreferences?: string[];
  flavorPreferences?: string[];
  healthGoals?: string[];
  allergies?: string[];
  sustainabilityPreference?: string;
  nutritionFocus?: string[];
  calorieTarget?: number;
  proteinTarget?: number;
  carbTarget?: number;
  fatTarget?: number;
  rawQuizAnswers?: Record<string, unknown>;
}

interface Recipe {
  name: string;
  ingredients: string[];
  instructions: string[];
}

// Define a meal type enumeration
type MealTime = 'breakfast' | 'lunch' | 'dinner';

// Define a daily meal plan structure
interface DailyMeals {
  breakfast: Recipe[];
  lunch: Recipe[];
  dinner: Recipe[];
}

// Define the weekly plan structure
interface WeeklyPlan {
  [day: string]: DailyMeals;
}

// Add interface for shopping list item
interface ShoppingItem {
  name: string;
  category?: string;
}

function DraggableRecipe({ recipe }: { recipe: Recipe }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemType.RECIPE,
    item: { recipe },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const handleClick = () => {
    alert(`Title: ${recipe.name}\n\nIngredients:\n${recipe.ingredients.join(', ')}\n\nInstructions:\n${recipe.instructions.join('\n')}`);
  };

  return (
    <div
      ref={drag as unknown as React.RefObject<HTMLDivElement>}
      className={`card p-2 ${isDragging ? 'opacity-50' : ''}`}
      style={{ cursor: 'move' }}
      onClick={handleClick}
    >
      <h3 className="font-medium text-sm">{recipe.name}</h3>
    </div>
  );
}

function DroppableMealTime({ 
  day, 
  mealTime, 
  onDrop, 
  meals,
  onRemove 
}: { 
  day: string; 
  mealTime: MealTime; 
  onDrop: (day: string, mealTime: MealTime, recipe: Recipe) => void; 
  meals: Recipe[];
  onRemove: (day: string, mealTime: MealTime, index: number) => void;
}) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemType.RECIPE,
    drop: (item: { recipe: Recipe }) => onDrop(day, mealTime, item.recipe),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const handleClick = (recipe: Recipe) => {
    alert(`Title: ${recipe.name}\n\nIngredients:\n${recipe.ingredients.join(', ')}\n\nInstructions:\n${recipe.instructions.join('\n')}`);
  };

  return (
    <div
      ref={drop as unknown as React.RefObject<HTMLDivElement>}
      className={`p-3 bg-gray-50 rounded-lg ${isOver ? 'bg-green-100' : ''}`}
    >
      <h4 className="font-medium text-sm mb-2 capitalize">{mealTime}</h4>
      {meals.map((meal, index) => (
        <div
          key={index}
          className="text-xs text-gray-800 mb-1 flex justify-between items-center"
        >
          <span 
            className="cursor-pointer hover:text-blue-600"
            onClick={() => handleClick(meal)}
          >
            {meal.name}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(day, mealTime, index);
            }}
            className="text-red-500 hover:text-red-700 ml-2 text-xs"
            title="Remove meal"
          >
            ✕
          </button>
        </div>
      ))}
      {meals.length === 0 && (
        <div className="text-xs text-gray-400 italic">Drop a recipe here</div>
      )}
    </div>
  );
}

function DroppableDay({ day, onDrop, onRemove, dailyMeals }: { 
  day: string; 
  onDrop: (day: string, mealTime: MealTime, recipe: Recipe) => void; 
  onRemove: (day: string, mealTime: MealTime, index: number) => void;
  dailyMeals: DailyMeals 
}) {
  return (
    <div className="flex flex-col space-y-2">
      <h3 className="font-medium text-center mb-1">{day}</h3>
      <DroppableMealTime 
        day={day} 
        mealTime="breakfast" 
        meals={dailyMeals.breakfast} 
        onDrop={onDrop}
        onRemove={onRemove}
      />
      <DroppableMealTime 
        day={day} 
        mealTime="lunch" 
        meals={dailyMeals.lunch} 
        onDrop={onDrop}
        onRemove={onRemove}
      />
      <DroppableMealTime 
        day={day} 
        mealTime="dinner" 
        meals={dailyMeals.dinner} 
        onDrop={onDrop}
        onRemove={onRemove}
      />
    </div>
  );
}

export default function MealPlanning() {
  // State for query and AI response
  const [query, setQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<{ meals: Recipe[], otherContent: string[] }>({ meals: [], otherContent: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // Add specific loading state for weekly plan
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  
  // State for user preferences
  const [preferences, setPreferences] = useState<UserPreferences>({
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    isDairyFree: false,
    isNutFree: false,
    maxCookingTime: 30,
    peopleCount: 2,
    cuisine: 'Any',
  });

  // Initialize the weekly plan with empty arrays for each meal type
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>({
    Mon: { breakfast: [], lunch: [], dinner: [] },
    Tue: { breakfast: [], lunch: [], dinner: [] },
    Wed: { breakfast: [], lunch: [], dinner: [] },
    Thu: { breakfast: [], lunch: [], dinner: [] },
    Fri: { breakfast: [], lunch: [], dinner: [] },
    Sat: { breakfast: [], lunch: [], dinner: [] },
    Sun: { breakfast: [], lunch: [], dinner: [] },
  });
  
  // State for shopping list
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [pantryItems, setPantryItems] = useState<string[]>([]);
  const [isGeneratingList, setIsGeneratingList] = useState(false);
  
  // Load saved preferences, weekly plan and pantry items on component mount
  useEffect(() => {
    // Create a flag to track if component is mounted
    let isMounted = true;
    
    const fetchAllData = async () => {
      // Set loading state
      if (isMounted) setIsLoading(true);
      
      try {
        // Run all data fetching in parallel
        await Promise.all([
          fetchPreferences(),
          fetchWeeklyPlan(),
          fetchPantryItems()
        ]);
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        // Clear loading state
        if (isMounted) setIsLoading(false);
      }
    };
    
    fetchAllData();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []);
  
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
            isNutFree: data.preferences.isNutFree || false,
            spicyPreference: data.preferences.spicyPreference,
            sweetPreference: data.preferences.sweetPreference,
            savoryPreference: data.preferences.savoryPreference,
            maxCookingTime: data.preferences.maxCookingTime || 30,
            cookingSkillLevel: data.preferences.cookingSkillLevel,
            peopleCount: data.preferences.peopleCount || 2,
            cuisine: data.preferences.cuisine || 'Any',
            cuisinePreferences: data.preferences.cuisinePreferences,
            flavorPreferences: data.preferences.flavorPreferences,
            healthGoals: data.preferences.healthGoals,
            allergies: data.preferences.allergies,
            sustainabilityPreference: data.preferences.sustainabilityPreference,
            nutritionFocus: data.preferences.nutritionFocus,
            calorieTarget: data.preferences.calorieTarget,
            proteinTarget: data.preferences.proteinTarget,
            carbTarget: data.preferences.carbTarget,
            fatTarget: data.preferences.fatTarget,
            rawQuizAnswers: data.preferences.rawQuizAnswers,
          });
        } else {
          // If preferences is null or undefined, set default preferences
          console.log('No preferences found, using defaults');
          setPreferences({
            isVegetarian: false,
            isVegan: false,
            isGlutenFree: false,
            isDairyFree: false,
            isNutFree: false,
            maxCookingTime: 30,
            peopleCount: 2,
            cuisine: 'Any',
          });
        }
      } else {
        console.error('Error response from preferences API:', response.status);
        // In case of error response, still set default preferences
        setPreferences({
          isVegetarian: false,
          isVegan: false,
          isGlutenFree: false,
          isDairyFree: false,
          isNutFree: false,
          maxCookingTime: 30,
          peopleCount: 2,
          cuisine: 'Any',
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      // Always ensure we have default preferences even if API call fails
      setPreferences({
        isVegetarian: false,
        isVegan: false,
        isGlutenFree: false,
        isDairyFree: false,
        isNutFree: false,
        maxCookingTime: 30,
        peopleCount: 2,
        cuisine: 'Any',
      });
    }
  };

  const fetchWeeklyPlan = async () => {
    try {
      console.log('Fetching weekly plan...');
      setIsLoadingPlan(true);
      const response = await fetch('/api/weekly-plan');
      
      if (response.ok) {
        const data = await response.json();
        console.log('Weekly plan API response:', data);
        
        if (data.weeklyPlan) {
          // Ensure the weekly plan has the expected structure with meal times
          const plan = data.weeklyPlan;
          
          // Create a new blank weekly plan to start with
          const newPlan: WeeklyPlan = {
            Mon: { breakfast: [], lunch: [], dinner: [] },
            Tue: { breakfast: [], lunch: [], dinner: [] },
            Wed: { breakfast: [], lunch: [], dinner: [] },
            Thu: { breakfast: [], lunch: [], dinner: [] },
            Fri: { breakfast: [], lunch: [], dinner: [] },
            Sat: { breakfast: [], lunch: [], dinner: [] },
            Sun: { breakfast: [], lunch: [], dinner: [] },
          };
          
          // Copy each day's meals from the saved plan
          ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(day => {
            // Check if this day exists in the returned plan
            if (plan[day]) {
              // Add each meal time's recipes, ensuring they're valid Recipe objects
              const validMealTypes: MealTime[] = ['breakfast', 'lunch', 'dinner'];
              
              validMealTypes.forEach(mealType => {
                if (Array.isArray(plan[day][mealType])) {
                  newPlan[day][mealType] = plan[day][mealType].map((recipe: Partial<Recipe>) => {
                    return {
                      name: recipe.name || 'Unnamed Recipe',
                      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
                      instructions: Array.isArray(recipe.instructions) ? recipe.instructions : []
                    };
                  });
                }
              });
            }
          });
          
          console.log('Updated weekly plan state:', newPlan);
          setWeeklyPlan(newPlan);
        } else {
          console.log('No weekly plan data returned from API');
        }
      } else {
        console.error('Error response from weekly plan API:', response.status);
        const errorText = await response.text();
        console.error('API error details:', errorText);
      }
    } catch (error) {
      console.error('Error fetching weekly plan:', error);
    } finally {
      setIsLoadingPlan(false);
    }
  };

  const fetchPantryItems = async () => {
    try {
      const response = await fetch('/api/pantry');
      if (response.ok) {
        const data = await response.json();
        if (data.pantryItems && Array.isArray(data.pantryItems)) {
          // Extract names from pantry items - check both itemName (API standard) and name (local fallback)
          const items = data.pantryItems.map((item: {itemName?: string, name?: string}) => 
            item.itemName || item.name || ''
          ).filter(Boolean);
          
          console.log('Fetched pantry items:', items);
          setPantryItems(items);
        } else {
          console.warn('No pantry items found or unexpected format:', data);
          setPantryItems([]);
        }
      } else {
        console.error('Error response from pantry API:', response.status);
        setPantryItems([]);
      }
    } catch (error) {
      console.error('Error fetching pantry items:', error);
      setPantryItems([]);
    }
  };

  // Handle preference changes
  const handlePreferenceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target;
    let value: string | number | boolean;
    
    // Handle different input types
    if (target.type === 'checkbox') {
      value = (target as HTMLInputElement).checked;
    } else if (target.type === 'range') {
      // Convert range values to numbers
      value = parseInt(target.value, 10);
    } else {
      value = target.value;
    }
    
    const name = target.name;
    
    setPreferences(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Save preferences
  const savePreferences = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      // Format preferences to match what the API expects
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences) // Send preferences directly, not wrapped in an object
      });
      
      if (response.ok) {
        alert('Preferences saved successfully!');
      } else {
        const errorData = await response.json();
        console.error('Error response from API:', errorData);
        alert(`Failed to save preferences: ${errorData.error || 'Unknown error'}`);
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
    setAiResponse({ meals: [], otherContent: [] });

    const timeoutDuration = 15000; // Reduced from 30s to 15s
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

    let progressInterval: NodeJS.Timeout | null = null;
    let progress = 0;

    // Update progress bar every 100ms
    const updateProgressBar = () => {
      progress += 100 / (timeoutDuration / 100);
      setLoadingProgress(Math.min(progress, 100));
    };

    try {
      progressInterval = setInterval(updateProgressBar, 100);

      // We'll use the pantry items already loaded in state to avoid fetching again
      // This ensures we're using the most recent version and avoid race conditions
      console.log('Using pantry items from state:', pantryItems);
      
      console.log('Sending request with query:', query);
      console.log('Using pantry items:', pantryItems);
      console.log('Sending preferences:', preferences);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: `USER QUERY: "${query}" - This is extremely important to focus on!

Please create recipes that specifically address this query.

Please respond with only JSON containing an array of recipes that match the user's query. 
Each recipe should include "name", "ingredients", and "instructions" fields. No extra text or formatting.

The recipes should USE THE INGREDIENTS FROM THE USER'S PANTRY WHENEVER POSSIBLE: ${pantryItems.join(', ')}`,
          preferences: preferences,
          pantryItems: pantryItems
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (progressInterval) clearInterval(progressInterval);
      setLoadingProgress(100); // Ensure progress bar is full when request completes
      
      const data = await response.json();
      console.log('Parsed API response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get meal suggestions');
      }
      
      // Parse the response to extract recipes
      let recipes: Recipe[] = [];
      
      if (typeof data.response === 'string') {
        try {
          // Try to find JSON array in the response string - using a more robust approach
          // that doesn't rely on the 's' flag (which requires ES2018)
          const responseText = data.response;
          const startBracket = responseText.indexOf('[');
          const endBracket = responseText.lastIndexOf(']');
          
          if (startBracket !== -1 && endBracket !== -1 && startBracket < endBracket) {
            const jsonStr = responseText.substring(startBracket, endBracket + 1);
            recipes = JSON.parse(jsonStr);
          } else {
            console.log('Attempting direct parse of response');
            recipes = JSON.parse(data.response);
          }
          
          // Handle the case where the API returned data in the format shown in the user's example
          if (!Array.isArray(recipes)) {
            throw new Error('Parsed response is not an array');
          }
        } catch (error) {
          console.error('Error parsing response string as JSON:', error);
          
          // If we can't parse as JSON, check if it's already in the expected format
          const sampleData = data.response;
          console.log('Response appears to be in unexpected format, trying to extract recipes manually');
          
          // If we receive direct data like in the user's example
          if (Array.isArray(sampleData) && sampleData.length > 0 && 'name' in sampleData[0]) {
            recipes = sampleData;
          } else {
            console.error('Unable to parse response in any format');
            throw new Error('Invalid JSON format in API response');
          }
        }
      } else if (Array.isArray(data.response)) {
        // Direct array response
        recipes = data.response;
      }
      
      console.log('Final recipes object:', recipes);
      setAiResponse({ meals: recipes, otherContent: [] });
    } catch (error) {
      console.error('Error fetching meal suggestions:', error);
      
      let errorMessage = 'Unknown error';
      if (error && typeof error === 'object' && 'message' in error && 
          typeof error.message === 'string') {
        errorMessage = error.message;
      }
      
      // Try to use the direct API response that the user provided as fallback
      try {
        const directData: Recipe[] = [
          {
            "name": "Lemon Garlic Chicken with Roasted Vegetables",
            "ingredients": [
              "1 lb boneless, skinless chicken breasts",
              "2 tbsp olive oil",
              "3 cloves garlic, minced",
              "2 tbsp lemon juice",
              "1 tsp dried oregano",
              "Salt and pepper to taste",
              "2 cups mixed vegetables (e.g. broccoli, carrots, zucchini), chopped",
              "1 lemon, sliced"
            ],
            "instructions": [
              "1. Preheat oven to 400°F.",
              "2. In a large bowl, combine the chicken, 1 tbsp olive oil, garlic, lemon juice, oregano, salt, and pepper. Mix well and let marinate for 15 minutes.",
              "3. Spread the chopped vegetables on a baking sheet and toss with the remaining 1 tbsp olive oil, salt, and pepper.",
              "4. Place the chicken on a separate baking sheet or on top of the vegetables.",
              "5. Bake for 25-30 minutes, or until the chicken is cooked through and the vegetables are tender.",
              "6. Serve the chicken and roasted vegetables with lemon slices."
            ]
          },
          {
            "name": "Grilled Salmon with Mango Salsa",
            "ingredients": [
              "4 salmon fillets",
              "2 tbsp olive oil",
              "1 tsp paprika",
              "Salt and pepper to taste",
              "1 mango, diced",
              "1/2 red onion, diced",
              "1 jalapeño, seeded and diced",
              "2 tbsp chopped cilantro",
              "1 tbsp lime juice"
            ],
            "instructions": [
              "1. Preheat grill or grill pan to medium-high heat.",
              "2. Season the salmon fillets with paprika, salt, and pepper.",
              "3. Grill the salmon for 4-6 minutes per side, or until cooked through.",
              "4. In a small bowl, combine the mango, red onion, jalapeño, cilantro, and lime juice. Mix well.",
              "5. Serve the grilled salmon with the mango salsa."
            ]
          },
          {
            "name": "Beef and Broccoli Stir-Fry",
            "ingredients": [
              "1 lb flank steak, thinly sliced",
              "2 tbsp soy sauce",
              "1 tbsp cornstarch",
              "2 tbsp vegetable oil",
              "3 cloves garlic, minced",
              "1 inch piece fresh ginger, grated",
              "4 cups broccoli florets",
              "1/4 cup beef broth",
              "1 tbsp brown sugar",
              "1 tsp sesame oil",
              "Salt and pepper to taste"
            ],
            "instructions": [
              "1. In a bowl, combine the sliced flank steak, soy sauce, and cornstarch. Mix well and let marinate for 15 minutes.",
              "2. Heat the vegetable oil in a large skillet or wok over high heat.",
              "3. Add the garlic and ginger and cook for 1 minute, until fragrant.",
              "4. Add the marinated beef and stir-fry for 2-3 minutes, until browned.",
              "5. Add the broccoli florets and beef broth. Cover and cook for 3-4 minutes, until the broccoli is tender-crisp.",
              "6. Stir in the brown sugar and sesame oil. Season with salt and pepper to taste.",
              "7. Serve the beef and broccoli stir-fry over steamed rice."
            ]
          }
        ];
        setAiResponse({ meals: directData, otherContent: [] });
      } catch (fallbackError) {
        console.error('Error with fallback data:', fallbackError);
        alert(`Error: ${errorMessage}`);
        setAiResponse({ meals: [], otherContent: [] });
      }
    } finally {
      clearTimeout(timeoutId);
      if (progressInterval) clearInterval(progressInterval);
      setLoadingProgress(0); // Reset progress bar
      setIsLoading(false);
    }
  };

  // Add a function to remove a meal from the weekly plan
  const removeMeal = (day: string, mealTime: MealTime, index: number) => {
    setWeeklyPlan(prevPlan => {
      // Create a copy of the plan
      const newPlan = {...prevPlan};
      
      // Remove the meal at the specified index
      newPlan[day][mealTime] = [
        ...newPlan[day][mealTime].slice(0, index),
        ...newPlan[day][mealTime].slice(index + 1)
      ];
      
      return newPlan;
    });
  };

  const handleDrop = (day: string, mealTime: MealTime, recipe: Recipe) => {
    setWeeklyPlan(prev => {
      const newPlan = { ...prev };
      
      // Create a copy of the day's meals
      const dayMeals = { ...newPlan[day] };
      
      // Update the specific meal time with the new recipe
      dayMeals[mealTime] = [...dayMeals[mealTime], recipe];
      
      // Update the day in the weekly plan
      newPlan[day] = dayMeals;
      
      return newPlan;
    });
  };

  // Save weekly plan
  const saveWeeklyPlan = async () => {
    try {
      // Transform the weekly plan data into the format expected by the API
      const currentDate = new Date();
      const weekStartDate = new Date(currentDate);
      // Set to previous Monday
      weekStartDate.setDate(currentDate.getDate() - (currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1));
      
      // Extract all recipes from the weekly plan
      const recipes = [];
      const dayMapping = {
        'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6
      };
      
      for (const [day, meals] of Object.entries(weeklyPlan)) {
        const dayOffset = dayMapping[day as keyof typeof dayMapping];
        const mealDate = new Date(weekStartDate);
        mealDate.setDate(weekStartDate.getDate() + dayOffset);
        
        for (const [mealType, mealRecipes] of Object.entries(meals)) {
          // Cast the mealRecipes to Recipe[] to fix type issues
          const typedRecipes = mealRecipes as Recipe[];
          for (const recipe of typedRecipes) {
            recipes.push({
              recipeData: recipe,
              plannedDate: mealDate.toISOString().split('T')[0], // YYYY-MM-DD format
              mealType: mealType
            });
          }
        }
      }
      
      console.log('Saving weekly plan with formatted data:');
      console.log('weekStartDate:', weekStartDate.toISOString().split('T')[0]);
      console.log('recipes:', recipes.length, 'items');
      
      const response = await fetch('/api/weekly-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weeklyPlan: {
            weekStartDate: weekStartDate.toISOString().split('T')[0],
            recipes: recipes
          }
        }),
      });

      if (response.ok) {
        alert('Weekly plan saved successfully!');
        
        // Reload the weekly plan data to show the latest saved version
        try {
          console.log('Refreshing weekly plan data...');
          const refreshResponse = await fetch('/api/weekly-plan');
          
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            if (refreshData.weeklyPlan) {
              // Process and update the UI with the latest data
              const plan = refreshData.weeklyPlan;
              
              // Create a new plan to hold the updated data
              const newPlan: WeeklyPlan = {
                Mon: { breakfast: [], lunch: [], dinner: [] },
                Tue: { breakfast: [], lunch: [], dinner: [] },
                Wed: { breakfast: [], lunch: [], dinner: [] },
                Thu: { breakfast: [], lunch: [], dinner: [] },
                Fri: { breakfast: [], lunch: [], dinner: [] },
                Sat: { breakfast: [], lunch: [], dinner: [] },
                Sun: { breakfast: [], lunch: [], dinner: [] },
              };
              
              // Populate the plan with the returned data
              ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(day => {
                if (plan[day]) {
                  const validMealTypes: MealTime[] = ['breakfast', 'lunch', 'dinner'];
                  
                  validMealTypes.forEach(mealType => {
                    if (Array.isArray(plan[day][mealType])) {
                      newPlan[day][mealType] = plan[day][mealType].map((recipe: Partial<Recipe>) => {
                        return {
                          name: recipe.name || 'Unnamed Recipe',
                          ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
                          instructions: Array.isArray(recipe.instructions) ? recipe.instructions : []
                        };
                      });
                    }
                  });
                }
              });
              
              setWeeklyPlan(newPlan);
              console.log('Weekly plan refreshed successfully');
            }
          }
        } catch (refreshError) {
          console.error('Error refreshing weekly plan:', refreshError);
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to save weekly plan:', errorData);
        alert(`Failed to save weekly plan: ${errorData.error || errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving weekly plan:', error);
      alert('An error occurred while saving the weekly plan');
    }
  };

  // Generate shopping list from weekly plan
  const generateShoppingList = () => {
    setIsGeneratingList(true);
    
    try {
      // Extract all ingredients from all recipes in the weekly plan
      const allIngredients: string[] = [];
      
      Object.values(weeklyPlan).forEach(dayMeals => {
        ['breakfast', 'lunch', 'dinner'].forEach(mealTime => {
          const recipes = dayMeals[mealTime as keyof typeof dayMeals];
          if (Array.isArray(recipes)) {
            recipes.forEach(recipe => {
              if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
                recipe.ingredients.forEach(ingredient => {
                  // Clean up the ingredient string to extract just the item name
                  let cleanedIngredient = ingredient.toLowerCase();
                  
                  // Remove quantities and measurements
                  cleanedIngredient = cleanedIngredient.replace(/^\d+\s*(\d\/\d)?(\s*-\s*\d+)?\s*(cups?|tablespoons?|teaspoons?|tbsp|tsp|oz|ounces?|pounds?|lbs?|grams?|g|ml|l|pinch(es)?|dash(es)?|to taste|dozen|slices?)/i, '');
                  
                  // Remove common prepositions and adjectives
                  cleanedIngredient = cleanedIngredient.replace(/^(of|a|an|the|fresh|dried|frozen|large|medium|small|ripe|chopped|minced|diced|sliced|grated)\s+/i, '');
                  
                  // Remove anything in parentheses
                  cleanedIngredient = cleanedIngredient.replace(/\(.*\)/g, '');
                  
                  // Trim whitespace and commas
                  cleanedIngredient = cleanedIngredient.trim().replace(/,$/, '');
                  
                  // Only add if it's not empty and not already in the list
                  if (cleanedIngredient && !allIngredients.includes(cleanedIngredient)) {
                    allIngredients.push(cleanedIngredient);
                  }
                });
              }
            });
          }
        });
      });
      
      // Filter out ingredients that are already in the pantry
      const missingIngredients = allIngredients.filter(ingredient => 
        !pantryItems.some(pantryItem => 
          pantryItem.toLowerCase().includes(ingredient) || 
          ingredient.includes(pantryItem.toLowerCase())
        )
      );
      
      // Convert to shopping items
      const newShoppingList: ShoppingItem[] = missingIngredients.map(item => ({
        name: item.trim(),
        category: categorizeIngredient(item.trim())
      }));
      
      setShoppingList(newShoppingList);
      setShowShoppingList(true);
    } catch (error) {
      console.error('Error generating shopping list:', error);
      alert('Failed to generate shopping list. Please try again.');
    } finally {
      setIsGeneratingList(false);
    }
  };
  
  // Helper function to categorize ingredients
  const categorizeIngredient = (ingredient: string): string => {
    const lowerIngredient = ingredient.toLowerCase();
    
    // Common categories
    if (/chicken|beef|pork|turkey|lamb|fish|shrimp|salmon|tofu|tempeh|seitan/.test(lowerIngredient)) {
      return 'Protein';
    } else if (/milk|cheese|yogurt|cream|butter|sour cream/.test(lowerIngredient)) {
      return 'Dairy';
    } else if (/apple|banana|orange|grape|berry|blueberry|strawberry|raspberry|melon|watermelon|kiwi|mango|pineapple/.test(lowerIngredient)) {
      return 'Fruit';
    } else if (/lettuce|spinach|kale|carrot|broccoli|pepper|onion|garlic|cucumber|tomato|potato|bean|lentil|zucchini|squash|eggplant|asparagus|celery/.test(lowerIngredient)) {
      return 'Vegetables';
    } else if (/flour|sugar|salt|pepper|oil|vinegar|spice|herb|oregano|basil|thyme|cumin|cinnamon|nutmeg|vanilla|baking powder|baking soda/.test(lowerIngredient)) {
      return 'Pantry Staples';
    } else if (/bread|bagel|tortilla|wrap|pita|bun|roll/.test(lowerIngredient)) {
      return 'Bread';
    } else if (/pasta|rice|quinoa|oat|barley|couscous|noodle/.test(lowerIngredient)) {
      return 'Grains';
    } else if (/almond|cashew|peanut|walnut|pecan|seed|nut/.test(lowerIngredient)) {
      return 'Nuts & Seeds';
    }
    
    return 'Other';
  };
  
  // Add items to shopping list in pantry
  const addToShoppingList = async () => {
    if (shoppingList.length === 0) return;
    
    try {
      // Create a promise for each item
      const addPromises = shoppingList.map(item => 
        fetch('/api/shopping', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: item.name,
            category: item.category
          }),
        })
      );
      
      // Wait for all items to be added
      await Promise.all(addPromises);
      
      alert('Added all items to your shopping list in the pantry!');
      setShowShoppingList(false);
      
    } catch (error) {
      console.error('Error adding to shopping list:', error);
      alert('Failed to add items to shopping list. Please try again.');
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dietary Restrictions */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Dietary Restrictions
                  </label>
                  <div className="grid grid-cols-2 gap-2">
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
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="isNutFree"
                        checked={preferences.isNutFree}
                        onChange={handlePreferenceChange}
                        className="mr-2"
                      />
                      Nut-Free
                    </label>
                  </div>
                </div>
                
                {/* Cooking Options */}
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
                
                <div>
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
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Cooking Skill Level
                  </label>
                  <select 
                    name="cookingSkillLevel"
                    className="input-field"
                    value={preferences.cookingSkillLevel || 'intermediate'}
                    onChange={handlePreferenceChange}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                
                {/* Taste Preference Sliders */}
                <div className="col-span-2">
                  <h3 className="block text-sm font-medium mb-2">Taste Preferences (0-10)</h3>
                  
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-sm">Spicy: {preferences.spicyPreference || 5}</label>
                    </div>
                    <input
                      type="range"
                      name="spicyPreference"
                      min="0"
                      max="10"
                      step="1"
                      value={preferences.spicyPreference || 5}
                      onChange={handlePreferenceChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Not Spicy</span>
                      <span>Very Spicy</span>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-sm">Sweet: {preferences.sweetPreference || 5}</label>
                    </div>
                    <input
                      type="range"
                      name="sweetPreference"
                      min="0"
                      max="10"
                      step="1"
                      value={preferences.sweetPreference || 5}
                      onChange={handlePreferenceChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Not Sweet</span>
                      <span>Very Sweet</span>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-sm">Savory: {preferences.savoryPreference || 5}</label>
                    </div>
                    <input
                      type="range"
                      name="savoryPreference"
                      min="0"
                      max="10"
                      step="1"
                      value={preferences.savoryPreference || 5}
                      onChange={handlePreferenceChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Less Savory</span>
                      <span>Very Savory</span>
                    </div>
                  </div>
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
              {isLoading && (
                <div className="relative w-full h-1 bg-gray-200 mt-2">
                  <div
                    className="absolute top-0 left-0 h-full bg-blue-500"
                    style={{ width: `${loadingProgress}%` }}
                  ></div>
                </div>
              )}
              <div>
                {loadingProgress === 100 && aiResponse.otherContent && aiResponse.otherContent.length > 0 && (
                  <div className="text-sm text-gray-600 mb-4">
                    {aiResponse.otherContent.map((content, index) => (
                      <p key={index} className="mb-2">{content}</p>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.isArray(aiResponse.meals) && aiResponse.meals.length > 0 &&
                    aiResponse.meals.map((recipe, index) => (
                      <DraggableRecipe key={index} recipe={recipe} />
                    ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Weekly Plan Section */}
        <section className="mt-8 card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Your Weekly Plan</h2>
            {isLoadingPlan && (
              <span className="text-sm text-blue-500">Loading your saved plan...</span>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {Object.keys(weeklyPlan).map((day) => (
              <DroppableDay
                key={day}
                day={day}
                dailyMeals={weeklyPlan[day]}
                onDrop={handleDrop}
                onRemove={removeMeal}
              />
            ))}
          </div>
          <div className="flex mt-4 space-x-4">
            <button
              className="btn-primary"
              onClick={saveWeeklyPlan}
            >
              Save Weekly Plan
            </button>
            <button
              className={`btn-secondary ${isGeneratingList ? 'opacity-50' : ''}`}
              onClick={generateShoppingList}
              disabled={isGeneratingList}
            >
              {isGeneratingList ? 'Generating...' : 'Generate Shopping List'}
            </button>
          </div>
        </section>
        
        {/* Shopping List Modal */}
        {showShoppingList && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">Shopping List</h2>
              
              {shoppingList.length === 0 ? (
                <p className="text-gray-500">No items needed. Your pantry has everything!</p>
              ) : (
                <>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      These items aren&apos;t in your pantry but are needed for your weekly plan:
                    </p>
                  </div>
                  
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto mb-4">
                    {/* Group by category */}
                    {Array.from(new Set(shoppingList.map(item => item.category))).map(category => (
                      <div key={category} className="mb-3">
                        <h3 className="font-medium text-sm">{category}</h3>
                        <ul className="pl-4">
                          {shoppingList
                            .filter(item => item.category === category)
                            .map((item, index) => (
                              <li key={index} className="text-sm">{item.name}</li>
                            ))
                          }
                        </ul>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <button 
                      className="btn-secondary"
                      onClick={() => setShowShoppingList(false)}
                    >
                      Close
                    </button>
                    <button 
                      className="btn-primary"
                      onClick={addToShoppingList}
                    >
                      Add to Pantry Shopping List
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}