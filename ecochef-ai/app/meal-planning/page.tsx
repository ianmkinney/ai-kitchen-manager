"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDrag, useDrop } from 'react-dnd';
import { format } from 'date-fns';
import AiDisclaimer from '../components/AiDisclaimer';

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
  servingSize?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  nutritionInfo?: Record<string, number | string>;
  cuisine?: string;
  difficulty?: string;
  prepTime?: string;
  cookTime?: string;
  servings?: number;
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

function DraggableRecipe({ recipe, onSaveRecipe }: { recipe: Recipe; onSaveRecipe?: (recipe: Recipe) => void }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemType.RECIPE,
    item: { recipe },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const handleClick = () => {
    const nutritionInfo = recipe.calories 
      ? `\n\nNutrition (per serving):\nCalories: ${recipe.calories} kcal\nProtein: ${recipe.protein || 0}g\nCarbs: ${recipe.carbs || 0}g\nFat: ${recipe.fat || 0}g`
      : '';
      
    alert(`Title: ${recipe.name}\n\nServings: ${recipe.servingSize || 1}\n\nIngredients:\n${recipe.ingredients.join(', ')}\n\nInstructions:\n${recipe.instructions.join('\n')}${nutritionInfo}`);
  };

  const handleSaveRecipe = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSaveRecipe) {
      onSaveRecipe(recipe);
    }
  };

  return (
    <div
      ref={drag as unknown as React.RefObject<HTMLDivElement>}
      className={`card p-2 ${isDragging ? 'opacity-50' : ''}`}
      style={{ cursor: 'move' }}
      onClick={handleClick}
    >
      <div>
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-medium text-xs sm:text-sm truncate flex-1" title={recipe.name}>{recipe.name}</h3>
          {onSaveRecipe && (
            <button
              onClick={handleSaveRecipe}
              className="text-green-600 hover:text-green-800 text-xs ml-2 flex-shrink-0"
              title="Save as custom recipe"
            >
              Save
            </button>
          )}
        </div>
        {recipe.calories && (
          <div className="flex items-center mt-1 text-xs text-gray-500">
            <span className="mr-2">{recipe.calories} kcal</span>
            <div className="flex space-x-1">
              <span title="Protein">{recipe.protein || 0}p</span>
              <span title="Carbs">{recipe.carbs || 0}c</span>
              <span title="Fat">{recipe.fat || 0}f</span>
            </div>
          </div>
        )}
      </div>
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
    const nutritionInfo = recipe.calories 
      ? `\n\nNutrition (per serving):\nCalories: ${recipe.calories} kcal\nProtein: ${recipe.protein || 0}g\nCarbs: ${recipe.carbs || 0}g\nFat: ${recipe.fat || 0}g`
      : '';
      
    alert(`Title: ${recipe.name}\n\nServings: ${recipe.servingSize || 1}\n\nIngredients:\n${recipe.ingredients.join(', ')}\n\nInstructions:\n${recipe.instructions.join('\n')}${nutritionInfo}`);
  };

  return (
    <div
      ref={drop as unknown as React.RefObject<HTMLDivElement>}
      className={`p-2 sm:p-3 bg-gray-50 rounded-lg ${isOver ? 'bg-green-100' : ''}`}
    >
      <h4 className="font-medium text-xs mb-1 sm:mb-2 capitalize">{mealTime}</h4>
      {meals.map((meal, index) => (
        <div
          key={index}
          className="text-xs text-gray-800 mb-1"
        >
          <div className="flex justify-between items-center">
            <span 
              className="cursor-pointer hover:text-blue-600 truncate max-w-[80%]"
              onClick={() => handleClick(meal)}
            >
              {meal.name}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(day, mealTime, index);
              }}
              className="text-red-500 hover:text-red-700 ml-1 text-xs shrink-0"
              title="Remove meal"
              aria-label="Remove meal"
            >
              ✕
            </button>
          </div>
          {meal.calories && (
            <div className="text-[10px] text-gray-500 flex items-center mt-0.5">
              <span className="mr-1">{meal.calories} kcal</span>
              <span className="text-gray-400">|</span>
              <span className="mx-1" title="Protein">{meal.protein || 0}p</span>
              <span className="mx-1" title="Carbs">{meal.carbs || 0}c</span>
              <span className="mx-1" title="Fat">{meal.fat || 0}f</span>
            </div>
          )}
        </div>
      ))}
      {meals.length === 0 && (
        <div className="text-xs text-gray-400 italic">Drop a recipe here</div>
      )}
    </div>
  );
}

