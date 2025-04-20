// filepath: c:\Users\Katie\OneDrive\Desktop\Ian's Stuff\ai-kitchen-manager\ecochef-ai\app\api\custom-recipes\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createServerClient } from '../../lib/supabase-server';

const prisma = new PrismaClient();

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
      
      // Query the database for all custom recipes belonging to the test user
      const customRecipes = await prisma.custom_recipes.findMany({
        where: {
          userId: testUserId
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      // Parse the JSON fields from the database
      const formattedRecipes = customRecipes.map(recipe => ({
        ...recipe,
        ingredients: Array.isArray(recipe.ingredients) 
          ? recipe.ingredients 
          : JSON.parse(recipe.ingredients as string || '[]'),
        instructions: Array.isArray(recipe.instructions) 
          ? recipe.instructions 
          : JSON.parse(recipe.instructions as string || '[]')
      }));
      
      // Return the recipes as JSON
      return NextResponse.json({ customRecipes: formattedRecipes });
    }
    
    // For normal users, get the user from Supabase auth
    const { data: { user } } = await supabase.auth.getUser();
    
    // If no user is authenticated, return a 401 Unauthorized response
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to access your custom recipes' },
        { status: 401 }
      );
    }
    
    // Query the database for all custom recipes belonging to the current user
    const customRecipes = await prisma.custom_recipes.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Parse the JSON fields from the database
    const formattedRecipes = customRecipes.map(recipe => ({
      ...recipe,
      ingredients: Array.isArray(recipe.ingredients) 
        ? recipe.ingredients 
        : JSON.parse(recipe.ingredients as string || '[]'),
      instructions: Array.isArray(recipe.instructions) 
        ? recipe.instructions 
        : JSON.parse(recipe.instructions as string || '[]')
    }));
    
    // Return the recipes as JSON
    return NextResponse.json({ customRecipes: formattedRecipes });
  } catch (error) {
    console.error('Error fetching custom recipes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom recipes' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
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
      const ingredients = Array.isArray(recipeData.ingredients) ? recipeData.ingredients as string[] : [];
      const instructions = Array.isArray(recipeData.instructions) ? recipeData.instructions as string[] : [];
        
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

      console.log('Data being sent to Prisma (test user):', dataToCreate); // Log the data

      // Create the new recipe in the database for the test user
      const newRecipe = await prisma.custom_recipes.create({
        data: dataToCreate
      });
      
      // Return the newly created recipe
      return NextResponse.json({ 
        recipe: {
          ...newRecipe,
          ingredients: Array.isArray(newRecipe.ingredients) 
            ? newRecipe.ingredients 
            : JSON.parse(newRecipe.ingredients as string || '[]'),
          instructions: Array.isArray(newRecipe.instructions) 
            ? newRecipe.instructions 
            : JSON.parse(newRecipe.instructions as string || '[]')
        },
        message: 'Recipe created successfully' 
      }, { status: 201 });
    }
    
    // For normal users, get the user from Supabase auth
    const { data: { user } } = await supabase.auth.getUser();
    
    // If no user is authenticated, return a 401 Unauthorized response
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to create custom recipes' },
        { status: 401 }
      );
    }
    
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
    const ingredients = Array.isArray(recipeData.ingredients) ? recipeData.ingredients as string[] : [];
    const instructions = Array.isArray(recipeData.instructions) ? recipeData.instructions as string[] : [];
      
    // Construct the data object, omitting optional fields if they are falsy (null, undefined, empty string)
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

    console.log('Data being sent to Prisma (normal user):', dataToCreate); // Log the data

    // Create the new recipe in the database
    const newRecipe = await prisma.custom_recipes.create({
      data: dataToCreate
    });
    
    // Return the newly created recipe
    return NextResponse.json({ 
      recipe: {
        ...newRecipe,
        ingredients: Array.isArray(newRecipe.ingredients) 
          ? newRecipe.ingredients 
          : JSON.parse(newRecipe.ingredients as string || '[]'),
        instructions: Array.isArray(newRecipe.instructions) 
          ? newRecipe.instructions 
          : JSON.parse(newRecipe.instructions as string || '[]')
      },
      message: 'Recipe created successfully' 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating custom recipe:', error);
    return NextResponse.json(
      { error: 'Failed to create custom recipe' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
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
        return NextResponse.json(
          { error: 'Recipe not found or you do not have permission to update it' },
          { status: 404 }
        );
      }
      
      // Ensure ingredients and instructions are arrays
      const ingredients = Array.isArray(recipeData.ingredients) 
        ? recipeData.ingredients 
        : (recipeData.ingredients ? [recipeData.ingredients] : []);
        
      const instructions = Array.isArray(recipeData.instructions) 
        ? recipeData.instructions 
        : (recipeData.instructions ? [recipeData.instructions] : []);
      
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
      
      // Return the updated recipe
      return NextResponse.json({ 
        recipe: {
          ...updatedRecipe,
          ingredients: Array.isArray(updatedRecipe.ingredients) 
            ? updatedRecipe.ingredients 
            : JSON.parse(updatedRecipe.ingredients as string || '[]'),
          instructions: Array.isArray(updatedRecipe.instructions) 
            ? updatedRecipe.instructions 
            : JSON.parse(updatedRecipe.instructions as string || '[]')
        },
        message: 'Recipe updated successfully' 
      });
    }
    
    // For normal users, get the user from Supabase auth
    const { data: { user } } = await supabase.auth.getUser();
    
    // If no user is authenticated, return a 401 Unauthorized response
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to update custom recipes' },
        { status: 401 }
      );
    }
    
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
      return NextResponse.json(
        { error: 'Recipe not found or you do not have permission to update it' },
        { status: 404 }
      );
    }
    
    // Ensure ingredients and instructions are arrays
    const ingredients = Array.isArray(recipeData.ingredients) 
      ? recipeData.ingredients 
      : (recipeData.ingredients ? [recipeData.ingredients] : []);
      
    const instructions = Array.isArray(recipeData.instructions) 
      ? recipeData.instructions 
      : (recipeData.instructions ? [recipeData.instructions] : []);
    
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
    
    // Return the updated recipe
    return NextResponse.json({ 
      recipe: {
        ...updatedRecipe,
        ingredients: Array.isArray(updatedRecipe.ingredients) 
          ? updatedRecipe.ingredients 
          : JSON.parse(updatedRecipe.ingredients as string || '[]'),
        instructions: Array.isArray(updatedRecipe.instructions) 
          ? updatedRecipe.instructions 
          : JSON.parse(updatedRecipe.instructions as string || '[]')
      },
      message: 'Recipe updated successfully' 
    });
  } catch (error) {
    console.error('Error updating custom recipe:', error);
    return NextResponse.json(
      { error: 'Failed to update custom recipe' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
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
      
      // Get the recipe ID from the URL
      const url = new URL(req.url);
      const recipeId = url.searchParams.get('id');
      
      if (!recipeId) {
        return NextResponse.json(
          { error: 'Recipe ID is required' },
          { status: 400 }
        );
      }
      
      // Check if the recipe exists and belongs to the test user
      const existingRecipe = await prisma.custom_recipes.findFirst({
        where: {
          id: recipeId,
          userId: testUserId
        }
      });
      
      if (!existingRecipe) {
        return NextResponse.json(
          { error: 'Recipe not found or you do not have permission to delete it' },
          { status: 404 }
        );
      }
      
      // Delete the recipe from the database
      await prisma.custom_recipes.delete({
        where: {
          id: recipeId
        }
      });
      
      // Return success message
      return NextResponse.json({ 
        message: 'Recipe deleted successfully' 
      });
    }
    
    // For normal users, get the user from Supabase auth
    const { data: { user } } = await supabase.auth.getUser();
    
    // If no user is authenticated, return a 401 Unauthorized response
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to delete custom recipes' },
        { status: 401 }
      );
    }
    
    // Get the recipe ID from the URL
    const url = new URL(req.url);
    const recipeId = url.searchParams.get('id');
    
    if (!recipeId) {
      return NextResponse.json(
        { error: 'Recipe ID is required' },
        { status: 400 }
      );
    }
    
    // Check if the recipe exists and belongs to the current user
    const existingRecipe = await prisma.custom_recipes.findFirst({
      where: {
        id: recipeId,
        userId: user.id
      }
    });
    
    if (!existingRecipe) {
      return NextResponse.json(
        { error: 'Recipe not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }
    
    // Delete the recipe from the database
    await prisma.custom_recipes.delete({
      where: {
        id: recipeId
      }
    });
    
    // Return success message
    return NextResponse.json({ 
      message: 'Recipe deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting custom recipe:', error);
    return NextResponse.json(
      { error: 'Failed to delete custom recipe' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}