import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../lib/env';

// Initialize Anthropic client with API key from environment variables
const anthropic = new Anthropic({
  apiKey: env.getAnthropicApiKey(),
});

// Helper function to generate recipe JSON
const generateRecipeJSON = (recipes: { name: string; ingredients: string[]; instructions: string[] }[]) => {
  return JSON.stringify(recipes, null, 2);
};

// Get user ID from request headers or use test user ID
function getUserFromHeaders(request: Request) {
  // Check headers for user ID and email
  const userId = request.headers.get('x-user-id');
  const userEmail = request.headers.get('x-user-email');
  
  // If headers are present, use them
  if (userId && userEmail) {
    return {
      id: userId,
      email: userEmail,
      role: 'authenticated'
    };
  }
  
  // Check for test user cookie
  const cookies = request.headers.get('cookie') || '';
  const hasTestUserCookie = cookies.includes('test_user=') || 
                            cookies.includes('ecochef_test_user=');
  
  // If test user cookie is present, return test user
  if (hasTestUserCookie) {
    return {
      id: '00000000-0000-0000-0000-000000000000',
      email: 'test@ecochef.demo',
      role: 'authenticated'
    };
  }
  
  // No user found
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message } = body;
    const preferences = body.preferences || {};
    const pantryItems = body.pantryItems || [];
    
    // Get user from request headers or cookies
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Chat API received request with message:', message);
    console.log('Chat API received preferences:', preferences);
    console.log('Chat API received pantry items:', pantryItems);

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Extract the original query from the message
    let userQuery = message;
    if (message.includes('USER QUERY:')) {
      const match = message.match(/USER QUERY:\s*"([^"]*)"/);
      if (match && match[1]) {
        userQuery = match[1];
      }
    }

    // Extract number of recipes requested from user query
    let requestedRecipeCount = 3; // Default to 3
    const countMatches = userQuery.match(/\b(\d+)\s+(?:recipes?|suggestions?|ideas?|options?)\b/i);
    if (countMatches) {
      const count = parseInt(countMatches[1]);
      if (count >= 1 && count <= 10) { // Reasonable range
        requestedRecipeCount = count;
      }
    }
    
    // Also check for patterns like "give me 5 recipes" or "I want 2 suggestions"
    const directCountMatches = userQuery.match(/\b(?:give me|i want|show me|provide|need)\s+(\d+)\s+(?:recipes?|suggestions?|ideas?|options?)\b/i);
    if (directCountMatches) {
      const count = parseInt(directCountMatches[1]);
      if (count >= 1 && count <= 10) {
        requestedRecipeCount = count;
      }
    }

    // Create an enhanced message with detailed preferences and pantry items
    const pantryItemsText = pantryItems.length > 0 
      ? `Current pantry items: ${pantryItems.join(', ')}\n\nMAKE SURE TO USE THESE PANTRY ITEMS IN YOUR RECIPE SUGGESTIONS!`
      : 'No items currently in pantry.\n';
    
    // Extract cuisine preferences if available
    const cuisinePreferences = Array.isArray(preferences.cuisinePreferences) 
      ? preferences.cuisinePreferences.join(', ')
      : preferences.cuisine || 'Any';

    const enhancedMessage = `
      USER QUERY: "${userQuery}"
      
      I need exactly ${requestedRecipeCount} recipe${requestedRecipeCount === 1 ? '' : 's'} that DIRECTLY ADDRESS${requestedRecipeCount === 1 ? 'ES' : ''} the user's query above.
      
      IMPORTANT: Provide exactly ${requestedRecipeCount} recipe${requestedRecipeCount === 1 ? '' : 's'}, not more, not less.
      
      Dietary preferences:
      - ${preferences.isVegetarian ? 'Is Vegetarian' : 'Not Vegetarian'}
      - ${preferences.isVegan ? 'Is Vegan' : 'Not Vegan'}
      - ${preferences.isGlutenFree ? 'Needs Gluten-Free options' : 'Can eat gluten'}
      - ${preferences.isDairyFree ? 'Needs Dairy-Free options' : 'Can consume dairy'}
      - Preferred cuisines: ${cuisinePreferences}
      - Cooking for: ${preferences.peopleCount || 2} people
      - Maximum cooking time: ${preferences.maxCookingTime || 60} minutes
      
      ${pantryItemsText}
      
      Respond with a JSON array containing exactly ${requestedRecipeCount} recipe object${requestedRecipeCount === 1 ? '' : 's'}. Each recipe MUST include:
      - "name": Recipe title
      - "ingredients": Array of ingredients with measurements
      - "instructions": Array of step-by-step instructions
      - "servingSize": Number of servings the recipe makes (integer)
      - "calories": Estimated calories per serving (integer)
      - "protein": Estimated protein in grams per serving (decimal)
      - "carbs": Estimated carbohydrates in grams per serving (decimal)
      - "fat": Estimated fat in grams per serving (decimal)
      - "nutritionInfo": JSON object with additional nutrition details
      
      Make sure the recipes DIRECTLY ADDRESS the user's specific query!
      Use ingredients they already have in their pantry when possible.
      Include ingredients they need to buy.
    `;

    // System prompt to ensure variety in responses
    const systemPrompt = `
      You are EcoChef AI, a culinary assistant specializing in personalized recipe suggestions.
      
      Your primary goal is to provide recipe suggestions that DIRECTLY address the user's specific query.
      
      CRITICAL FORMATTING REQUIREMENTS:
      - Your response MUST be ONLY a valid JSON array
      - NO markdown code blocks (\`\`\`json)
      - NO additional text, explanations, or commentary
      - NO trailing commas
      - ALL strings must use double quotes, not single quotes
      - ALL object keys must be in double quotes
      - Escape any quotes within strings properly
      
      Guidelines:
      1. Always provide exactly the number of recipes requested by the user (not more, not less)
      2. Provide varied and unique recipe suggestions that directly address the user's query
      3. Prioritize using ingredients from the user's pantry when possible
      4. Format your response as a valid JSON array of recipe objects
      5. Each recipe object MUST have ALL of these fields:
        - "name" (string): Recipe title 
        - "ingredients" (array): List of ingredients with measurements
        - "instructions" (array): Step-by-step cooking instructions
        - "servingSize" (integer): Number of servings the recipe makes
        - "calories" (integer): Estimated calories per serving
        - "protein" (number): Estimated protein in grams per serving
        - "carbs" (number): Estimated carbohydrates in grams per serving
        - "fat" (number): Estimated fat in grams per serving
        - "nutritionInfo" (object): Additional nutrition details
      5. NEVER omit nutritional information - it's required for the database
      6. Ensure dietary restrictions are strictly followed
      7. Be creative and avoid repetitive suggestions even for similar queries
      8. Focus on practical, easy-to-follow recipes
      9. Include specific measurements in ingredients
      10. Your response should ONLY contain the JSON array, no additional text or commentary
      
      EXAMPLE FORMAT - FOLLOW THIS EXACTLY:
      [
        {
          "name": "Mediterranean Chicken Bowl",
          "ingredients": ["2 chicken breasts", "1 cup quinoa", "1/2 cucumber diced", "1/4 cup feta cheese", "2 tbsp olive oil", "1 tsp oregano", "salt and pepper to taste"],
          "instructions": ["Season chicken with oregano, salt, and pepper", "Cook chicken in olive oil for 6-7 minutes per side", "Cook quinoa according to package directions", "Dice cucumber into small pieces", "Slice chicken and serve over quinoa with cucumber and feta"],
          "servingSize": 2,
          "calories": 450,
          "protein": 35.0,
          "carbs": 25.0,
          "fat": 18.0,
          "nutritionInfo": {
            "fiber": 3.0,
            "sugar": 4.0,
            "sodium": 520
          }
        },
        {
          "name": "Vegetable Stir Fry",
          "ingredients": ["1 bell pepper sliced", "1 cup broccoli florets", "1 carrot julienned", "2 cloves garlic minced", "2 tbsp soy sauce", "1 tbsp sesame oil", "1 tsp ginger"],
          "instructions": ["Heat sesame oil in large pan", "Add garlic and ginger, cook 30 seconds", "Add vegetables, stir fry 5-7 minutes", "Add soy sauce and cook 1 more minute", "Serve immediately over rice"],
          "servingSize": 3,
          "calories": 120,
          "protein": 8.0,
          "carbs": 15.0,
          "fat": 4.0,
          "nutritionInfo": {
            "fiber": 4.0,
            "sugar": 6.0,
            "sodium": 680
          }
        }
      ]
      
      The final output must be a valid JSON array that can be parsed by JSON.parse().
      
      CRITICAL: Copy the structure above EXACTLY. Use the same field names, data types, and formatting. Do not add any extra fields or change the structure.
    `;

    // Try to get a response from the API with a timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout
      
      const responsePromise = anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: enhancedMessage }
        ],
      }, {
        signal: controller.signal
      });
      
      const response = await responsePromise;
      clearTimeout(timeoutId);
      
      let responseText = '';
      if (response.content && Array.isArray(response.content)) {
        responseText = response.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('\n');
      }

      // Robust JSON parsing with multiple fallback strategies
      const parseAIResponse = (text: string): any[] => {
        console.log('Raw AI response length:', text.length);
        
        // Strategy 1: Direct JSON parsing
        try {
          const directParse = JSON.parse(text.trim());
          if (Array.isArray(directParse)) return directParse;
          if (directParse && typeof directParse === 'object') return [directParse];
        } catch (e) {
          console.log('Direct parsing failed:', e.message);
        }
        
        // Strategy 2: Clean and parse (remove markdown, code blocks, etc.)
        const cleanedText = text
          .replace(/```json\s*/gi, '')     // Remove json code blocks
          .replace(/```\s*/g, '')          // Remove closing code blocks
          .replace(/^\s*```.*$/gm, '')     // Remove any remaining code blocks
          .replace(/^[\s\S]*?(\[|\{)/, '$1') // Remove text before first array/object
          .replace(/(\}|\])\s*[\s\S]*$/, '$1') // Remove text after last object/array
          .trim();
        
        try {
          const cleanedParse = JSON.parse(cleanedText);
          if (Array.isArray(cleanedParse)) return cleanedParse;
          if (cleanedParse && typeof cleanedParse === 'object') return [cleanedParse];
        } catch (e) {
          console.log('Cleaned parsing failed:', e.message);
        }
        
        // Strategy 3: Extract JSON using regex patterns
        const jsonPatterns = [
          /\[\s*\{[\s\S]*?\}\s*(?:,\s*\{[\s\S]*?\}\s*)*\]/,  // Array of objects
          /\{[\s\S]*?\}/,  // Single object
          /\[[\s\S]*?\]/   // Array
        ];
        
        for (const pattern of jsonPatterns) {
          const matches = cleanedText.match(pattern);
          if (matches) {
            for (const match of matches) {
              try {
                const parsed = JSON.parse(match);
                if (Array.isArray(parsed)) return parsed;
                if (parsed && typeof parsed === 'object') return [parsed];
              } catch (e) {
                console.log('Regex parsing failed for match length:', match.length);
              }
            }
          }
        }
        
        // Strategy 4: Try to fix common JSON issues
        const fixCommonIssues = (str: string): string => {
          return str
            // Fix trailing commas
            .replace(/,(\s*[}\]])/g, '$1')
            // Fix missing quotes around keys (be careful with this)
            .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
            // Fix single quotes to double quotes
            .replace(/'/g, '"')
            // Fix unescaped quotes in strings (more comprehensive)
            .replace(/"([^"]*)"([^"]*)"([^"]*)":/g, '"$1\\"$2\\"$3":')
            // Fix newlines in strings
            .replace(/\n/g, '\\n')
            // Fix tabs in strings
            .replace(/\t/g, '\\t')
            // Fix carriage returns
            .replace(/\r/g, '\\r')
            // Fix backslashes that aren't escaped
            .replace(/\\(?!["\\\/bfnrt])/g, '\\\\');
        };
        
        try {
          const fixedText = fixCommonIssues(cleanedText);
          const parsed = JSON.parse(fixedText);
          if (Array.isArray(parsed)) return parsed;
          if (parsed && typeof parsed === 'object') return [parsed];
        } catch (e) {
          console.log('Fixed parsing failed:', e.message);
        }
        
        // Strategy 5: Aggressive truncation and reconstruction
        try {
          // Find the first complete object/array and truncate there
          const firstArrayMatch = cleanedText.match(/\[\s*\{[\s\S]*?\}\s*(?:,\s*\{[\s\S]*?\}\s*)*/);
          if (firstArrayMatch) {
            let truncatedJson = firstArrayMatch[0];
            // Ensure it ends with ]
            if (!truncatedJson.endsWith(']')) {
              truncatedJson += ']';
            }
            const parsed = JSON.parse(truncatedJson);
            if (Array.isArray(parsed)) return parsed;
          }
        } catch (e) {
          console.log('Truncation parsing failed:', e.message);
        }
        
        return [];
      };
      
      const parsedRecipes = parseAIResponse(responseText);
      
      let parsedResponse;
      if (parsedRecipes.length > 0) {
        // Validate and clean the parsed recipes
        const validatedRecipes = parsedRecipes
          .filter(recipe => recipe && typeof recipe === 'object')
          .map(recipe => ({
            name: recipe.name || 'Unnamed Recipe',
            ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
            instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
            prepTime: recipe.prepTime || '10 minutes',
            cookTime: recipe.cookTime || '20 minutes',
            servings: recipe.servings || 2,
            difficulty: recipe.difficulty || 'Easy',
            cuisine: recipe.cuisine || 'International',
            tags: Array.isArray(recipe.tags) ? recipe.tags : [],
            description: recipe.description || '',
            nutrition: recipe.nutrition || {}
          }));
        
        if (validatedRecipes.length > 0) {
          return NextResponse.json({ response: JSON.stringify(validatedRecipes) });
        }
      }
      
      // If parsing failed, try the original fallback logic
      try {
        parsedResponse = JSON.parse(responseText);
        return NextResponse.json({ response: JSON.stringify(parsedResponse) });
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError);
        // Extract JSON array if it's embedded in text
        const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          try {
            parsedResponse = JSON.parse(jsonStr);
            return NextResponse.json({ response: JSON.stringify(parsedResponse) });
          } catch (e) {
            console.error('Failed to extract valid JSON from response:', e);
          }
        }
        
        // If we still couldn't parse, use fallback with requested count
        const fallbackRecipes = Array.from({ length: requestedRecipeCount }, (_, index) => {
          const recipeNames = [
            userQuery.includes('chicken') ? 'Herb Roasted Chicken' : userQuery.includes('vegetarian') ? 'Vegetable Stir Fry' : 'Simple Pasta Dish',
            userQuery.includes('fish') ? 'Lemon Garlic Fish' : userQuery.includes('vegan') ? 'Bean and Vegetable Bowl' : 'Quick Stir Fry',
            userQuery.includes('beef') ? 'Beef Stir Fry' : userQuery.includes('pasta') ? 'Creamy Pasta' : 'Healthy Salad Bowl'
          ];
          
          return {
            name: recipeNames[index % recipeNames.length],
            ingredients: pantryItems.slice(0, 3).concat([
              "Other ingredients based on preferences",
              "Seasonings and spices"
            ]),
            instructions: [
              "Prepare ingredients",
              "Cook according to method",
              "Serve and enjoy"
            ],
            servingSize: 2,
            calories: 350,
            protein: 25.0,
            carbs: 30.0,
            fat: 15.0,
            nutritionInfo: {
              fiber: 5.0,
              sugar: 8.0,
              sodium: 400
            }
          };
        });
        
        return NextResponse.json({ 
          response: generateRecipeJSON(fallbackRecipes),
          source: 'fallback'
        });
      }
    } catch (error) {
      // Type guard to check if error is an object with a name property
      if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
        // Handle timeout
        console.log('AI response timed out, using fallback suggestions');
        
        // Create fallback recipes based on user query with requested count
        const fallbackRecipes = Array.from({ length: requestedRecipeCount }, (_, index) => {
          const recipeNames = [
            userQuery.includes('chicken') ? 'Herb Roasted Chicken' : userQuery.includes('vegetarian') ? 'Vegetable Stir Fry' : 'Simple Pasta Dish',
            userQuery.includes('fish') ? 'Lemon Garlic Fish' : userQuery.includes('vegan') ? 'Bean and Vegetable Bowl' : 'Quick Stir Fry',
            userQuery.includes('beef') ? 'Beef Stir Fry' : userQuery.includes('pasta') ? 'Creamy Pasta' : 'Healthy Salad Bowl'
          ];
          
          return {
            name: recipeNames[index % recipeNames.length],
            ingredients: pantryItems.slice(0, 3).concat([
              "Other ingredients based on preferences",
              "Seasonings and spices"
            ]),
            instructions: [
              "Prepare ingredients",
              "Cook according to method",
              "Serve and enjoy"
            ],
            servingSize: 2,
            calories: 350,
            protein: 25.0,
            carbs: 30.0,
            fat: 15.0,
            nutritionInfo: {
              fiber: 5.0,
              sugar: 8.0,
              sodium: 400
            }
          };
        });
        
        return NextResponse.json({ 
          response: generateRecipeJSON(fallbackRecipes),
          source: 'fallback'
        });
      }
      // Handle other errors
      throw error;
    }
  } catch (error) {
    // Improved error logging with proper type checking
    console.error('Error in chat API:', error);
    
    // Get error details with proper type checking
    let errorMessage = 'Unknown error';
    if (error && typeof error === 'object' && 'message' in error && 
        typeof error.message === 'string') {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: 'Failed to get AI response', details: errorMessage },
      { status: 500 }
    );
  }
}