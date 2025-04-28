import { NextResponse } from 'next/server';
import { createServerClient, getCurrentUser } from '../../lib/supabase-server';

export async function GET(request: Request) {
  try {
    // Get the current user
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to access this resource' },
        { status: 401 }
      );
    }
    
    // Create server client 
    const supabase = await createServerClient();
    
    // Get all weekly plans for the user
    console.log('Fetching all weekly plans for user:', user.id);
    const { data: weeklyPlans, error: weeklyPlansError } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('userid', user.id)
      .order('weekStartDate', { ascending: false });
    
    console.log('Weekly plans found:', weeklyPlans?.length || 0);

    if (weeklyPlansError) {
      console.error('Error fetching weekly plans:', weeklyPlansError);
      return NextResponse.json(
        { error: 'Failed to fetch weekly plans', details: weeklyPlansError.message },
        { status: 500 }
      );
    }

    // If no plans found, return empty array
    if (!weeklyPlans || weeklyPlans.length === 0) {
      return NextResponse.json({ 
        weeklyPlans: [],
        message: 'No weekly plans found for this user'
      });
    }

    // Get all recipes from all plans
    console.log('Fetching recipes from all plans...');
    const allRecipes = [];
    
    for (const plan of weeklyPlans) {
      const { data: weeklyRecipes, error: recipesError } = await supabase
        .from('weekly_plan_recipes')
        .select('*')
        .eq('weeklyPlanId', plan.id);
        
      if (recipesError) {
        console.error(`Error fetching recipes for plan ${plan.id}:`, recipesError);
        continue; // Skip this plan if there's an error, but continue with others
      }
      
      if (weeklyRecipes && weeklyRecipes.length > 0) {
        console.log(`Found ${weeklyRecipes.length} recipes for plan ${plan.id}`);
        
        // Extract recipes and add plan info
        for (const recipe of weeklyRecipes) {
          if (recipe.recipeData && typeof recipe.recipeData === 'object') {
            const recipeData = {
              ...recipe.recipeData,
              isWeeklyPlan: true,
              weeklyPlanId: plan.id,
              weekStartDate: plan.weekStartDate,
              plannedDate: recipe.plannedDate,
              mealType: recipe.mealType
            };
            
            // Only add if recipe has a name
            if (recipeData.name) {
              allRecipes.push(recipeData);
            }
          }
        }
      }
    }
    
    // Remove duplicate recipes (keep only one copy of each recipe name)
    const uniqueRecipes = [];
    const recipeNames = new Set();
    
    for (const recipe of allRecipes) {
      if (!recipeNames.has(recipe.name)) {
        recipeNames.add(recipe.name);
        uniqueRecipes.push(recipe);
      }
    }
    
    console.log(`Found ${uniqueRecipes.length} unique recipes across all plans`);
    
    return NextResponse.json({
      weeklyPlans: weeklyPlans,
      recipes: uniqueRecipes
    });
    
  } catch (error) {
    console.error('Error in all-plans API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch all plans and recipes' },
      { status: 500 }
    );
  }
} 