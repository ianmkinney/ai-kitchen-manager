import { NextResponse } from 'next/server';
import { createServerClient, getCurrentUser } from '../../lib/supabase-server';
import { getTestUserDataWithAdmin } from '../../lib/admin-check';
import { createAdminClient } from '../../lib/admin-check';

// Define types for our day and meal structures
type MealType = 'breakfast' | 'lunch' | 'dinner';
type DayName = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
type RecipeData = {
  id?: string;
  name?: string;
  ingredients?: string[];
  instructions?: string[];
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

// GET - Retrieve weekly plan for the current user
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    console.log('GET /api/weekly-plan: User:', user);

    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to access this resource' },
        { status: 401 }
      );
    }

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

    // Check if this is a test user and use admin client if needed
    let weeklyPlan, recipes;
    
    if (user.id === '00000000-0000-0000-0000-000000000000') {
      console.log('Using admin client for test user weekly plan');
      const { data: weeklyPlans, error: weeklyPlansError } = await getTestUserDataWithAdmin('weekly_plans');
      
      if (weeklyPlansError) {
        console.error('GET /api/weekly-plan: Error fetching test user weekly plan:', weeklyPlansError);
        return NextResponse.json(
          { error: 'Failed to fetch weekly plan', details: weeklyPlansError },
          { status: 500 }
        );
      }
      
      weeklyPlan = weeklyPlans && weeklyPlans.length > 0 ? weeklyPlans[0] : null;
      
      if (weeklyPlan) {
        // Get recipes for the weekly plan using admin client
        const adminClient = createAdminClient();
        const { data: weeklyRecipes, error: recipesError } = await adminClient
          .from('weekly_plan_recipes')
          .select('*')
          .eq('"weeklyPlanId"', weeklyPlan.id)
          .order('"plannedDate"', { ascending: true });
          
        if (recipesError) {
          console.error('Error fetching weekly plan recipes:', recipesError);
        } else {
          recipes = weeklyRecipes;
        }
      }
    } else {
      // For regular users, create server client with our helper
      const supabase = await createServerClient();
      const { data: userWeeklyPlan, error } = await supabase
        .from('weekly_plans')
        .select('*')
        .eq('userid', user.id)
        .order('"weekStartDate"', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code === 'PGRST116') {
        // This indicates no weekly plan was found, which is a valid state
        return NextResponse.json({ 
          weeklyPlan: {
            id: null,
            userid: user.id,
            "weekStartDate": new Date().toISOString().split('T')[0],
            ...dayMap
          } 
        });
      }

      if (error) {
        console.error('GET /api/weekly-plan: Error fetching weekly plan:', error);
        return NextResponse.json(
          { error: 'Failed to fetch weekly plan', details: error.message },
          { status: 500 }
        );
      }
      
      weeklyPlan = userWeeklyPlan;
      
      if (weeklyPlan && weeklyPlan.id) {
        const { data: weeklyRecipes, error: recipesError } = await supabase
          .from('weekly_plan_recipes')
          .select('*')
          .eq('"weeklyPlanId"', weeklyPlan.id)
          .order('"plannedDate"', { ascending: true });

        if (recipesError) {
          console.error('Error fetching weekly plan recipes:', recipesError);
        } else {
          recipes = weeklyRecipes;
        }
      }
    }

    // If no weekly plan was found
    if (!weeklyPlan) {
      // Return an empty weekly plan structure
      return NextResponse.json({ 
        weeklyPlan: {
          id: null,
          userid: user.id,
          "weekStartDate": new Date().toISOString().split('T')[0],
          ...dayMap
        } 
      });
    }

    if (recipes && recipes.length > 0) {
      const weekStart = new Date(weeklyPlan["weekStartDate"]);

      recipes.forEach((recipe) => {
        if (!recipe["plannedDate"]) {
          console.warn('Recipe missing plannedDate:', recipe);
          return;
        }

        try {
          const plannedDate = new Date(recipe["plannedDate"]);
          if (isNaN(plannedDate.getTime())) {
            console.warn('Invalid planned date:', recipe["plannedDate"]);
            return;
          }

          if (isNaN(weekStart.getTime())) {
            console.warn('Invalid week start date:', weeklyPlan["weekStartDate"]);
            return;
          }

          let dayDiff = Math.floor(
            (plannedDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
          );

          dayDiff = Math.max(0, Math.min(6, dayDiff));

          const dayNames: DayName[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          const dayName: DayName = dayNames[dayDiff];

          const mealType = 
            recipe["mealType"] && ['breakfast', 'lunch', 'dinner'].includes(recipe["mealType"].toLowerCase())
              ? recipe["mealType"].toLowerCase() as MealType
              : 'dinner' as MealType;

          // Ensure recipedata has the expected structure
          const normalizedRecipeData: RecipeData = {
            ...(recipe["recipeData"] || {}),
            name: recipe["recipeData"]?.name || 'Unnamed Recipe',
            ingredients: Array.isArray(recipe["recipeData"]?.ingredients) 
              ? recipe["recipeData"].ingredients 
              : [],
            instructions: Array.isArray(recipe["recipeData"]?.instructions) 
              ? recipe["recipeData"].instructions 
              : []
          };

          dayMap[dayName][mealType].push(normalizedRecipeData);
        } catch (err) {
          console.error('Error processing recipe:', err, recipe);
        }
      });
    }

    // Return the weekly plan with proper structure
    return NextResponse.json({
      weeklyPlan: {
        id: weeklyPlan.id,
        userid: weeklyPlan.userid,
        "weekStartDate": weeklyPlan["weekStartDate"],
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

    const user = await getCurrentUser(request);
    console.log('POST /api/weekly-plan: User:', user);

    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to access this resource' },
        { status: 401 }
      );
    }

    // Extract the weekStartDate from the weeklyPlan object or use current date
    const weekStartDate = weeklyPlan.weekStartDate || new Date().toISOString().split('T')[0];
    // Extract recipes, which might be directly in weeklyPlan or in a recipes property
    const recipes = Array.isArray(weeklyPlan.recipes) ? weeklyPlan.recipes : [];

    console.log(`Processing weekly plan with weekStartDate ${weekStartDate} and ${recipes.length} recipes`);

    // Special handling for test user
    if (user.id === '00000000-0000-0000-0000-000000000000') {
      try {
        const adminClient = createAdminClient();
        
        // Delete any existing weekly plans for this user first to maintain just one plan
        console.log('Deleting any existing test user weekly plans');
        const { error: deleteOldPlansError } = await adminClient
          .from('weekly_plans')
          .delete()
          .eq('userid', user.id);
        
        if (deleteOldPlansError) {
          console.error('Error deleting old test user weekly plans:', deleteOldPlansError);
        }
        
        // Create a new weekly plan
        const { data: weeklyPlanData, error: planError } = await adminClient
          .from('weekly_plans')
          .insert({
            userid: user.id,
            "weekStartDate": weekStartDate,
            "createdAt": new Date().toISOString(),
            "updatedAt": new Date().toISOString()
          })
          .select()
          .single();
          
        if (planError) {
          console.error('Error saving test user weekly plan:', planError);
          return NextResponse.json(
            { error: 'Failed to save weekly plan', details: planError },
            { status: 500 }
          );
        }
        
        // If we have recipes, delete existing recipes and add new ones
        if (recipes.length > 0 && weeklyPlanData.id) {
          // Delete existing recipes
          const { error: deleteError } = await adminClient
            .from('weekly_plan_recipes')
            .delete()
            .eq('"weeklyPlanId"', weeklyPlanData.id);
            
          if (deleteError) {
            console.error('Error deleting test user weekly plan recipes:', deleteError);
          }
          
          // Add new recipes
          const recipesToInsert = recipes.map((recipe: RecipeInput) => ({
            "weeklyPlanId": weeklyPlanData.id,
            "recipeData": recipe.recipeData || {},
            "plannedDate": recipe.plannedDate || weekStartDate,
            "mealType": recipe.mealType || 'dinner',
            "createdAt": new Date().toISOString(),
            "updatedAt": new Date().toISOString()
          }));
          
          const { error: insertError } = await adminClient
            .from('weekly_plan_recipes')
            .insert(recipesToInsert);
            
          if (insertError) {
            console.error('Error inserting test user weekly plan recipes:', insertError);
            return NextResponse.json(
              { error: 'Failed to save weekly plan recipes', details: insertError },
              { status: 500 }
            );
          }
        }
        
        return NextResponse.json({ 
          message: 'Weekly plan saved successfully for test user',
          weeklyPlan: weeklyPlanData
        });
      } catch (adminError) {
        console.error('Error using admin client for test user:', adminError);
        return NextResponse.json(
          { error: 'Failed to save test user weekly plan', details: adminError },
          { status: 500 }
        );
      }
    }
    
    // Regular user flow with Supabase client
    const supabase = await createServerClient();
    
    // Delete any existing weekly plans for this user first to maintain just one plan
    console.log('Deleting any existing weekly plans for user:', user.id);
    const { error: deleteOldPlansError } = await supabase
      .from('weekly_plans')
      .delete()
      .eq('userid', user.id);
    
    if (deleteOldPlansError) {
      console.error('Error deleting old weekly plans:', deleteOldPlansError);
      return NextResponse.json(
        { error: 'Failed to clear old weekly plans', details: deleteOldPlansError.message },
        { status: 500 }
      );
    }
    
    // Create a new weekly plan
    const { data: savedWeeklyPlan, error: upsertError } = await supabase
      .from('weekly_plans')
      .insert({
        userid: user.id,
        "weekStartDate": weekStartDate,
        "createdAt": new Date().toISOString(),
        "updatedAt": new Date().toISOString()
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Database error during weekly plan upsert:', upsertError);
      return NextResponse.json(
        { error: 'Failed to save weekly plan', details: upsertError.message },
        { status: 500 }
      );
    }

    if (!savedWeeklyPlan || !savedWeeklyPlan.id) {
      console.error('Weekly plan was not created properly, missing ID');
      return NextResponse.json(
        { error: 'Failed to create weekly plan - no ID returned' },
        { status: 500 }
      );
    }

    // Process the recipes from the request
    if (savedWeeklyPlan?.id) {
      // Delete existing recipes if any
      const { error: deleteError } = await supabase
        .from('weekly_plan_recipes')
        .delete()
        .eq('"weeklyPlanId"', savedWeeklyPlan.id);

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
          "weeklyPlanId": savedWeeklyPlan.id,
          "recipeData": recipe.recipeData || {},
          "plannedDate": recipe.plannedDate || weekStartDate,
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
        id: savedWeeklyPlan.id,
        userid: savedWeeklyPlan.userid,
        "weekStartDate": savedWeeklyPlan["weekStartDate"],
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