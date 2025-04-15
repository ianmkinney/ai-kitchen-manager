import { NextResponse } from 'next/server';
import { createServerClient, getCurrentUser } from '../../../lib/supabase-server';

// Helper function to categorize ingredients
function categorizeIngredient(ingredient: string): string {
  const lowerIngredient = ingredient.toLowerCase();
  
  // Common categories
  if (/chicken|beef|pork|turkey|lamb|bacon|ham|sausage|steak|ground meat|veal|venison|brisket/.test(lowerIngredient)) {
    return 'Meat';
  } else if (/fish|shrimp|salmon|tuna|cod|tilapia|crab|lobster|scallop|clam|mussel|oyster/.test(lowerIngredient)) {
    return 'Seafood';  
  } else if (/tofu|tempeh|seitan|protein|lentil|bean|chickpea/.test(lowerIngredient)) {
    return 'Plant Protein';
  } else if (/milk|cheese|yogurt|cream|butter|sour cream/.test(lowerIngredient)) {
    return 'Dairy';
  } else if (/apple|banana|orange|grape|berry|blueberry|strawberry|raspberry|melon|watermelon|kiwi|mango|pineapple/.test(lowerIngredient)) {
    return 'Fruit';
  } else if (/lettuce|spinach|kale|carrot|broccoli|pepper|onion|garlic|cucumber|tomato|potato|zucchini|squash|eggplant|asparagus|celery/.test(lowerIngredient)) {
    return 'Vegetables';
  } else if (/flour|sugar|salt|pepper|oil|vinegar|spice|herb|oregano|basil|thyme|cumin|cinnamon|nutmeg|vanilla|baking powder|baking soda/.test(lowerIngredient)) {
    return 'Pantry Staples';
  } else if (/bread|bagel|tortilla|wrap|pita|bun|roll/.test(lowerIngredient)) {
    return 'Bread';
  } else if (/pasta|rice|quinoa|oat|barley|couscous|noodle/.test(lowerIngredient)) {
    return 'Grains';
  } else if (/almond|cashew|peanut|walnut|pecan|seed|nut/.test(lowerIngredient)) {
    return 'Nuts & Seeds';
  }
  
  return 'Other';
}

// Helper to clean up ingredient names
function cleanIngredient(ingredient: string): string {
  let cleanedIngredient = ingredient.toLowerCase();
  
  // Remove quantities and measurements
  cleanedIngredient = cleanedIngredient.replace(/^\d+\s*(\d\/\d)?(\s*-\s*\d+)?\s*(cups?|tablespoons?|teaspoons?|tbsp|tsp|oz|ounces?|pounds?|lbs?|grams?|g|ml|l|pinch(es)?|dash(es)?|to taste|dozen|slices?)/i, '');
  
  // Remove common prepositions and adjectives
  cleanedIngredient = cleanedIngredient.replace(/^(of|a|an|the|fresh|dried|frozen|large|medium|small|ripe|chopped|minced|diced|sliced|grated)\s+/i, '');
  
  // Remove anything in parentheses
  cleanedIngredient = cleanedIngredient.replace(/\(.*\)/g, '');
  
  // Trim whitespace and commas
  cleanedIngredient = cleanedIngredient.trim().replace(/,$/, '');
  
  return cleanedIngredient;
}

// Helper function to check if an ingredient is in the pantry
function isIngredientInPantry(ingredient: string, pantryItems: string[]): boolean {
  const ingredientWords = ingredient.split(' ');
  
  // Check if any pantry item matches or contains the ingredient
  return pantryItems.some(pantryItem => {
    // Direct match
    if (pantryItem === ingredient) return true;
    
    // Ingredient contains pantry item or vice versa
    if (pantryItem.includes(ingredient) || ingredient.includes(pantryItem)) return true;
    
    // Check if the main word of the ingredient is in the pantry
    if (ingredientWords.length > 0) {
      const mainIngredientWord = ingredientWords[ingredientWords.length - 1]; // Usually the last word is the main ingredient
      return pantryItem.includes(mainIngredientWord);
    }
    
    return false;
  });
}

