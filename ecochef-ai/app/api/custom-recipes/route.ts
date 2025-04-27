// filepath: c:\Users\Katie\OneDrive\Desktop\Ian's Stuff\ai-kitchen-manager\ecochef-ai\app\api\custom-recipes\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '../../lib/supabase-server';
import { cookies } from 'next/headers';

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

// Helper function to extract user information from cookies
async function getUserFromCookies(request?: Request) {
  let isTestUser = false;
  let isCustomUser = false;
  let userId = '';
  let userEmail = '';

  try {
    // Check cookies from Next.js cookies API (server-side)
    const cookieStore = await cookies();
    
    // First check for normal user, prioritize this over test user
    const customUserId = cookieStore.get('ecochef_user_id')?.value;
    const customUserEmail = cookieStore.get('ecochef_user_email')?.value;
    
    if (customUserId && customUserEmail) {
      isCustomUser = true;
      userId = customUserId;
      userEmail = customUserEmail;
      console.log('Detected custom user from cookies, prioritizing over test user');
      // If we have a regular user, we'll use that and ignore test user cookies
    } else {
      // Only check for test user if no regular user found
      // Check BOTH test_user cookie and test user ID/email match expected values
      const hasTestUserCookie = cookieStore.has('test_user') || cookieStore.has('ecochef_test_user');
      const testUserIdValue = cookieStore.get('ecochef_test_user_id')?.value;
      const testUserEmailValue = cookieStore.get('ecochef_test_user_email')?.value;
      
      if (hasTestUserCookie && 
          testUserIdValue === '00000000-0000-0000-0000-000000000000' && 
          testUserEmailValue === 'test@ecochef.demo') {
        isTestUser = true;
        userId = testUserIdValue;
        userEmail = testUserEmailValue;
        console.log('Detected legitimate test user from cookies (no regular user found)');
      }
    }
  } catch (cookieError) {
    console.error('Error checking cookies:', cookieError);
  }
  
  // If request object is provided, also check request headers
  if (request && !isCustomUser) { // Only check headers if we don't already have a custom user
    const requestCookies = request.headers.get('cookie') || '';
    
    // First check for custom user in request cookies
    const userIdMatch = requestCookies.match(/ecochef_user_id=([^;]+)/);
    const userEmailMatch = requestCookies.match(/ecochef_user_email=([^;]+)/);
    
    if (userIdMatch && userEmailMatch) {
      isCustomUser = true;
      isTestUser = false; // Override test user status if we find a regular user
      userId = userIdMatch[1];
      userEmail = decodeURIComponent(userEmailMatch[1]);
      console.log('Detected custom user from request headers, prioritizing over test user');
    } else if (!isTestUser) {
      // Only check for test user if we don't have a regular user or test user yet
      // Check for both test_user cookie AND matching ID/email
      const hasTestUserCookie = requestCookies.includes('test_user=') || requestCookies.includes('ecochef_test_user=');
      const testUserIdMatch = requestCookies.match(/ecochef_test_user_id=([^;]+)/);
      const testUserEmailMatch = requestCookies.match(/ecochef_test_user_email=([^;]+)/);
      
      if (hasTestUserCookie && 
          testUserIdMatch && testUserIdMatch[1] === '00000000-0000-0000-0000-000000000000' &&
          testUserEmailMatch && decodeURIComponent(testUserEmailMatch[1]) === 'test@ecochef.demo') {
        isTestUser = true;
        userId = testUserIdMatch[1];
        userEmail = 'test@ecochef.demo';
        console.log('Detected legitimate test user from request headers (no regular user found)');
      }
    }
  }
  
  // Check for user ID in headers (set by middleware)
  if (!userId && !isCustomUser && !isTestUser && request) {
    userId = request.headers.get('x-user-id') || '';
    userEmail = request.headers.get('x-user-email') || '';
    
    if (userId && userEmail) {
      console.log('Using user ID from request headers:', userId);
      isCustomUser = true;
    }
  }
  
  return { 
    isAuthenticated: isTestUser || isCustomUser || (!!userId && !!userEmail),
    isTestUser,
    isCustomUser,
    userId,
    userEmail
  };
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
function safeParseJson(value: unknown, defaultValue: string[] = []): string[] {
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
export async function GET(request: NextRequest) {
  try {
    // Initialize Supabase server client
    const supabase = await createServerClient();
    
    // First check for user in cookies
    const { isAuthenticated, userId, isTestUser } = await getUserFromCookies(request);
    
    // Handle test user case
    if (isTestUser) {
      const testUserId = '00000000-0000-0000-0000-000000000000';
      
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
    
    // Check if user is authenticated through cookies or Supabase Auth
    let authenticatedUserId = userId;
    
    // If not authenticated through cookies, try Supabase Auth as fallback
    if (!isAuthenticated) {
      console.log('No custom auth found, trying Supabase Auth');
      const { data: { user } } = await supabase.auth.getUser();
      
      // If no user is authenticated, return 401 Unauthorized response
      if (!user) {
        console.warn('User not authenticated when fetching custom recipes');
        return NextResponse.json(
          { error: 'You must be logged in to access your custom recipes' },
          { status: 401 }
        );
      }
      
      authenticatedUserId = user.id;
    }
    
    console.log('Fetching recipes for authenticated user:', authenticatedUserId);
    
    try {
      // Query the database for all custom recipes belonging to the current user
      const { data: customRecipes, error } = await supabase
        .from('custom_recipes')
        .select('*')
        .eq('userId', authenticatedUserId)
        .order('createdAt', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      console.log(`Found ${customRecipes?.length || 0} recipes for user ${authenticatedUserId}`);
      
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
    
    // First check for user in cookies
    const { isAuthenticated, userId, isTestUser } = await getUserFromCookies(req);
    
    // Handle test user case
    if (isTestUser) {
      const testUserId = '00000000-0000-0000-0000-000000000000';
      
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
      const ingredients = safeParseJson(recipeData.ingredients);
      const instructions = safeParseJson(recipeData.instructions);
      
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
    
    // Check if user is authenticated through cookies or Supabase Auth
    let authenticatedUserId = userId;
    
    // If not authenticated through cookies, try Supabase Auth as fallback
    if (!isAuthenticated) {
      console.log('No custom auth found, trying Supabase Auth');
      const { data: { user } } = await supabase.auth.getUser();
      
      // If no user is authenticated, return a 401 Unauthorized response
      if (!user) {
        console.warn('User not authenticated when creating a custom recipe');
        return NextResponse.json(
          { error: 'You must be logged in to create custom recipes' },
          { status: 401 }
        );
      }
      
      authenticatedUserId = user.id;
    }
    
    console.log('Creating recipe for authenticated user:', authenticatedUserId);
    
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
    const ingredients = safeParseJson(recipeData.ingredients);
    const instructions = safeParseJson(recipeData.instructions);
    
    // Prepare data to insert
    const newRecipeData = {
      userId: authenticatedUserId,
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

    console.log('Data being sent to Supabase:', JSON.stringify(newRecipeData, null, 2));
    
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
    
    // First check for user in cookies
    const { isAuthenticated, userId, isTestUser } = await getUserFromCookies(req);
    
    // Parse the request body to get the updated recipe data
    const recipeData = await req.json() as RecipeData;
    
    // Ensure we have a recipe ID
    if (!recipeData.id) {
      return NextResponse.json(
        { error: 'Recipe ID is required for updates' },
        { status: 400 }
      );
    }
    
    // Handle test user case
    if (isTestUser) {
      const testUserId = '00000000-0000-0000-0000-000000000000';
      
      console.log(`Updating recipe ${recipeData.id} for test user:`, testUserId);
      
      try {
        // First check if the recipe belongs to the test user
        const { data: existingRecipe, error: fetchError } = await supabase
          .from('custom_recipes')
          .select('id, userId')
          .eq('id', recipeData.id)
          .single();
        
        if (fetchError) {
          throw fetchError;
        }
        
        if (existingRecipe.userId !== testUserId) {
          return NextResponse.json(
            { error: 'You do not have permission to update this recipe' },
            { status: 403 }
          );
        }
        
        // Ensure ingredients and instructions are arrays of strings
        const ingredients = safeParseJson(recipeData.ingredients);
        const instructions = safeParseJson(recipeData.instructions);
        
        // Prepare data to update
        const updateData = {
          name: recipeData.name,
          ingredients,
          instructions,
          cuisine: recipeData.cuisine || undefined,
          description: recipeData.description || undefined,
          difficulty: recipeData.difficulty || undefined,
          time: recipeData.time || undefined,
          updatedAt: new Date().toISOString()
        };
        
        // Update the recipe in the database
        const { data: updatedRecipe, error: updateError } = await supabase
          .from('custom_recipes')
          .update(updateData)
          .eq('id', recipeData.id)
          .select()
          .single();
        
        if (updateError) {
          throw updateError;
        }
        
        console.log('Recipe updated:', updatedRecipe.id);
        
        // Return the updated recipe
        return NextResponse.json({
          recipe: {
            ...updatedRecipe,
            ingredients: safeParseJson(updatedRecipe.ingredients),
            instructions: safeParseJson(updatedRecipe.instructions),
          },
          message: 'Recipe updated successfully'
        });
      } catch (error) {
        throw error;
      }
    }
    
    // Check if user is authenticated through cookies or Supabase Auth
    let authenticatedUserId = userId;
    
    // If not authenticated through cookies, try Supabase Auth as fallback
    if (!isAuthenticated) {
      console.log('No custom auth found, trying Supabase Auth');
      const { data: { user } } = await supabase.auth.getUser();
      
      // If no user is authenticated, return 401 Unauthorized response
      if (!user) {
        console.warn('User not authenticated when updating a custom recipe');
        return NextResponse.json(
          { error: 'You must be logged in to update custom recipes' },
          { status: 401 }
        );
      }
      
      authenticatedUserId = user.id;
    }
    
    console.log(`Updating recipe ${recipeData.id} for authenticated user:`, authenticatedUserId);
    
    // First check if the recipe belongs to the current user
    const { data: existingRecipe, error: fetchError } = await supabase
      .from('custom_recipes')
      .select('id, userId')
      .eq('id', recipeData.id)
      .single();
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Recipe not found' },
          { status: 404 }
        );
      }
      throw fetchError;
    }
    
    if (existingRecipe.userId !== authenticatedUserId) {
      return NextResponse.json(
        { error: 'You do not have permission to update this recipe' },
        { status: 403 }
      );
    }
    
    // Ensure ingredients and instructions are arrays of strings
    const ingredients = safeParseJson(recipeData.ingredients);
    const instructions = safeParseJson(recipeData.instructions);
    
    // Prepare data to update
    const updateData = {
      name: recipeData.name,
      ingredients,
      instructions,
      cuisine: recipeData.cuisine || undefined,
      description: recipeData.description || undefined,
      difficulty: recipeData.difficulty || undefined,
      time: recipeData.time || undefined,
      updatedAt: new Date().toISOString()
    };
    
    // Update the recipe in the database
    const { data: updatedRecipe, error: updateError } = await supabase
      .from('custom_recipes')
      .update(updateData)
      .eq('id', recipeData.id)
      .select()
      .single();
    
    if (updateError) {
      throw updateError;
    }
    
    console.log('Recipe updated:', updatedRecipe.id);
    
    // Return the updated recipe
    return NextResponse.json({
      recipe: {
        ...updatedRecipe,
        ingredients: safeParseJson(updatedRecipe.ingredients),
        instructions: safeParseJson(updatedRecipe.instructions),
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
    // Get the recipe ID from the URL
    const { searchParams } = new URL(req.url);
    const recipeId = searchParams.get('id');
    
    if (!recipeId) {
      return NextResponse.json(
        { error: 'Recipe ID is required' },
        { status: 400 }
      );
    }
    
    // Initialize Supabase server client
    const supabase = await createServerClient();
    
    // First check for user in cookies
    const { isAuthenticated, userId, isTestUser } = await getUserFromCookies(req);
    
    // Handle test user case
    if (isTestUser) {
      const testUserId = '00000000-0000-0000-0000-000000000000';
      
      console.log(`Deleting recipe ${recipeId} for test user:`, testUserId);
      
      try {
        // First check if the recipe belongs to the test user
        const { data: existingRecipe, error: fetchError } = await supabase
          .from('custom_recipes')
          .select('id, userId')
          .eq('id', recipeId)
          .single();
        
        if (fetchError) {
          throw fetchError;
        }
        
        if (existingRecipe.userId !== testUserId) {
          return NextResponse.json(
            { error: 'You do not have permission to delete this recipe' },
            { status: 403 }
          );
        }
        
        // Delete the recipe from the database
        const { error: deleteError } = await supabase
          .from('custom_recipes')
          .delete()
          .eq('id', recipeId);
        
        if (deleteError) {
          throw deleteError;
        }
        
        console.log('Recipe deleted:', recipeId);
        
        // Return a success response
        return NextResponse.json({
          message: 'Recipe deleted successfully'
        });
      } catch (error) {
        throw error;
      }
    }
    
    // Check if user is authenticated through cookies or Supabase Auth
    let authenticatedUserId = userId;
    
    // If not authenticated through cookies, try Supabase Auth as fallback
    if (!isAuthenticated) {
      console.log('No custom auth found, trying Supabase Auth');
      const { data: { user } } = await supabase.auth.getUser();
      
      // If no user is authenticated, return 401 Unauthorized response
      if (!user) {
        console.warn('User not authenticated when deleting a custom recipe');
        return NextResponse.json(
          { error: 'You must be logged in to delete custom recipes' },
          { status: 401 }
        );
      }
      
      authenticatedUserId = user.id;
    }
    
    console.log(`Deleting recipe ${recipeId} for authenticated user:`, authenticatedUserId);
    
    // First check if the recipe belongs to the current user
    const { data: existingRecipe, error: fetchError } = await supabase
      .from('custom_recipes')
      .select('id, userId')
      .eq('id', recipeId)
      .single();
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Recipe not found' },
          { status: 404 }
        );
      }
      throw fetchError;
    }
    
    if (existingRecipe.userId !== authenticatedUserId) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this recipe' },
        { status: 403 }
      );
    }
    
    // Delete the recipe from the database
    const { error: deleteError } = await supabase
      .from('custom_recipes')
      .delete()
      .eq('id', recipeId);
    
    if (deleteError) {
      throw deleteError;
    }
    
    console.log('Recipe deleted:', recipeId);
    
    // Return a success response
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