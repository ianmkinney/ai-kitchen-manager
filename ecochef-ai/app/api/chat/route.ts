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
      
      I need specific recipes that DIRECTLY ADDRESS the user's query above.
      
      Dietary preferences:
      - ${preferences.isVegetarian ? 'Is Vegetarian' : 'Not Vegetarian'}
      - ${preferences.isVegan ? 'Is Vegan' : 'Not Vegan'}
      - ${preferences.isGlutenFree ? 'Needs Gluten-Free options' : 'Can eat gluten'}
      - ${preferences.isDairyFree ? 'Needs Dairy-Free options' : 'Can consume dairy'}
      - Preferred cuisines: ${cuisinePreferences}
      - Cooking for: ${preferences.peopleCount || 2} people
      - Maximum cooking time: ${preferences.maxCookingTime || 60} minutes
      
      ${pantryItemsText}
      
      Respond with a JSON array containing 3-5 recipe objects. Each recipe MUST include:
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
      
      Guidelines:
      1. Always provide varied and unique recipe suggestions that directly address the user's query
      2. Prioritize using ingredients from the user's pantry when possible
      3. Format your response as a valid JSON array of recipe objects
      4. Each recipe object MUST have ALL of these fields:
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
      
      The final output must be a valid JSON array that can be parsed by JSON.parse().
    `;

    // Try to get a response from the API with a timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout
      
      const responsePromise = anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1500,
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

      // Try to sanitize common JSON issues before parsing
      const cleanedText = responseText
        .replace(/```json/g, '')   // Remove json code blocks
        .replace(/```/g, '')       // Remove closing code blocks
        .trim();                   // Remove whitespace

      let parsedResponse;
      try {
        // Try direct parsing first
        parsedResponse = JSON.parse(cleanedText);
        return NextResponse.json({ response: JSON.stringify(parsedResponse) });
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError);
        // Extract JSON array if it's embedded in text
        const jsonMatch = cleanedText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          try {
            parsedResponse = JSON.parse(jsonStr);
            return NextResponse.json({ response: JSON.stringify(parsedResponse) });
          } catch (e) {
            console.error('Failed to extract valid JSON from response:', e);
          }
        }
        
        // If we still couldn't parse, use fallback
        const fallbackRecipes = [
          {
            name: `${userQuery.includes('chicken') ? 'Herb Roasted Chicken' : userQuery.includes('vegetarian') ? 'Vegetable Stir Fry' : 'Simple Pasta Dish'}`,
            ingredients: pantryItems.slice(0, 3).concat([
              "Other ingredients based on preferences",
              "Seasonings and spices"
            ]),
            instructions: [
              "Prepare ingredients",
              "Cook according to method",
              "Serve and enjoy"
            ]
          },
          {
            name: `${userQuery.includes('fish') ? 'Lemon Garlic Fish' : userQuery.includes('vegan') ? 'Bean and Vegetable Bowl' : 'Quick Stir Fry'}`,
            ingredients: pantryItems.slice(0, 3).concat([
              "Supporting ingredients",
              "Seasonings and oils"
            ]),
            instructions: [
              "Prepare ingredients",
              "Cook main components",
              "Combine and serve"
            ]
          }
        ];
        
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
        
        // Create fallback recipes based on user query
        const fallbackRecipes = [
          {
            name: `${userQuery.includes('chicken') ? 'Herb Roasted Chicken' : userQuery.includes('vegetarian') ? 'Vegetable Stir Fry' : 'Simple Pasta Dish'}`,
            ingredients: pantryItems.slice(0, 3).concat([
              "Other ingredients based on preferences",
              "Seasonings and spices"
            ]),
            instructions: [
              "Prepare ingredients",
              "Cook according to method",
              "Serve and enjoy"
            ]
          },
          {
            name: `${userQuery.includes('fish') ? 'Lemon Garlic Fish' : userQuery.includes('vegan') ? 'Bean and Vegetable Bowl' : 'Quick Stir Fry'}`,
            ingredients: pantryItems.slice(0, 3).concat([
              "Supporting ingredients",
              "Seasonings and oils"
            ]),
            instructions: [
              "Prepare ingredients",
              "Cook main components",
              "Combine and serve"
            ]
          }
        ];
        
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