export async function GET() {
  try {
    // Get the current user
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create server client
    const supabase = await createServerClient();

    // 1. Get the user's weekly plan with cache busting option
    const { data: weeklyPlans, error: weeklyPlanError } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('userid', user.id)
      .order('"weekStartDate"', { ascending: false })
      .limit(1);

    if (weeklyPlanError) {
      console.error('Error fetching weekly plan:', weeklyPlanError);
      return NextResponse.json(
        { error: 'Failed to fetch weekly plan' },
        { status: 500 }
      );
    }

    // No weekly plan found
    if (!weeklyPlans || weeklyPlans.length === 0) {
      return NextResponse.json({
        shoppingList: [],
        message: 'No weekly plan found'
      });
    }

    const weeklyPlan = weeklyPlans[0];

    // 2. Get recipes for the weekly plan
    const { data: weeklyRecipes, error: recipesError } = await supabase
      .from('weekly_plan_recipes')
      .select('*')
      .eq('"weeklyPlanId"', weeklyPlan.id);

    if (recipesError) {
      console.error('Error fetching weekly plan recipes:', recipesError);
      return NextResponse.json(
        { error: 'Failed to fetch weekly plan recipes' },
        { status: 500 }
      );
    }

    // 3. Get pantry items for the user
    const { data: pantryItems, error: pantryError } = await supabase
      .from('pantry_items')
      .select('*')
      .eq('userid', user.id);

    if (pantryError) {
      console.error('Error fetching pantry items:', pantryError);
      return NextResponse.json(
        { error: 'Failed to fetch pantry items' },
        { status: 500 }
      );
    }

    // Extract pantry item names
    const pantryItemNames = pantryItems.map((item: { itemName: string }) => 
      item.itemName.toLowerCase()
    );

    console.log(`Found ${pantryItemNames.length} pantry items for user`);

    // 4. Extract all ingredients from recipes
    const allIngredients: string[] = [];
    const mealTypeStats = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      other: 0
    };
    
    if (weeklyRecipes && weeklyRecipes.length > 0) {
      weeklyRecipes.forEach((recipe) => {
        // Track which meal types we're processing
        const mealType = recipe.mealType ? recipe.mealType.toLowerCase() : 'other';
        if (mealType === 'breakfast' || mealType === 'lunch' || mealType === 'dinner') {
          mealTypeStats[mealType as 'breakfast' | 'lunch' | 'dinner']++;
        } else {
          mealTypeStats.other++;
        }
        
        if (recipe.recipeData && recipe.recipeData.ingredients && Array.isArray(recipe.recipeData.ingredients)) {
          recipe.recipeData.ingredients.forEach((ingredient: string) => {
            const cleanedIngredient = cleanIngredient(ingredient);
            
            // Only add if it's not empty and not already in the list
            if (cleanedIngredient && !allIngredients.includes(cleanedIngredient)) {
              allIngredients.push(cleanedIngredient);
            }
          });
        }
      });
    }

    console.log(`Meal types processed: Breakfast: ${mealTypeStats.breakfast}, Lunch: ${mealTypeStats.lunch}, Dinner: ${mealTypeStats.dinner}, Other: ${mealTypeStats.other}`);
    console.log(`Found ${allIngredients.length} unique ingredients across all recipes`);

    // 5. Filter out ingredients that are already in the pantry using the improved helper function
    const missingIngredients = allIngredients.filter(ingredient => 
      !isIngredientInPantry(ingredient, pantryItemNames)
    );

    console.log(`Found ${missingIngredients.length} ingredients missing from pantry`);

    // 6. Prepare shopping list
    const shoppingList = missingIngredients.map(item => ({
      name: item.trim(),
      category: categorizeIngredient(item.trim())
    }));

    // 7. Return the shopping list with cache control headers
    const response = NextResponse.json({
      shoppingList,
      totalItems: shoppingList.length,
      mealTypesIncluded: mealTypeStats,
      timestamp: new Date().toISOString() // Add timestamp to help identify different responses
    });
    
    // Add cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
    
  } catch (error) {
    console.error('Error generating shopping list:', error);
    return NextResponse.json(
      { error: 'Failed to generate shopping list' },
      { status: 500 }
    );
  }
}