import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../lib/admin-check';

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
    
    // Check if test user exists
    const { data: testUser, error: testUserError } = await adminClient
      .from('User')
      .select('*')
      .eq('id', testUserId)
      .single();
    
    if (testUserError || !testUser) {
      // Create test user if not exists
      const { error: createUserError } = await adminClient
        .from('User')
        .insert([
          {
            id: testUserId,
            email: 'test@ecochef.demo',
            name: 'Test User',
            password: 'password123',
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
    }
    
    // Initialize preferences for test user
    const { error: preferencesError } = await adminClient
      .from('user_preferences')
      .upsert([
        {
          userid: testUserId,
          "isVegetarian": false,
          "isVegan": false,
          "isGlutenFree": false,
          "isDairyFree": false,
          cuisine: 'Any',
          "peopleCount": 2,
          "maxCookingTime": 30,
          "createdAt": new Date().toISOString(),
          "updatedAt": new Date().toISOString()
        }
      ]);
    
    if (preferencesError) {
      console.error('Error setting test user preferences:', preferencesError);
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
      .upsert(
        pantryItems.map(item => ({
          userid: testUserId,
          ...item,
          "createdAt": new Date().toISOString(),
          "updatedAt": new Date().toISOString()
        }))
      );
    
    if (pantryError) {
      console.error('Error setting test user pantry items:', pantryError);
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
      .upsert(
        recipes.map(recipe => ({
          userid: testUserId,
          ...recipe,
          "createdAt": new Date().toISOString(),
          "updatedAt": new Date().toISOString()
        }))
      );
    
    if (recipesError) {
      console.error('Error setting test user recipes:', recipesError);
    }
    
    // Initialize a weekly plan for test user
    const currentDate = new Date();
    const monday = new Date(currentDate);
    monday.setDate(currentDate.getDate() - currentDate.getDay() + 1); // Get Monday of current week
    
    const { data: weeklyPlan, error: weeklyPlanError } = await adminClient
      .from('weekly_plans')
      .upsert([
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
      // Add recipe to weekly plan
      const { error: planRecipeError } = await adminClient
        .from('weekly_plan_recipes')
        .upsert([
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
      }
    }
    
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