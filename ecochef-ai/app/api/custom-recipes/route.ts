// filepath: c:\Users\Katie\OneDrive\Desktop\Ian's Stuff\ai-kitchen-manager\ecochef-ai\app\api\custom-recipes\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createServerClient } from '../../lib/supabase-server';
import { prisma } from '../../lib/db'; // Import the singleton Prisma instance

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

// Type for recipe creation data
// Only allow string[] for ingredients and instructions
type RecipeCreateData = {
  userId: string;
  name: string;
  ingredients: string[];
  instructions: string[];
  cuisine?: string;
  description?: string;
  difficulty?: string;
  time?: string;
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
      
      // Query the database for all custom recipes belonging to the test user
      const customRecipes = await prisma.custom_recipes.findMany({
        where: {
          userId: testUserId
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      console.log(`Found ${customRecipes.length} test user recipes`);
      
      // Parse the JSON fields from the database
      const formattedRecipes = customRecipes.map(recipe => {
        try {
          return {
            ...recipe,
            ingredients: Array.isArray(recipe.ingredients) 
              ? recipe.ingredients 
              : JSON.parse(typeof recipe.ingredients === 'string' ? recipe.ingredients : '[]'),
            instructions: Array.isArray(recipe.instructions) 
              ? recipe.instructions 
              : JSON.parse(typeof recipe.instructions === 'string' ? recipe.instructions : '[]')
          };
        } catch (parseError) {
          console.error('Error parsing recipe data:', parseError, recipe);
          // Return with empty arrays as fallback
          return {
            ...recipe,
            ingredients: [],
            instructions: []
          };
        }
      });
      
      // Return the recipes as JSON
      return NextResponse.json({ customRecipes: formattedRecipes });
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
    
    // Query the database for all custom recipes belonging to the current user
    const customRecipes = await prisma.custom_recipes.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`Found ${customRecipes.length} recipes for user ${user.id}`);
    
    // Parse the JSON fields from the database with improved error handling
    const formattedRecipes = customRecipes.map(recipe => {
      try {
        return {
          ...recipe,
          ingredients: Array.isArray(recipe.ingredients) 
            ? recipe.ingredients 
            : JSON.parse(typeof recipe.ingredients === 'string' ? recipe.ingredients : '[]'),
          instructions: Array.isArray(recipe.instructions) 
            ? recipe.instructions 
            : JSON.parse(typeof recipe.instructions === 'string' ? recipe.instructions : '[]')
        };
      } catch (parseError) {
        console.error('Error parsing recipe data:', parseError, recipe);
        // Return with empty arrays as fallback
        return {
          ...recipe,
          ingredients: [],
          instructions: []
        };
      }
    });
    
    // Return the recipes as JSON
    return NextResponse.json({ customRecipes: formattedRecipes });
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
      let ingredients: string[] = [];
      let instructions: string[] = [];
      
      // Handle various formats the ingredients might be in
      if (Array.isArray(recipeData.ingredients)) {
        ingredients = recipeData.ingredients as string[];
      } else if (typeof recipeData.ingredients === 'string') {
        try {
          // Try to parse if it's a JSON string
          ingredients = JSON.parse(recipeData.ingredients);
          if (!Array.isArray(ingredients)) {
            ingredients = [recipeData.ingredients];
          }
        } catch {
          // If parsing fails, treat as a single string
          ingredients = [recipeData.ingredients];
        }
      }
      
      // Handle various formats the instructions might be in
      if (Array.isArray(recipeData.instructions)) {
        instructions = recipeData.instructions as string[];
      } else if (typeof recipeData.instructions === 'string') {
        try {
          // Try to parse if it's a JSON string
          instructions = JSON.parse(recipeData.instructions);
          if (!Array.isArray(instructions)) {
            instructions = [recipeData.instructions];
          }
        } catch {
          // If parsing fails, treat as a single string
          instructions = [recipeData.instructions];
        }
      }
        
      // Construct the data object, omitting optional fields if they are falsy (null, undefined, empty string)
      const dataToCreate: RecipeCreateData = {
        userId: testUserId,
        name: recipeData.name,
        ingredients,
        instructions,
      };
      
      if (recipeData.cuisine) dataToCreate.cuisine = recipeData.cuisine;
      if (recipeData.description) dataToCreate.description = recipeData.description;
      if (recipeData.difficulty) dataToCreate.difficulty = recipeData.difficulty;
      if (recipeData.time) dataToCreate.time = recipeData.time;

      console.log('Data being sent to Prisma (test user):', JSON.stringify(dataToCreate, null, 2));

      // Create the new recipe in the database for the test user
      const newRecipe = await prisma.custom_recipes.create({
        data: dataToCreate
      });
      
      console.log('New recipe created:', newRecipe.id);
      
      // Process the recipe's ingredients and instructions for the response
      let responseIngredients: string[];
      let responseInstructions: string[];
      
      try {
        responseIngredients = Array.isArray(newRecipe.ingredients) 
          ? newRecipe.ingredients 
          : JSON.parse(typeof newRecipe.ingredients === 'string' ? newRecipe.ingredients : '[]');
      } catch {
        console.error('Error parsing ingredients for response');
        responseIngredients = [];
      }
      
      try {
        responseInstructions = Array.isArray(newRecipe.instructions) 
          ? newRecipe.instructions 
          : JSON.parse(typeof newRecipe.instructions === 'string' ? newRecipe.instructions : '[]');
      } catch {
        console.error('Error parsing instructions for response');
        responseInstructions = [];
      }
      
      // Return the newly created recipe with safely processed fields
      return NextResponse.json({ 
        recipe: {
          ...newRecipe,
          ingredients: responseIngredients,
          instructions: responseInstructions,
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
    
    // Ensure ingredients and instructions are arrays of strings with robust handling
    let ingredients: string[] = [];
    let instructions: string[] = [];
    
    // Handle various formats the ingredients might be in
    if (Array.isArray(recipeData.ingredients)) {
      ingredients = recipeData.ingredients as string[];
    } else if (typeof recipeData.ingredients === 'string') {
      try {
        // Try to parse if it's a JSON string
        ingredients = JSON.parse(recipeData.ingredients);
        if (!Array.isArray(ingredients)) {
          ingredients = [recipeData.ingredients];
        }
      } catch {
        // If parsing fails, treat as a single string
        ingredients = [recipeData.ingredients];
      }
    }
    
    // Handle various formats the instructions might be in
    if (Array.isArray(recipeData.instructions)) {
      instructions = recipeData.instructions as string[];
    } else if (typeof recipeData.instructions === 'string') {
      try {
        // Try to parse if it's a JSON string
        instructions = JSON.parse(recipeData.instructions);
        if (!Array.isArray(instructions)) {
          instructions = [recipeData.instructions];
        }
      } catch {
        // If parsing fails, treat as a single string
        instructions = [recipeData.instructions];
      }
    }
      
    // Construct the data object, omitting optional fields if they are falsy
    const dataToCreate: RecipeCreateData = {
      userId: user.id,
      name: recipeData.name,
      ingredients,
      instructions,
    };
    
    if (recipeData.cuisine) dataToCreate.cuisine = recipeData.cuisine;
    if (recipeData.description) dataToCreate.description = recipeData.description;
    if (recipeData.difficulty) dataToCreate.difficulty = recipeData.difficulty;
    if (recipeData.time) dataToCreate.time = recipeData.time;

    console.log('Data being sent to Prisma (normal user):', JSON.stringify(dataToCreate, null, 2));

    // Create the new recipe in the database
    const newRecipe = await prisma.custom_recipes.create({
      data: dataToCreate
    });
    
    console.log('New recipe created:', newRecipe.id);
    
    // Process the recipe's ingredients and instructions for the response
    let responseIngredients: string[];
    let responseInstructions: string[];
    
    try {
      responseIngredients = Array.isArray(newRecipe.ingredients) 
        ? newRecipe.ingredients 
        : JSON.parse(typeof newRecipe.ingredients === 'string' ? newRecipe.ingredients : '[]');
    } catch {
      console.error('Error parsing ingredients for response');
      responseIngredients = [];
    }
    
    try {
      responseInstructions = Array.isArray(newRecipe.instructions) 
        ? newRecipe.instructions 
        : JSON.parse(typeof newRecipe.instructions === 'string' ? newRecipe.instructions : '[]');
    } catch {
      console.error('Error parsing instructions for response');
      responseInstructions = [];
    }
    
    // Return the newly created recipe with safely processed fields
    return NextResponse.json({ 
      recipe: {
        ...newRecipe,
        ingredients: responseIngredients,
        instructions: responseInstructions,
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
      const existingRecipe = await prisma.custom_recipes.findFirst({
        where: {
          id: recipeData.id,
          userId: testUserId
        }
      });
      
      if (!existingRecipe) {
        console.warn(`Recipe ${recipeData.id} not found for test user or permission denied`);
        return NextResponse.json(
          { error: 'Recipe not found or you do not have permission to update it' },
          { status: 404 }
        );
      }
      
      console.log(`Found existing recipe: ${existingRecipe.id} - ${existingRecipe.name}`);
      
      // Ensure ingredients and instructions are arrays with robust handling
      let ingredients: string[] = [];
      let instructions: string[] = [];
      
      // Handle various formats the ingredients might be in
      if (Array.isArray(recipeData.ingredients)) {
        ingredients = recipeData.ingredients as string[];
      } else if (typeof recipeData.ingredients === 'string') {
        try {
          // Try to parse if it's a JSON string
          ingredients = JSON.parse(recipeData.ingredients);
          if (!Array.isArray(ingredients)) {
            ingredients = [recipeData.ingredients];
          }
        } catch {
          // If parsing fails, treat as a single string
          ingredients = [recipeData.ingredients];
        }
      }
      
      // Handle various formats the instructions might be in
      if (Array.isArray(recipeData.instructions)) {
        instructions = recipeData.instructions as string[];
      } else if (typeof recipeData.instructions === 'string') {
        try {
          // Try to parse if it's a JSON string
          instructions = JSON.parse(recipeData.instructions);
          if (!Array.isArray(instructions)) {
            instructions = [recipeData.instructions];
          }
        } catch {
          // If parsing fails, treat as a single string
          instructions = [recipeData.instructions];
        }
      }
      
      console.log('Data being sent to update recipe:', {
        id: recipeData.id,
        name: recipeData.name,
        ingredients: ingredients.length,
        instructions: instructions.length
      });
      
      // Update the recipe in the database
      const updatedRecipe = await prisma.custom_recipes.update({
        where: {
          id: recipeData.id
        },
        data: {
          name: recipeData.name,
          ingredients: ingredients,
          instructions: instructions,
          // Use undefined instead of null or empty string for optional fields
          cuisine: recipeData.cuisine || undefined,
          description: recipeData.description || undefined,
          difficulty: recipeData.difficulty || undefined,
          time: recipeData.time || undefined,
          updatedAt: new Date()
        }
      });
      
      console.log(`Recipe updated successfully: ${updatedRecipe.id}`);
      
      // Process the recipe's ingredients and instructions for the response
      let responseIngredients: string[];
      let responseInstructions: string[];
      
      try {
        responseIngredients = Array.isArray(updatedRecipe.ingredients) 
          ? updatedRecipe.ingredients 
          : JSON.parse(typeof updatedRecipe.ingredients === 'string' ? updatedRecipe.ingredients : '[]');
      } catch {
        console.error('Error parsing ingredients for response');
        responseIngredients = [];
      }
      
      try {
        responseInstructions = Array.isArray(updatedRecipe.instructions) 
          ? updatedRecipe.instructions 
          : JSON.parse(typeof updatedRecipe.instructions === 'string' ? updatedRecipe.instructions : '[]');
      } catch {
        console.error('Error parsing instructions for response');
        responseInstructions = [];
      }
      
      // Return the updated recipe with safely processed fields
      return NextResponse.json({ 
        recipe: {
          ...updatedRecipe,
          ingredients: responseIngredients,
          instructions: responseInstructions
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
    const existingRecipe = await prisma.custom_recipes.findFirst({
      where: {
        id: recipeData.id,
        userId: user.id
      }
    });
    
    if (!existingRecipe) {
      console.warn(`Recipe ${recipeData.id} not found for user ${user.id} or permission denied`);
      return NextResponse.json(
        { error: 'Recipe not found or you do not have permission to update it' },
        { status: 404 }
      );
    }
    
    console.log(`Found existing recipe: ${existingRecipe.id} - ${existingRecipe.name}`);
    
    // Ensure ingredients and instructions are arrays with robust handling
    let ingredients: string[] = [];
    let instructions: string[] = [];
    
    // Handle various formats the ingredients might be in
    if (Array.isArray(recipeData.ingredients)) {
      ingredients = recipeData.ingredients as string[];
    } else if (typeof recipeData.ingredients === 'string') {
      try {
        ingredients = JSON.parse(recipeData.ingredients);
        if (!Array.isArray(ingredients)) {
          ingredients = [recipeData.ingredients];
        }
      } catch {
        ingredients = [recipeData.ingredients];
      }
    }
    
    // Handle various formats the instructions might be in
    if (Array.isArray(recipeData.instructions)) {
      instructions = recipeData.instructions as string[];
    } else if (typeof recipeData.instructions === 'string') {
      try {
        instructions = JSON.parse(recipeData.instructions);
        if (!Array.isArray(instructions)) {
          instructions = [recipeData.instructions];
        }
      } catch {
        instructions = [recipeData.instructions];
      }
    }
    
    console.log('Data being sent to update recipe:', {
      id: recipeData.id,
      name: recipeData.name,
      ingredients: ingredients.length,
      instructions: instructions.length
    });
    
    // Update the recipe in the database
    const updatedRecipe = await prisma.custom_recipes.update({
      where: {
        id: recipeData.id
      },
      data: {
        name: recipeData.name,
        ingredients: ingredients,
        instructions: instructions,
        // Use undefined instead of null or empty string for optional fields
        cuisine: recipeData.cuisine || undefined,
        description: recipeData.description || undefined,
        difficulty: recipeData.difficulty || undefined,
        time: recipeData.time || undefined,
        updatedAt: new Date()
      }
    });
    
    console.log(`Recipe updated successfully: ${updatedRecipe.id}`);
    
    // Process the recipe's ingredients and instructions for the response
    let responseIngredients: string[];
    let responseInstructions: string[];
    
    try {
      responseIngredients = Array.isArray(updatedRecipe.ingredients) 
        ? updatedRecipe.ingredients 
        : JSON.parse(typeof updatedRecipe.ingredients === 'string' ? updatedRecipe.ingredients : '[]');
    } catch {
      console.error('Error parsing ingredients for response');
      responseIngredients = [];
    }
    
    try {
      responseInstructions = Array.isArray(updatedRecipe.instructions) 
        ? updatedRecipe.instructions 
        : JSON.parse(typeof updatedRecipe.instructions === 'string' ? updatedRecipe.instructions : '[]');
    } catch {
      console.error('Error parsing instructions for response');
      responseInstructions = [];
    }
    
    // Return the updated recipe with safely processed fields
    return NextResponse.json({ 
      recipe: {
        ...updatedRecipe,
        ingredients: responseIngredients,
        instructions: responseInstructions
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
      const existingRecipe = await prisma.custom_recipes.findFirst({
        where: {
          id: recipeId,
          userId: testUserId
        }
      });
      
      if (!existingRecipe) {
        console.warn(`Recipe ${recipeId} not found for test user or permission denied`);
        return NextResponse.json(
          { error: 'Recipe not found or you do not have permission to delete it' },
          { status: 404 }
        );
      }
      
      console.log(`Found recipe to delete: ${existingRecipe.id} - ${existingRecipe.name}`);
      
      // Delete the recipe from the database
      await prisma.custom_recipes.delete({
        where: {
          id: recipeId
        }
      });
      
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
    const existingRecipe = await prisma.custom_recipes.findFirst({
      where: {
        id: recipeId,
        userId: user.id
      }
    });
    
    if (!existingRecipe) {
      console.warn(`Recipe ${recipeId} not found for user ${user.id} or permission denied`);
      return NextResponse.json(
        { error: 'Recipe not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }
    
    console.log(`Found recipe to delete: ${existingRecipe.id} - ${existingRecipe.name}`);
    
    // Delete the recipe from the database
    await prisma.custom_recipes.delete({
      where: {
        id: recipeId
      }
    });
    
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