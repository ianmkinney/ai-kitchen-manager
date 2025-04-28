import { NextResponse } from 'next/server';
import { createServerClient, getCurrentUser } from '../../lib/supabase-server';
import { getTestUserDataWithAdmin } from '../../lib/admin-check';

// Define types for our day and meal structures
type MealType = 'breakfast' | 'lunch' | 'dinner';
type DayName = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
type RecipeData = {
  id?: string;
  name?: string;
  ingredients?: string[];
  instructions?: string[];
  servingSize?: number;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  nutritionInfo?: Record<string, unknown>;
  [key: string]: unknown; // Allow for additional properties
};

// Type for recipe input when saving
type RecipeInput = {
  recipeData?: RecipeData;
  plannedDate?: string;
  mealType?: string;
  [key: string]: unknown;
};

type DayMeals = {
  [key in MealType]: RecipeData[];
};

type WeeklyPlanMap = {
  [key in DayName]: DayMeals;
};

// Define a type for recipe objects in arrays
type RecipeObject = {
  weeklyPlanId?: string;
  recipeData?: RecipeData;
  plannedDate?: string;
  mealType?: string;
  [key: string]: unknown;
};

// GET - Retrieve weekly plan for the current user
export async function GET(request: Request) {
  const url = new URL(request.url);
  const weekStartDate = url.searchParams.get('weekStartDate');
  
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to access this resource' },
        { status: 401 }
      );
    }
    
    // Create server client 
    const supabase = await createServerClient();
    
    // Get weekly plan for the specific week start date
    console.log('Fetching weekly plan for weekStartDate:', weekStartDate);
    const { data: weeklyPlans, error: weeklyPlansError } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('userid', user.id)
      .eq('weekStartDate', weekStartDate);
    
    console.log('Weekly plans found:', weeklyPlans?.length || 0);

    if (weeklyPlansError) {
      console.error('Error fetching weekly plans:', weeklyPlansError);
      return NextResponse.json(
        { error: 'Failed to fetch weekly plans', details: weeklyPlansError.message },
        { status: 500 }
      );
    }

    // Get weekly plan recipes
    const weeklyPlanId = weeklyPlans && weeklyPlans.length > 0 ? weeklyPlans[0].id : null;

    // Initialize the empty weekly plan structure
    const dayMap: WeeklyPlanMap = {
      Mon: { breakfast: [], lunch: [], dinner: [] },
      Tue: { breakfast: [], lunch: [], dinner: [] },
      Wed: { breakfast: [], lunch: [], dinner: [] },
      Thu: { breakfast: [], lunch: [], dinner: [] },
      Fri: { breakfast: [], lunch: [], dinner: [] },
      Sat: { breakfast: [], lunch: [], dinner: [] },
      Sun: { breakfast: [], lunch: [], dinner: [] },
    };

    // If no weekly plan was found
    if (!weeklyPlanId) {
      // Return an empty weekly plan structure
      return NextResponse.json({ 
        weeklyPlan: {
          id: null,
          userid: user.id,
          "weekStartDate": weekStartDate || new Date().toISOString().split('T')[0],
          ...dayMap
        } 
      });
    }

    // Check if this is a test user and use admin client if needed
    let recipes: RecipeObject[] = [];
    
    // If we found a weekly plan, get its start date
    const weekStart = weeklyPlans && weeklyPlans.length > 0 ? new Date(weeklyPlans[0].weekStartDate) : null;
    
    // Only use test user case if the user is actually the test user
    if (user.id === '00000000-0000-0000-0000-000000000000' && 
        user.email === 'test@ecochef.demo') {
      console.log('Using admin client for test user weekly plan');
      const { data: weeklyRecipes, error: recipesError } = await getTestUserDataWithAdmin('weekly_plan_recipes');
      
      if (recipesError) {
        console.error('GET /api/weekly-plan: Error fetching test user weekly plan:', recipesError);
        return NextResponse.json(
          { error: 'Failed to fetch weekly plan', details: recipesError },
          { status: 500 }
        );
      }
      
      if (weeklyRecipes && weeklyRecipes.length > 0) {
        recipes = weeklyRecipes.filter((recipe: RecipeObject) => recipe.weeklyPlanId === weeklyPlanId);
      }
    } else {
      console.log('Using server client for regular user weekly plan');
      
      // For regular users
      const { data: weeklyRecipes, error: recipesError } = await supabase
        .from('weekly_plan_recipes')
        .select('*')
        .eq('weeklyPlanId', weeklyPlanId)
        .order('plannedDate', { ascending: true });

      if (recipesError) {
        console.error('Error fetching weekly plan recipes:', recipesError);
        return NextResponse.json(
          { error: 'Failed to fetch recipes', details: recipesError.message },
          { status: 500 }
        );
      }
      
      recipes = weeklyRecipes || [];
    }

    if (recipes && recipes.length > 0) {
      // Use weekStart if available, otherwise default to current date
      const weekStartDate = weekStart || new Date();

      recipes.forEach((recipe: RecipeObject) => {
        if (!recipe.plannedDate) {
          console.warn('Recipe missing plannedDate:', recipe);
          return;
        }

        try {
          const plannedDate = new Date(recipe.plannedDate);
          if (isNaN(plannedDate.getTime())) {
            console.warn('Invalid planned date:', recipe.plannedDate);
            return;
          }

          if (weekStart && isNaN(weekStart.getTime())) {
            console.warn('Invalid week start date:', weeklyPlans && weeklyPlans[0]?.weekStartDate);
            return;
          }

          let dayDiff = Math.floor(
            (plannedDate.getTime() - weekStartDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          dayDiff = Math.max(0, Math.min(6, dayDiff));

          const dayNames: DayName[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          const dayName: DayName = dayNames[dayDiff];

          const mealType = 
            recipe.mealType && ['breakfast', 'lunch', 'dinner'].includes(recipe.mealType.toLowerCase())
              ? recipe.mealType.toLowerCase() as MealType
              : 'dinner' as MealType;

          // Ensure recipedata has the expected structure
          const normalizedRecipeData: RecipeData = {
            ...(recipe.recipeData || {}),
            name: recipe.recipeData?.name || 'Unnamed Recipe',
            ingredients: Array.isArray(recipe.recipeData?.ingredients) 
              ? recipe.recipeData.ingredients 
              : [],
            instructions: Array.isArray(recipe.recipeData?.instructions) 
              ? recipe.recipeData.instructions 
              : [],
            servingSize: recipe.recipeData?.servingSize || 1,
            calories: recipe.recipeData?.calories || null,
            protein: recipe.recipeData?.protein || null,
            carbs: recipe.recipeData?.carbs || null,
            fat: recipe.recipeData?.fat || null,
            nutritionInfo: recipe.recipeData?.nutritionInfo || {}
          };

          dayMap[dayName][mealType].push(normalizedRecipeData);
        } catch (err) {
          console.error('Error processing recipe:', err, recipe);
        }
      });
    }

    // Ensure we have the correct weekStartDate value for the response
    const responseWeekStartDate = weeklyPlans && weeklyPlans.length > 0
      ? weeklyPlans[0].weekStartDate
      : weekStartDate || new Date().toISOString().split('T')[0];

    // Return the weekly plan with proper structure
    return NextResponse.json({
      weeklyPlan: {
        id: weeklyPlanId,
        userid: user.id,
        "weekStartDate": responseWeekStartDate,
        ...dayMap,
      },
    });
  } catch (error) {
    console.error('Error in weekly plan API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weekly plan' },
      { status: 500 }
    );
  }
}

