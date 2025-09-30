import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getCurrentUser } from '../../lib/supabase-server';

// Define types for our recipe data
interface RecipeData {
  id?: string;
  name: string;
  ingredients: string[] | unknown;
  instructions: string[] | unknown;
  cuisine?: string;
  description?: string;
  difficulty?: string;
  time?: string;
  prepTime?: string;
  cookTime?: string;
  servings?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

// Helper function to safely parse JSON
function safeParseJson(jsonString: unknown): unknown {
  if (typeof jsonString === 'string') {
    try {
      return JSON.parse(jsonString);
    } catch {
      return jsonString;
    }
  }
  return jsonString;
}

// GET handler for retrieving all custom recipes for the current user
export async function GET() {
  try {
    // Get current user using Supabase Auth
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Initialize Supabase server client
    const supabase = await createServerClient();
    
    console.log('Fetching recipes for user:', user.id);
    
    try {
      // Query the database for all custom recipes belonging to the user
      const { data: customRecipes, error } = await supabase
        .from('custom_recipes')
        .select('*')
        .eq('userId', user.id)
        .order('createdAt', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      console.log(`Found ${customRecipes?.length || 0} recipes for user`);
      
      // Process recipes to ensure proper JSON parsing
      const formattedRecipes = customRecipes?.map(recipe => ({
        ...recipe,
        ingredients: safeParseJson(recipe.ingredients),
        instructions: safeParseJson(recipe.instructions)
      })) || [];
      
      // Return the recipes as JSON
      return NextResponse.json({ customRecipes: formattedRecipes });
    } catch (error) {
      console.error('Error fetching user recipes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recipes' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in GET /api/custom-recipes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST handler for creating new custom recipes
export async function POST(request: NextRequest) {
  try {
    // Get current user using Supabase Auth
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Initialize Supabase server client
    const supabase = await createServerClient();
    
    // Parse the request body to get the recipe data
    const recipeData = await request.json() as RecipeData;
    
    // Validate required fields
    if (!recipeData.name || !recipeData.ingredients || !recipeData.instructions) {
      return NextResponse.json(
        { error: 'Name, ingredients, and instructions are required' },
        { status: 400 }
      );
    }
    
    // Prepare the recipe data for insertion
    const newRecipe = {
      name: recipeData.name,
      ingredients: JSON.stringify(recipeData.ingredients),
      instructions: JSON.stringify(recipeData.instructions),
      cuisine: recipeData.cuisine || 'International',
      description: recipeData.description || '',
      difficulty: recipeData.difficulty || 'Easy',
      time: recipeData.time || recipeData.prepTime || '30 minutes',
      prepTime: recipeData.prepTime || '10 minutes',
      cookTime: recipeData.cookTime || '20 minutes',
      servings: recipeData.servings || 2,
      calories: recipeData.calories || 0,
      protein: recipeData.protein || 0,
      carbs: recipeData.carbs || 0,
      fat: recipeData.fat || 0,
      userId: user.id
    };
    
    // Insert the new recipe
    const { data: insertedRecipe, error } = await supabase
      .from('custom_recipes')
      .insert(newRecipe)
      .select()
      .single();
    
    if (error) {
      console.error('Error inserting recipe:', error);
      return NextResponse.json(
        { error: 'Failed to save recipe' },
        { status: 500 }
      );
    }
    
    // Return the created recipe
    return NextResponse.json({ 
      recipe: {
        ...insertedRecipe,
        ingredients: safeParseJson(insertedRecipe.ingredients),
        instructions: safeParseJson(insertedRecipe.instructions)
      }
    });
    
  } catch (error) {
    console.error('Error in POST /api/custom-recipes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}