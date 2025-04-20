// filepath: c:\Users\Katie\OneDrive\Desktop\Ian's Stuff\ai-kitchen-manager\ecochef-ai\app\api\custom-recipes\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '../../lib/supabase-server';

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
}

// Mock recipes to use when database is unavailable
const mockCustomRecipes = [
  {
    id: "mock-recipe-1",
    userId: "00000000-0000-0000-0000-000000000000",
    name: "Pasta with Tomato Sauce",
    ingredients: ["Pasta", "Tomatoes", "Garlic", "Olive oil", "Basil"],
    instructions: ["Boil pasta", "Sauté garlic in oil", "Add tomatoes and simmer", "Mix with pasta", "Garnish with basil"],
    cuisine: "Italian",
    description: "A simple and delicious pasta dish",
    difficulty: "Easy",
    time: "20 minutes",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "mock-recipe-2",
    userId: "00000000-0000-0000-0000-000000000000",
    name: "Avocado Toast",
    ingredients: ["Bread", "Avocado", "Salt", "Pepper", "Lemon juice"],
    instructions: ["Toast bread", "Mash avocado", "Season with salt, pepper, and lemon juice", "Spread on toast"],
    cuisine: "American",
    description: "Quick and nutritious breakfast",
    difficulty: "Easy",
    time: "5 minutes",
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Helper function to safely parse JSON from database
function safeParseJson(value: any, defaultValue: any[] = []): any[] {
  if (Array.isArray(value)) {
    return value;
  }
  
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : defaultValue;
    } catch {
      return defaultValue;
    }
  }
  
  return defaultValue;
}