// POST - Save weekly plan for the current user
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Weekly plan POST received body:', JSON.stringify(body, null, 2));
    
    // Check for required data, allowing for different formats
    const weeklyPlan = body.weeklyPlan;
    if (!weeklyPlan) {
      console.error('Missing weeklyPlan in request body');
      return NextResponse.json(
        { error: 'weeklyPlan is required' },
        { status: 400 }
      );
    }

    // Ensure weekStartDate is provided
    if (!weeklyPlan.weekStartDate) {
      console.error('Missing weekStartDate in weekly plan');
      return NextResponse.json(
        { error: 'weekStartDate is required' },
        { status: 400 }
      );
    }

    const user = await getCurrentUser(request);
    console.log('POST /api/weekly-plan: User:', user);

    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to access this resource' },
        { status: 401 }
      );
    }

    // Get recipes from the weekly plan (should be an array)
    const recipes = weeklyPlan.recipes || [];
    if (!Array.isArray(recipes)) {
      console.error('Recipes must be an array');
      return NextResponse.json(
        { error: 'recipes must be an array' },
        { status: 400 }
      );
    }

    // Create server client 
    const supabase = await createServerClient();

    // First check if a weekly plan already exists for this week
    const { data: existingPlans, error: queryError } = await supabase
      .from('weekly_plans')
      .select('id')
      .eq('userid', user.id)
      .eq('"weekStartDate"', weeklyPlan.weekStartDate);

    if (queryError) {
      console.error('Error checking existing weekly plans:', queryError);
      return NextResponse.json(
        { error: 'Failed to check existing weekly plans', details: queryError.message },
        { status: 500 }
      );
    }

    let weeklyPlanId: string;

    // If plan exists, update it, otherwise create a new one
    if (existingPlans && existingPlans.length > 0) {
      weeklyPlanId = existingPlans[0].id;
      console.log(`Updating existing weekly plan ${weeklyPlanId} for week starting ${weeklyPlan.weekStartDate}`);
      
      // Update the weekly plan
      const { error: updateError } = await supabase
        .from('weekly_plans')
        .update({
          "weekStartDate": weeklyPlan.weekStartDate,
          "updatedAt": new Date().toISOString()
        })
        .eq('id', weeklyPlanId);

      if (updateError) {
        console.error('Error updating weekly plan:', updateError);
        return NextResponse.json(
          { error: 'Failed to update weekly plan', details: updateError.message },
          { status: 500 }
        );
      }

      // Delete existing recipes for this plan
      const { error: deleteError } = await supabase
        .from('weekly_plan_recipes')
        .delete()
        .eq('"weeklyPlanId"', weeklyPlanId);

      if (deleteError) {
        console.error('Error deleting existing recipes:', deleteError);
        return NextResponse.json(
          { error: 'Failed to update weekly plan recipes', details: deleteError.message },
          { status: 500 }
        );
      }
    } else {
      // Create a new weekly plan
      console.log(`Creating new weekly plan for week starting ${weeklyPlan.weekStartDate}`);
      const { data: newPlan, error: insertError } = await supabase
        .from('weekly_plans')
        .insert({
          userid: user.id,
          "weekStartDate": weeklyPlan.weekStartDate,
          "createdAt": new Date().toISOString(),
          "updatedAt": new Date().toISOString()
        })
        .select();

      if (insertError) {
        console.error('Error creating weekly plan:', insertError);
        return NextResponse.json(
          { error: 'Failed to create weekly plan', details: insertError.message },
          { status: 500 }
        );
      }

      if (!newPlan || newPlan.length === 0) {
        console.error('No weekly plan created');
        return NextResponse.json(
          { error: 'Failed to create weekly plan - no data returned' },
          { status: 500 }
        );
      }

      weeklyPlanId = newPlan[0].id;
    }

    // Process the recipes from the request
    if (weeklyPlanId) {
      // Delete existing recipes if any
      const { error: deleteError } = await supabase
        .from('weekly_plan_recipes')
        .delete()
        .eq('"weeklyPlanId"', weeklyPlanId);

      if (deleteError) {
        console.error('Error deleting existing weekly plan recipes:', deleteError);
        return NextResponse.json(
          { error: 'Failed to update weekly plan recipes', details: deleteError.message },
          { status: 500 }
        );
      }

      // Add the new recipes if any
      if (recipes.length > 0) {
        // Define a type for recipe objects in the array
        
        const recipesToInsert = recipes.map((recipe: RecipeInput) => ({
          "weeklyPlanId": weeklyPlanId,
          "recipeData": recipe.recipeData || {},
          "plannedDate": recipe.plannedDate || weeklyPlan.weekStartDate,
          "mealType": recipe.mealType || 'dinner',
          "createdAt": new Date().toISOString(),
          "updatedAt": new Date().toISOString()
        }));

        const { error: insertError } = await supabase
          .from('weekly_plan_recipes')
          .insert(recipesToInsert);

        if (insertError) {
          console.error('Error inserting recipes:', insertError);
          return NextResponse.json(
            { error: 'Failed to save recipes', details: insertError.message },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      weeklyPlan: {
        id: weeklyPlanId,
        userid: user.id,
        "weekStartDate": weeklyPlan.weekStartDate,
      },
    });
  } catch (error) {
    console.error('Error in weekly plan save API:', error);
    return NextResponse.json(
      { error: 'Failed to save weekly plan' },
      { status: 500 }
    );
  }
}