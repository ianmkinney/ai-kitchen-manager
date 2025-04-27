import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../lib/admin-check';
import { hashPassword } from '../../lib/auth-utils';

export async function GET(req: NextRequest) {
  try {
    // Validate that the request includes the required admin token
    const adminToken = req.headers.get('x-admin-token');
    const validToken = process.env.ADMIN_SETUP_TOKEN || 'ecochef-setup-91a8c3e7f0d2';
    
    if (adminToken !== validToken) {
      console.error('Unauthorized test user setup attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const adminClient = createAdminClient();
    
    // Test user ID
    const testUserId = '00000000-0000-0000-0000-000000000000';
    
    console.log('Starting test user initialization process');
    
    // First, clean up all existing test user data
    console.log('Cleaning up existing test user data');
    
    // Delete test user from User table if exists
    const { error: deleteUserError } = await adminClient
      .from('User')
      .delete()
      .eq('id', testUserId);
    
    if (deleteUserError) {
      console.error('Error deleting test user:', deleteUserError);
      // Continue anyway - it might not exist yet
    } else {
      console.log('Deleted existing test user from User table');
    }
    
    // Delete existing test user preferences
    const { error: deletePreferencesError } = await adminClient
      .from('user_preferences')
      .delete()
      .eq('userid', testUserId);
    
    if (deletePreferencesError) {
      console.error('Error deleting existing test user preferences:', deletePreferencesError);
    } else {
      console.log('Deleted existing test user preferences');
    }
    
    // Delete existing pantry items
    const { error: deletePantryError } = await adminClient
      .from('pantry_items')
      .delete()
      .eq('userid', testUserId);
    
    if (deletePantryError) {
      console.error('Error deleting existing test user pantry items:', deletePantryError);
    } else {
      console.log('Deleted existing test user pantry items');
    }
    
    // Delete existing recipes
    const { error: deleteRecipesError } = await adminClient
      .from('recipes')
      .delete()
      .eq('userid', testUserId);
    
    if (deleteRecipesError) {
      console.error('Error deleting existing test user recipes:', deleteRecipesError);
    } else {
      console.log('Deleted existing test user recipes');
    }
    
    // Delete existing custom recipes
    const { error: deleteCustomRecipesError } = await adminClient
      .from('custom_recipes')
      .delete()
      .eq('userId', testUserId);
    
    if (deleteCustomRecipesError) {
      console.error('Error deleting existing test user custom recipes:', deleteCustomRecipesError);
    } else {
      console.log('Deleted existing test user custom recipes');
    }
    
    // Delete existing weekly plans
    const { error: deleteWeeklyPlansError } = await adminClient
      .from('weekly_plans')
      .delete()
      .eq('userid', testUserId);
    
    if (deleteWeeklyPlansError) {
      console.error('Error deleting existing weekly plans for test user:', deleteWeeklyPlansError);
    } else {
      console.log('Deleted existing test user weekly plans');
    }
    
    // Now create a fresh test user
    console.log('Creating new test user');
    const hashedPassword = hashPassword('password123');
    
    const { error: createUserError } = await adminClient
      .from('User')
      .insert([
        {
          id: testUserId,
          email: 'test@ecochef.demo',
          name: 'Test User',
          password: hashedPassword,
          "createdAt": new Date().toISOString(),
          "updatedAt": new Date().toISOString()
        }
      ]);
    
    if (createUserError) {
      console.error('Error creating test user:', createUserError);
      return NextResponse.json({ 
        error: 'Failed to create test user', 
        details: createUserError 
      }, { status: 500 });
    }
    
    console.log('Successfully created test user');
    
    // Initialize preferences for test user
    const { error: preferencesError } = await adminClient
      .from('user_preferences')
      .insert([
        {
          userid: testUserId,
          "isVegetarian": false,
          "isVegan": false,
          "isGlutenFree": false,
          "isDairyFree": false,
          "isNutFree": false,
          "spicyPreference": 5,
          "sweetPreference": 5,
          "savoryPreference": 5,
          cuisine: 'Any',
          "peopleCount": 2,
          "maxCookingTime": 30,
          "cookingSkillLevel": 'intermediate',
          "cuisinePreferences": ['Italian', 'Mexican', 'Asian'],
          "healthGoals": [],
          "allergies": [],
          "createdAt": new Date().toISOString(),
          "updatedAt": new Date().toISOString()
        }
      ]);
    
    if (preferencesError) {
      console.error('Error setting test user preferences:', preferencesError);
    } else {
      console.log('Created test user preferences');
    }
    
    // Initialize pantry items for test user
    const pantryItems = [
      { "itemName": 'Milk', category: 'Dairy', quantity: 1, unit: 'gallon' },
      { "itemName": 'Eggs', category: 'Dairy', quantity: 12, unit: 'count' },
      { "itemName": 'Chicken Breast', category: 'Meat', quantity: 2, unit: 'lbs' },
      { "itemName": 'Rice', category: 'Grains', quantity: 5, unit: 'lbs' },
      { "itemName": 'Onions', category: 'Vegetables', quantity: 3, unit: 'count' },
      { "itemName": 'Tomatoes', category: 'Vegetables', quantity: 4, unit: 'count' },
      { "itemName": 'Olive Oil', category: 'Oils', quantity: 1, unit: 'bottle' }
    ];
    
    const { error: pantryError } = await adminClient
      .from('pantry_items')
      .insert(
        pantryItems.map(item => ({
          userid: testUserId,
          ...item,
          "createdAt": new Date().toISOString(),
          "updatedAt": new Date().toISOString()
        }))
      );
    
    if (pantryError) {
      console.error('Error setting test user pantry items:', pantryError);
    } else {
      console.log('Created test user pantry items');
      
      // Verify pantry items were correctly created
      const { data: verifyPantryItems, error: verifyError } = await adminClient
        .from('pantry_items')
        .select('*')
        .eq('userid', testUserId);
      
      if (verifyError) {
        console.error('Error verifying test user pantry items:', verifyError);
      } else {
        console.log(`Verified ${verifyPantryItems.length} pantry items created for test user:`, 
          verifyPantryItems.map(item => item.itemName));
      }
    }
    
    // Initialize some recipes for test user
    const recipes = [
      {
        name: 'Simple Pasta',
        "recipeData": {
          name: 'Simple Pasta',
          ingredients: ['8 oz pasta', '2 tbsp olive oil', '3 cloves garlic', '1/4 cup parmesan cheese', 'Salt and pepper to taste'],
          instructions: ['Boil pasta according to package directions', 'Heat olive oil in a pan and sauté minced garlic until fragrant', 'Drain pasta and toss with garlic oil', 'Sprinkle with parmesan cheese and season with salt and pepper']
        }
      },
      {
        name: 'Chicken Stir Fry',
        "recipeData": {
          name: 'Chicken Stir Fry',
          ingredients: ['1 lb chicken breast', '2 cups mixed vegetables', '3 tbsp soy sauce', '1 tbsp sesame oil', '2 cloves garlic', '1 tbsp ginger', '2 cups cooked rice'],
          instructions: ['Cut chicken into bite-sized pieces', 'Heat oil in a wok or large pan', 'Cook chicken until no longer pink', 'Add vegetables and stir-fry for 3-4 minutes', 'Add minced garlic and ginger, cook for 1 minute', 'Pour in soy sauce and sesame oil', 'Serve over cooked rice']
        }
      }
    ];
    
    const { error: recipesError } = await adminClient
      .from('recipes')
      .insert(
        recipes.map(recipe => ({
          userid: testUserId,
          ...recipe,
          "createdAt": new Date().toISOString(),
          "updatedAt": new Date().toISOString()
        }))
      );
    
    if (recipesError) {
      console.error('Error setting test user recipes:', recipesError);
    } else {
      console.log('Created test user recipes');
    }
    
    // Initialize a weekly plan for test user
    const currentDate = new Date();
    const monday = new Date(currentDate);
    monday.setDate(currentDate.getDate() - (currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1)); // Get Monday of current week
    
    const { data: weeklyPlan, error: weeklyPlanError } = await adminClient
      .from('weekly_plans')
      .insert([
        {
          userid: testUserId,
          "weekStartDate": monday.toISOString().split('T')[0],
          "createdAt": new Date().toISOString(),
          "updatedAt": new Date().toISOString()
        }
      ])
      .select()
      .single();
    
    if (weeklyPlanError) {
      console.error('Error creating weekly plan for test user:', weeklyPlanError);
    } else if (weeklyPlan) {
      console.log('Created test user weekly plan');
      
      // Add recipe to weekly plan
      const { error: planRecipeError } = await adminClient
        .from('weekly_plan_recipes')
        .insert([
          {
            "weeklyPlanId": weeklyPlan.id,
            "recipeData": recipes[0].recipeData,
            "plannedDate": monday.toISOString().split('T')[0],
            "mealType": 'dinner',
            "createdAt": new Date().toISOString(),
            "updatedAt": new Date().toISOString()
          }
        ]);
      
      if (planRecipeError) {
        console.error('Error adding recipe to weekly plan:', planRecipeError);
      } else {
        console.log('Added recipes to test user weekly plan');
      }
    }
    
    console.log('Test user initialization completed successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test user data successfully initialized' 
    });
  } catch (error) {
    console.error('Unexpected error during test user initialization:', error);
    return NextResponse.json({ 
      error: 'Test user initialization failed due to an unexpected error', 
      details: error 
    }, { status: 500 });
  }
}