// GET handler for retrieving all custom recipes for the current user
export async function GET() {
  try {
    // Initialize Supabase server client
    const supabase = await createServerClient();
    
    // Handle test user case
    if (supabase.testMode) {
      const testUserId = supabase.testUser?.id || '00000000-0000-0000-0000-000000000000';
      
      console.log('Fetching recipes for test user:', testUserId);
      
      try {
        // Query the database for all custom recipes belonging to the test user
        const { data: customRecipes, error } = await supabase
          .from('custom_recipes')
          .select('*')
          .eq('userId', testUserId)
          .order('createdAt', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        console.log(`Found ${customRecipes?.length || 0} test user recipes`);
        
        // Process recipes to ensure proper JSON parsing
        const formattedRecipes = customRecipes?.map(recipe => ({
          ...recipe,
          ingredients: safeParseJson(recipe.ingredients),
          instructions: safeParseJson(recipe.instructions)
        })) || [];
        
        // Return the recipes as JSON
        return NextResponse.json({ customRecipes: formattedRecipes });
      } catch (error) {
        // If we hit an error, use mock recipes for test user
        console.warn('Error fetching test user recipes, returning mock data:', error);
        return NextResponse.json({ 
          customRecipes: mockCustomRecipes,
          isMockData: true 
        });
      }
    }
    
    // For normal users, get the user from Supabase auth
    const { data: { user } } = await supabase.auth.getUser();
    
    // If no user is authenticated, return 401 Unauthorized response
    if (!user) {
      console.warn('User not authenticated when fetching custom recipes');
      return NextResponse.json(
        { error: 'You must be logged in to access your custom recipes' },
        { status: 401 }
      );
    }
    
    console.log('Fetching recipes for authenticated user:', user.id);
    
    try {
      // Query the database for all custom recipes belonging to the current user
      const { data: customRecipes, error } = await supabase
        .from('custom_recipes')
        .select('*')
        .eq('userId', user.id)
        .order('createdAt', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      console.log(`Found ${customRecipes?.length || 0} recipes for user ${user.id}`);
      
      // Process recipes to ensure proper JSON parsing
      const formattedRecipes = customRecipes?.map(recipe => ({
        ...recipe,
        ingredients: safeParseJson(recipe.ingredients),
        instructions: safeParseJson(recipe.instructions)
      })) || [];
      
      // Return the recipes as JSON
      return NextResponse.json({ customRecipes: formattedRecipes });
    } catch (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error fetching custom recipes:', error);
    
    // Enhanced error logging for debugging server issues
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch custom recipes', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST handler for creating a new custom recipe
export async function POST(req: NextRequest) {
  try {
    // Initialize Supabase server client
    const supabase = await createServerClient();
    
    // Handle test user case
    if (supabase.testMode) {
      const testUserId = supabase.testUser?.id || '00000000-0000-0000-0000-000000000000';
      
      console.log('Creating recipe for test user:', testUserId);
      
      // Parse the request body to get the new recipe data
      const recipeData = await req.json() as RecipeData;
      
      // Validate required fields
      if (!recipeData.name) {
        return NextResponse.json(
          { error: 'Recipe name is required' },
          { status: 400 }
        );
      }
      
      // Ensure ingredients and instructions are arrays of strings
      let ingredients = safeParseJson(recipeData.ingredients);
      let instructions = safeParseJson(recipeData.instructions);
      
      // Prepare data to insert
      const newRecipeData = {
        userId: testUserId,
        name: recipeData.name,
        ingredients,
        instructions,
        cuisine: recipeData.cuisine || undefined,
        description: recipeData.description || undefined,
        difficulty: recipeData.difficulty || undefined,
        time: recipeData.time || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('Data being sent to Supabase (test user):', JSON.stringify(newRecipeData, null, 2));

      // Create the new recipe in the database
      const { data: newRecipe, error } = await supabase
        .from('custom_recipes')
        .insert(newRecipeData)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('New recipe created:', newRecipe.id);
      
      // Return the newly created recipe
      return NextResponse.json({ 
        recipe: {
          ...newRecipe,
          ingredients: safeParseJson(newRecipe.ingredients),
          instructions: safeParseJson(newRecipe.instructions),
        },
        message: 'Recipe created successfully' 
      }, { status: 201 });
    }
    
    // For normal users, get the user from Supabase auth
    const { data: { user } } = await supabase.auth.getUser();
    
    // If no user is authenticated, return a 401 Unauthorized response
    if (!user) {
      console.warn('User not authenticated when creating a custom recipe');
      return NextResponse.json(
        { error: 'You must be logged in to create custom recipes' },
        { status: 401 }
      );
    }
    
    console.log('Creating recipe for authenticated user:', user.id);
    
    // Parse the request body to get the new recipe data
    const recipeData = await req.json() as RecipeData;
    
    // Validate required fields
    if (!recipeData.name) {
      return NextResponse.json(
        { error: 'Recipe name is required' },
        { status: 400 }
      );
    }
    
    // Ensure ingredients and instructions are arrays of strings
    let ingredients = safeParseJson(recipeData.ingredients);
    let instructions = safeParseJson(recipeData.instructions);
    
    // Prepare data to insert
    const newRecipeData = {
      userId: user.id,
      name: recipeData.name,
      ingredients,
      instructions,
      cuisine: recipeData.cuisine || undefined,
      description: recipeData.description || undefined,
      difficulty: recipeData.difficulty || undefined,
      time: recipeData.time || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('Data being sent to Supabase (normal user):', JSON.stringify(newRecipeData, null, 2));

    // Create the new recipe in the database
    const { data: newRecipe, error } = await supabase
      .from('custom_recipes')
      .insert(newRecipeData)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    console.log('New recipe created:', newRecipe.id);
    
    // Return the newly created recipe
    return NextResponse.json({ 
      recipe: {
        ...newRecipe,
        ingredients: safeParseJson(newRecipe.ingredients),
        instructions: safeParseJson(newRecipe.instructions),
      },
      message: 'Recipe created successfully' 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating custom recipe:', error);
    
    // Enhanced error logging for debugging server issues
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to create custom recipe', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT handler for updating an existing custom recipe
export async function PUT(req: NextRequest) {
  try {
    // Initialize Supabase server client
    const supabase = await createServerClient();
    
    // Handle test user case
    if (supabase.testMode) {
      const testUserId = supabase.testUser?.id || '00000000-0000-0000-0000-000000000000';
      
      console.log('Updating recipe for test user:', testUserId);
      
      // Parse the request body to get the updated recipe data
      const recipeData = await req.json() as RecipeData;
      
      // Validate required fields
      if (!recipeData.id || !recipeData.name) {
        return NextResponse.json(
          { error: 'Recipe ID and name are required' },
          { status: 400 }
        );
      }
      
      // Check if the recipe exists and belongs to the test user
      const { data: existingRecipe, error: findError } = await supabase
        .from('custom_recipes')
        .select('*')
        .eq('id', recipeData.id)
        .eq('userId', testUserId)
        .single();
      
      if (findError || !existingRecipe) {
        console.warn(`Recipe ${recipeData.id} not found for test user or permission denied`);
        return NextResponse.json(
          { error: 'Recipe not found or you do not have permission to update it' },
          { status: 404 }
        );
      }
      
      console.log(`Found existing recipe: ${existingRecipe.id} - ${existingRecipe.name}`);
      
      // Ensure ingredients and instructions are arrays
      let ingredients = safeParseJson(recipeData.ingredients);
      let instructions = safeParseJson(recipeData.instructions);
      
      console.log('Data being sent to update recipe:', {
        id: recipeData.id,
        name: recipeData.name,
        ingredients: ingredients.length,
        instructions: instructions.length
      });
      
      // Update the recipe in the database
      const { data: updatedRecipe, error: updateError } = await supabase
        .from('custom_recipes')
        .update({
          name: recipeData.name,
          ingredients,
          instructions,
          cuisine: recipeData.cuisine || undefined,
          description: recipeData.description || undefined,
          difficulty: recipeData.difficulty || undefined,
          time: recipeData.time || undefined,
          updatedAt: new Date().toISOString()
        })
        .eq('id', recipeData.id)
        .select()
        .single();
      
      if (updateError) {
        throw updateError;
      }
      
      console.log(`Recipe updated successfully: ${updatedRecipe.id}`);
      
      // Return the updated recipe
      return NextResponse.json({ 
        recipe: {
          ...updatedRecipe,
          ingredients: safeParseJson(updatedRecipe.ingredients),
          instructions: safeParseJson(updatedRecipe.instructions)
        },
        message: 'Recipe updated successfully' 
      });
    }
    
    // For normal users, get the user from Supabase auth
    const { data: { user } } = await supabase.auth.getUser();
    
    // If no user is authenticated, return a 401 Unauthorized response
    if (!user) {
      console.warn('User not authenticated when updating a custom recipe');
      return NextResponse.json(
        { error: 'You must be logged in to update custom recipes' },
        { status: 401 }
      );
    }
    
    console.log('Updating recipe for authenticated user:', user.id);
    
    // Parse the request body to get the updated recipe data
    const recipeData = await req.json() as RecipeData;
    
    // Validate required fields
    if (!recipeData.id || !recipeData.name) {
      return NextResponse.json(
        { error: 'Recipe ID and name are required' },
        { status: 400 }
      );
    }
    
    // Check if the recipe exists and belongs to the current user
    const { data: existingRecipe, error: findError } = await supabase
      .from('custom_recipes')
      .select('*')
      .eq('id', recipeData.id)
      .eq('userId', user.id)
      .single();
    
    if (findError || !existingRecipe) {
      console.warn(`Recipe ${recipeData.id} not found for user ${user.id} or permission denied`);
      return NextResponse.json(
        { error: 'Recipe not found or you do not have permission to update it' },
        { status: 404 }
      );
    }
    
    console.log(`Found existing recipe: ${existingRecipe.id} - ${existingRecipe.name}`);
    
    // Ensure ingredients and instructions are arrays
    let ingredients = safeParseJson(recipeData.ingredients);
    let instructions = safeParseJson(recipeData.instructions);
    
    console.log('Data being sent to update recipe:', {
      id: recipeData.id,
      name: recipeData.name,
      ingredients: ingredients.length,
      instructions: instructions.length
    });
    
    // Update the recipe in the database
    const { data: updatedRecipe, error: updateError } = await supabase
      .from('custom_recipes')
      .update({
        name: recipeData.name,
        ingredients,
        instructions,
        cuisine: recipeData.cuisine || undefined,
        description: recipeData.description || undefined,
        difficulty: recipeData.difficulty || undefined,
        time: recipeData.time || undefined,
        updatedAt: new Date().toISOString()
      })
      .eq('id', recipeData.id)
      .select()
      .single();
    
    if (updateError) {
      throw updateError;
    }
    
    console.log(`Recipe updated successfully: ${updatedRecipe.id}`);
    
    // Return the updated recipe
    return NextResponse.json({ 
      recipe: {
        ...updatedRecipe,
        ingredients: safeParseJson(updatedRecipe.ingredients),
        instructions: safeParseJson(updatedRecipe.instructions)
      },
      message: 'Recipe updated successfully' 
    });
  } catch (error) {
    console.error('Error updating custom recipe:', error);
    
    // Enhanced error logging for debugging server issues
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to update custom recipe', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE handler for removing a custom recipe
export async function DELETE(req: NextRequest) {
  try {
    // Initialize Supabase server client
    const supabase = await createServerClient();
    
    // Handle test user case
    if (supabase.testMode) {
      const testUserId = supabase.testUser?.id || '00000000-0000-0000-0000-000000000000';
      
      console.log('Deleting recipe for test user:', testUserId);
      
      // Get the recipe ID from the URL
      const url = new URL(req.url);
      const recipeId = url.searchParams.get('id');
      
      if (!recipeId) {
        console.warn('Recipe ID missing in delete request');
        return NextResponse.json(
          { error: 'Recipe ID is required' },
          { status: 400 }
        );
      }
      
      console.log(`Attempting to delete recipe: ${recipeId}`);
      
      // Check if the recipe exists and belongs to the test user
      const { data: existingRecipe, error: findError } = await supabase
        .from('custom_recipes')
        .select('*')
        .eq('id', recipeId)
        .eq('userId', testUserId)
        .single();
      
      if (findError || !existingRecipe) {
        console.warn(`Recipe ${recipeId} not found for test user or permission denied`);
        return NextResponse.json(
          { error: 'Recipe not found or you do not have permission to delete it' },
          { status: 404 }
        );
      }
      
      console.log(`Found recipe to delete: ${existingRecipe.id} - ${existingRecipe.name}`);
      
      // Delete the recipe from the database
      const { error: deleteError } = await supabase
        .from('custom_recipes')
        .delete()
        .eq('id', recipeId);
      
      if (deleteError) {
        throw deleteError;
      }
      
      console.log(`Recipe deleted successfully: ${recipeId}`);
      
      // Return success message
      return NextResponse.json({ 
        message: 'Recipe deleted successfully' 
      });
    }
    
    // For normal users, get the user from Supabase auth
    const { data: { user } } = await supabase.auth.getUser();
    
    // If no user is authenticated, return a 401 Unauthorized response
    if (!user) {
      console.warn('User not authenticated when deleting a custom recipe');
      return NextResponse.json(
        { error: 'You must be logged in to delete custom recipes' },
        { status: 401 }
      );
    }
    
    console.log('Deleting recipe for authenticated user:', user.id);
    
    // Get the recipe ID from the URL
    const url = new URL(req.url);
    const recipeId = url.searchParams.get('id');
    
    if (!recipeId) {
      console.warn('Recipe ID missing in delete request');
      return NextResponse.json(
        { error: 'Recipe ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`Attempting to delete recipe: ${recipeId}`);
    
    // Check if the recipe exists and belongs to the current user
    const { data: existingRecipe, error: findError } = await supabase
      .from('custom_recipes')
      .select('*')
      .eq('id', recipeId)
      .eq('userId', user.id)
      .single();
    
    if (findError || !existingRecipe) {
      console.warn(`Recipe ${recipeId} not found for user ${user.id} or permission denied`);
      return NextResponse.json(
        { error: 'Recipe not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }
    
    console.log(`Found recipe to delete: ${existingRecipe.id} - ${existingRecipe.name}`);
    
    // Delete the recipe from the database
    const { error: deleteError } = await supabase
      .from('custom_recipes')
      .delete()
      .eq('id', recipeId);
    
    if (deleteError) {
      throw deleteError;
    }
    
    console.log(`Recipe deleted successfully: ${recipeId}`);
    
    // Return success message
    return NextResponse.json({ 
      message: 'Recipe deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting custom recipe:', error);
    
    // Enhanced error logging for debugging server issues
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to delete custom recipe', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}