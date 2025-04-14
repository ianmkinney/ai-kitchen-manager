import { NextResponse } from 'next/server';
import { createServerClient, getCurrentUser } from '../../lib/supabase-server';

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

    const supabase = await createServerClient();
    const { data: weeklyPlan, error } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('userId', user.id)
      .order('weekStartDate', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code === 'PGRST116') {
      return NextResponse.json({ weeklyPlan: null });
    }

    if (error) {
      console.error('GET /api/weekly-plan: Error fetching weekly plan:', error);
      return NextResponse.json(
        { error: 'Failed to fetch weekly plan', details: error.message },
        { status: 500 }
      );
    }

    const { data: recipes, error: recipesError } = await supabase
      .from('weekly_plan_recipes')
      .select('*')
      .eq('weeklyPlanId', weeklyPlan.id)
      .order('plannedDate', { ascending: true });

    if (recipesError) {
      console.error('Error fetching weekly plan recipes:', recipesError);
    }

    const dayMap = {
      Mon: { breakfast: [], lunch: [], dinner: [] },
      Tue: { breakfast: [], lunch: [], dinner: [] },
      Wed: { breakfast: [], lunch: [], dinner: [] },
      Thu: { breakfast: [], lunch: [], dinner: [] },
      Fri: { breakfast: [], lunch: [], dinner: [] },
      Sat: { breakfast: [], lunch: [], dinner: [] },
      Sun: { breakfast: [], lunch: [], dinner: [] },
    };

    if (recipes && recipes.length > 0) {
      const weekStart = new Date(weeklyPlan.weekStartDate);

      recipes.forEach((recipe) => {
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

          if (isNaN(weekStart.getTime())) {
            console.warn('Invalid week start date:', weeklyPlan.weekStartDate);
            return;
          }

          let dayDiff = Math.floor(
            (plannedDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
          );

          dayDiff = Math.max(0, Math.min(6, dayDiff));

          const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          const dayName = dayNames[dayDiff];

          const mealType =
            recipe.mealType && ['breakfast', 'lunch', 'dinner'].includes(recipe.mealType.toLowerCase())
              ? recipe.mealType.toLowerCase()
              : 'dinner';

          if (dayMap[dayName]) {
            dayMap[dayName][mealType].push(recipe.recipeData || {});
          }
        } catch (err) {
          console.error('Error processing recipe:', err, recipe);
        }
      });
    }

    return NextResponse.json({
      weeklyPlan: {
        id: weeklyPlan.id,
        userId: weeklyPlan.userId,
        weekStartDate: weeklyPlan.weekStartDate,
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
    const { weekStartDate, recipes } = body;

    if (!weekStartDate) {
      console.error('Missing weekStartDate in request');
      return NextResponse.json(
        { error: 'weekStartDate is required' },
        { status: 400 }
      );
    }

    if (!recipes || !Array.isArray(recipes)) {
      console.error('Missing or invalid recipes array in request');
      return NextResponse.json(
        { error: 'recipes must be a valid array' },
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

    const supabase = await createServerClient();
    const { data: weeklyPlan, error: upsertError } = await supabase
      .from('weekly_plans')
      .upsert({
        userId: user.id,
        weekStartDate: weekStartDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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

    if (!weeklyPlan || !weeklyPlan.id) {
      console.error('Weekly plan was not created properly, missing ID');
      return NextResponse.json(
        { error: 'Failed to create weekly plan - no ID returned' },
        { status: 500 }
      );
    }

    const { error: deleteError } = await supabase
      .from('weekly_plan_recipes')
      .delete()
      .eq('weeklyPlanId', weeklyPlan.id);

    if (deleteError) {
      console.error('Error deleting existing recipes:', deleteError);
    }

    if (recipes && recipes.length > 0) {
      const recipesToInsert = recipes.map((recipe) => ({
        weeklyPlanId: weeklyPlan.id,
        recipeData: recipe.recipeData || {},
        plannedDate: recipe.plannedDate || null,
        mealType: recipe.mealType || 'dinner',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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

    return NextResponse.json({
      success: true,
      weeklyPlanId: weeklyPlan.id,
    });
  } catch (error) {
    console.error('Error in weekly plan API:', error);
    return NextResponse.json(
      { error: 'Failed to save weekly plan' },
      { status: 500 }
    );
  }
}