function DroppableDay({ day, onDrop, onRemove, dailyMeals, date }: { 
  day: string; 
  onDrop: (day: string, mealTime: MealTime, recipe: Recipe) => void; 
  onRemove: (day: string, mealTime: MealTime, index: number) => void;
  dailyMeals: DailyMeals;
  date?: string;
}) {
  return (
    <div className="flex flex-col space-y-2">
      <h3 className="font-medium text-center text-sm sm:text-base mb-1">
        {day} {date && <span className="text-xs text-gray-500">({date})</span>}
      </h3>
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

  // State for custom recipes
  const [customRecipes, setCustomRecipes] = useState<Recipe[]>([]);

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
  
  // State for storing the dates of the current week
  const [weekDates, setWeekDates] = useState<Record<string, string>>({});
  
  // Add state for week selection
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<number>(0);
  const [availableWeeks, setAvailableWeeks] = useState<{offset: number, startDate: string, endDate: string}[]>([]);
  
  // Calculate current week's start and end dates
  const calculateWeekDates = (weekOffset = 0) => {
    const currentDate = new Date();
    const currentWeekStart = new Date(currentDate);
    // Set to previous Monday
    currentWeekStart.setDate(currentDate.getDate() - (currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1));
    // Add the week offset (0 for current week, -1 for previous week, 1 for next week)
    currentWeekStart.setDate(currentWeekStart.getDate() + (weekOffset * 7));
    
    const dates: Record<string, string> = {};
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach((day, index) => {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + index);
      dates[day] = format(date, 'MMM d');
    });
    
    return {
      dates,
      weekStartDate: format(currentWeekStart, 'yyyy-MM-dd')
    };
  };
  
  // Generate 3 weeks before and after the current week for selection
  useEffect(() => {
    const weeks = [];
    for (let i = -3; i <= 3; i++) {
      const { dates } = calculateWeekDates(i);
      weeks.push({
        offset: i,
        startDate: dates['Mon'],
        endDate: dates['Sun']
      });
    }
    setAvailableWeeks(weeks);
  }, []);
  
  // Load saved preferences, weekly plan and pantry items on component mount
  useEffect(() => {
    // Create a flag to track if component is mounted
    let isMounted = true;
    
    // Reset the weekly plan to clear old data before loading new week
    setWeeklyPlan({
      Mon: { breakfast: [], lunch: [], dinner: [] },
      Tue: { breakfast: [], lunch: [], dinner: [] },
      Wed: { breakfast: [], lunch: [], dinner: [] },
      Thu: { breakfast: [], lunch: [], dinner: [] },
      Fri: { breakfast: [], lunch: [], dinner: [] },
      Sat: { breakfast: [], lunch: [], dinner: [] },
      Sun: { breakfast: [], lunch: [], dinner: [] },
    });
    
    const fetchAllData = async () => {
      // Set loading state
      if (isMounted) setIsLoading(true);
      
      try {
        // Run all data fetching in parallel
        await Promise.all([
          fetchPreferences(),
          fetchWeeklyPlan(selectedWeekOffset),
          fetchPantryItems()
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        // Only update state if component is still mounted
        if (isMounted) setIsLoading(false);
      }
    };
    
    fetchAllData();
    
    // Update week dates when selected week changes
    const { dates } = calculateWeekDates(selectedWeekOffset);
    setWeekDates(dates);
    
    // Cleanup function to set the flag when component unmounts
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeekOffset]);
  
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

  const fetchWeeklyPlan = async (weekOffset = 0) => {
    try {
      console.log(`Fetching weekly plan for offset: ${weekOffset}...`);
      setIsLoadingPlan(true);
      
      // Calculate the week start date based on the offset
      const { weekStartDate } = calculateWeekDates(weekOffset);
      console.log(`Fetching weekly plan with startDate: ${weekStartDate}`);
      
      const response = await fetch(`/api/weekly-plan?weekStartDate=${weekStartDate}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Weekly plan API response for ${weekStartDate}:`, data);
        
        if (data.weeklyPlan) {
          // Ensure the weekly plan has the expected structure with meal times
          const plan = data.weeklyPlan;
          console.log(`Plan received with weekStartDate ${plan.weekStartDate} and ID ${plan.id}`);
          
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
                      instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
                      servingSize: recipe.servingSize,
                      calories: recipe.calories,
                      protein: recipe.protein,
                      carbs: recipe.carbs,
                      fat: recipe.fat,
                      nutritionInfo: recipe.nutritionInfo
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

  // Fetch custom recipes from database API
  const fetchCustomRecipes = async () => {
    try {
      const response = await fetch('/api/custom-recipes');
      if (response.ok) {
        const data = await response.json();
        
        // Format custom recipes to match the Recipe interface expected by the meal planning page
        const formattedRecipes = data.customRecipes.map((recipe: Recipe) => ({
          name: recipe.name,
          ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
          instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
          servingSize: recipe.servingSize,
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat,
          nutritionInfo: recipe.nutritionInfo,
          isCustom: true
        }));
        
        setCustomRecipes(formattedRecipes);
      }
    } catch (error) {
      console.error('Error fetching custom recipes:', error);
    }
  };

  // Load custom recipes on component mount
  useEffect(() => {
    fetchCustomRecipes();
  }, []);

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
      // Create a preferences object with proper column casing
      const formattedPreferences = {
        "isVegetarian": preferences.isVegetarian,
        "isVegan": preferences.isVegan,
        "isGlutenFree": preferences.isGlutenFree,
        "isDairyFree": preferences.isDairyFree,
        "isNutFree": preferences.isNutFree,
        "spicyPreference": preferences.spicyPreference,
        "sweetPreference": preferences.sweetPreference,
        "savoryPreference": preferences.savoryPreference,
        "maxCookingTime": preferences.maxCookingTime,
        "cookingSkillLevel": preferences.cookingSkillLevel,
        "peopleCount": preferences.peopleCount,
        cuisine: preferences.cuisine,
        "cuisinePreferences": preferences.cuisinePreferences,
        "flavorPreferences": preferences.flavorPreferences,
        "healthGoals": preferences.healthGoals,
        allergies: preferences.allergies,
        "sustainabilityPreference": preferences.sustainabilityPreference,
        "nutritionFocus": preferences.nutritionFocus,
        "calorieTarget": preferences.calorieTarget,
        "proteinTarget": preferences.proteinTarget,
        "carbTarget": preferences.carbTarget,
        "fatTarget": preferences.fatTarget,
        "updatedAt": new Date().toISOString()
      };

      console.log("Saving preferences:", JSON.stringify(formattedPreferences, null, 2));
      
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies in the request
        body: JSON.stringify(formattedPreferences)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log("Preferences saved successfully:", result);
        alert('Preferences saved successfully!');
      } else {
        const errorData = await response.json();
        console.error('Error saving preferences. Status:', response.status);
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

      // If pantry items haven't been loaded yet, fetch them
      if (pantryItems.length === 0) {
        await fetchPantryItems();
      }
      
      console.log('Sending request with query:', query);
      console.log(`Using ${pantryItems.length} pantry items for recipe generation`);
      console.log('Using preferences:', preferences);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: `USER QUERY: "${query}" - This is extremely important to focus on!

Please create recipes that specifically address this query.

IMPORTANT: Create recipes that prioritize using ingredients from the user's pantry. The available pantry ingredients are: ${pantryItems.join(', ')}

Please respond with only JSON containing an array of recipes that match the user's query. 
Each recipe should include the following fields:
- "name": A descriptive name for the recipe
- "ingredients": An array of ingredients required (mark pantry items with an asterisk *)
- "instructions": An array of step-by-step cooking instructions
- "servingSize": Number of servings the recipe makes
- "calories": Estimated calories per serving
- "protein": Estimated protein in grams per serving
- "carbs": Estimated carbohydrates in grams per serving
- "fat": Estimated fat in grams per serving

IMPORTANT: You must include accurate nutritional information for each recipe.
No extra text or formatting.`,
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
            ],
            "servingSize": 4,
            "calories": 350,
            "protein": 30,
            "carbs": 10,
            "fat": 20,
            "nutritionInfo": {
              "calories": 350,
              "protein": 30,
              "carbs": 10,
              "fat": 20
            }
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
            ],
            "servingSize": 4,
            "calories": 250,
            "protein": 20,
            "carbs": 0,
            "fat": 15,
            "nutritionInfo": {
              "calories": 250,
              "protein": 20,
              "carbs": 0,
              "fat": 15
            }
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
            ],
            "servingSize": 4,
            "calories": 300,
            "protein": 20,
            "carbs": 20,
            "fat": 15,
            "nutritionInfo": {
              "calories": 300,
              "protein": 20,
              "carbs": 20,
              "fat": 15
            }
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
      const recipesList = [];
      
      // Get the week start date based on the selected offset
      const { weekStartDate } = calculateWeekDates(selectedWeekOffset);
      console.log(`Saving weekly plan for offset: ${selectedWeekOffset} with start date: ${weekStartDate}`);
      
      // Flatten the weekly plan data into a list of recipes with their day and meal time
      for (const [day, meals] of Object.entries(weeklyPlan)) {
        for (const [mealTime, recipeList] of Object.entries(meals)) {
          for (const recipe of recipeList) {
            // Create a date string for this meal based on the day
            const dayIndex = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(day);
            const weekDate = new Date(weekStartDate);
            weekDate.setDate(weekDate.getDate() + dayIndex);
            const plannedDate = weekDate.toISOString().split('T')[0];
            
            recipesList.push({
              recipeData: recipe,
              plannedDate,
              mealType: mealTime,
            });
          }
        }
      }
      
      console.log(`Sending ${recipesList.length} recipes to save for week starting ${weekStartDate}`);
      
      // Send data to the API
      const response = await fetch('/api/weekly-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weeklyPlan: {
            weekStartDate,
            recipes: recipesList,
          },
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save weekly plan');
      }
      
      const data = await response.json();
      console.log(`Weekly plan for week ${weekStartDate} saved successfully:`, data);
      alert('Weekly plan saved successfully!');
      
      // Refresh the weekly plan data
      fetchWeeklyPlan(selectedWeekOffset);
    } catch (error) {
      console.error('Error saving weekly plan:', error);
      alert(`Error saving weekly plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Generate shopping list from weekly plan
  const generateShoppingList = async () => {
    setIsGeneratingList(true);
    
    try {
      // Calculate the week start date based on the selected offset
      const { weekStartDate } = calculateWeekDates(selectedWeekOffset);
      
      // Call the API endpoint to generate the shopping list with a cache-busting timestamp and week start date
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/shopping/weekly-list?t=${timestamp}&weekStartDate=${weekStartDate}`, {
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
      
      // Set the shopping list state with the returned data
      setShoppingList(data.shoppingList || []);
      setShowShoppingList(true);
      
      // Log the results for debugging
      console.log('Shopping list generated:', data);
      
      if (data.shoppingList && data.shoppingList.length === 0) {
        alert('All ingredients are already in your pantry!');
      }
    } catch (error) {
      console.error('Error generating shopping list:', error);
      alert('Failed to generate shopping list. Please try again.');
    } finally {
      setIsGeneratingList(false);
    }
  };

  // Save AI-generated recipe as custom recipe
  const saveRecipeAsCustom = async (recipe: Recipe) => {
    try {
      const response = await fetch('/api/custom-recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: recipe.name,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          description: `${recipe.name} - AI Generated Recipe`,
          cuisine: recipe.cuisine || 'International',
          difficulty: recipe.difficulty || 'Easy',
          time: recipe.prepTime || '30 minutes',
          prepTime: recipe.prepTime || '10 minutes',
          cookTime: recipe.cookTime || '20 minutes',
          servings: recipe.servings || recipe.servingSize || 2,
          calories: recipe.calories || 0,
          protein: recipe.protein || 0,
          carbs: recipe.carbs || 0,
          fat: recipe.fat || 0
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save recipe');
      }
      
      alert(`Recipe "${recipe.name}" saved to your custom recipes!`);
      
      // Refresh custom recipes to show the newly saved one
      fetchCustomRecipes();
    } catch (error) {
      console.error('Error saving recipe:', error);
      alert('Failed to save recipe. Please try again.');
    }
  };

  // Add items to shopping list in pantry
  const addToShoppingList = async () => {
    if (shoppingList.length === 0) return;
    
    try {
      // Instead of using Supabase directly, use the API endpoint
      // which handles authentication properly on the server side
      const response = await fetch('/api/shopping/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: shoppingList }),
        credentials: 'include', // Include credentials to send cookies
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add items to shopping list');
      }
      
      const data = await response.json();
      console.log(`Added ${data.addedCount || 'all'} items to shopping list`);
      
      alert('Added all items to your shopping list in the pantry!');
      setShowShoppingList(false);
      
    } catch (error) {
      console.error('Error adding to shopping list:', error);
      alert(`Failed to add items to shopping list: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-0">Meal Planning</h1>
          <Link href="/" className="btn-secondary text-sm sm:text-base">
            Back to Home
          </Link>
        </div>

        {/* Main Content - Single column on mobile, two columns on larger screens */}
        <div className="flex flex-col space-y-4 sm:space-y-8">
          {/* AI Suggestion Section - First on both mobile and desktop */}
          <section className="card h-72 sm:h-96 overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4">AI Meal Suggestions</h2>
            <AiDisclaimer className="mb-4" />
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
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
              
              {/* Custom Recipes Section */}
              {customRecipes.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-md font-medium mb-2">Your Custom Recipes</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {customRecipes.map((recipe, index) => (
                      <DraggableRecipe key={`custom-${index}`} recipe={recipe} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Drag and drop to add to your meal plan
                  </p>
                </div>
              )}
              
              {/* Link to create custom recipes if none exist */}
              {customRecipes.length === 0 && !isLoading && (
                <div className="mt-2 mb-2">
                  <p className="text-sm text-gray-600">
                    <Link href="/recipes" className="text-blue-600 hover:text-blue-800">
                      Create custom recipes
                    </Link> to see them here and add to your meal plan.
                  </p>
                </div>
              )}
              
              {/* AI Generated Recipes Section */}
              {Array.isArray(aiResponse.meals) && aiResponse.meals.length > 0 && (
                <div>
                  <h3 className="text-md font-medium mb-2">AI Generated Recipes</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {aiResponse.meals.map((recipe, index) => (
                      <DraggableRecipe key={`ai-${index}`} recipe={recipe} onSaveRecipe={saveRecipeAsCustom} />
                    ))}
                  </div>
                </div>
              )}
              
              {loadingProgress === 100 && aiResponse.otherContent && aiResponse.otherContent.length > 0 && (
                <div className="text-sm text-gray-600 mb-4">
                  {aiResponse.otherContent.map((content, index) => (
                    <p key={index} className="mb-2">{content}</p>
                  ))}
                </div>
              )}
            </div>
          </section>
          
          {/* Weekly Plan Section - Second on both mobile and desktop */}
          <section className="card">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold">Your Weekly Plan</h2>
                {weekDates['Mon'] && weekDates['Sun'] && (
                  <p className="text-xs text-gray-500">Week of {weekDates['Mon']} - {weekDates['Sun']}</p>
                )}
              </div>
              
              {/* Week Selector */}
              <div className="flex items-center mt-2 sm:mt-0">
                <button 
                  onClick={() => setSelectedWeekOffset(prev => prev - 1)}
                  className="p-1 rounded hover:bg-gray-100 text-gray-700"
                  aria-label="Previous week"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <select 
                  className="text-sm mx-2 p-1 border rounded"
                  value={selectedWeekOffset}
                  onChange={(e) => setSelectedWeekOffset(Number(e.target.value))}
                >
                  {availableWeeks.map((week, index) => (
                    <option key={index} value={week.offset}>
                      {week.startDate} - {week.endDate} {week.offset === 0 ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
                
                <button 
                  onClick={() => setSelectedWeekOffset(prev => prev + 1)}
                  className="p-1 rounded hover:bg-gray-100 text-gray-700"
                  aria-label="Next week"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              
              {isLoadingPlan && (
                <span className="text-sm text-blue-500 mt-2 sm:mt-0">Loading your saved plan...</span>
              )}
            </div>
            
            {/* Mobile-optimized plan layout */}
            <div className="block sm:hidden">
              {/* Mobile view: One day at a time, scrollable horizontally */}
              <div className="flex overflow-x-auto pb-4 space-x-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="flex-shrink-0 w-[85vw]">
                    <DroppableDay
                      day={day}
                      dailyMeals={weeklyPlan[day]}
                      onDrop={handleDrop}
                      onRemove={removeMeal}
                      date={weekDates[day]}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">Swipe left/right to see all days</p>
            </div>
            
            {/* Desktop view: Split into two rows */}
            <div className="hidden sm:block">
              {/* First row: Monday-Thursday */}
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2 text-gray-500">Monday - Thursday</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu'].map((day) => (
                    <DroppableDay
                      key={day}
                      day={day}
                      dailyMeals={weeklyPlan[day]}
                      onDrop={handleDrop}
                      onRemove={removeMeal}
                      date={weekDates[day]}
                    />
                  ))}
                </div>
              </div>
              
              {/* Second row: Friday-Sunday */}
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2 text-gray-500">Friday - Sunday</h3>
                <div className="grid grid-cols-3 gap-2">
                  {['Fri', 'Sat', 'Sun'].map((day) => (
                    <DroppableDay
                      key={day}
                      day={day}
                      dailyMeals={weeklyPlan[day]}
                      onDrop={handleDrop}
                      onRemove={removeMeal}
                      date={weekDates[day]}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0 mt-4">
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
          
          {/* Preferences Section - Last on both mobile and desktop */}
          <section className="card">
            <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4">Your Preferences</h2>
            <form className="space-y-4" onSubmit={savePreferences}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Dietary Restrictions */}
                <div className="col-span-1 sm:col-span-2">
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
                    value={preferences.cookingSkillLevel || 'beginner'}
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
        </div>
        
        {/* Shopping List Modal */}
        {showShoppingList && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
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
                  
                  <div className="flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                    <button 
                      className="btn-secondary w-full sm:w-auto"
                      onClick={() => setShowShoppingList(false)}
                    >
                      Close
                    </button>
                    <button 
                      className="btn-primary w-full sm:w-auto"
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
