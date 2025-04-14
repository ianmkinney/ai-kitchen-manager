import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../lib/env';
import { createServerClient, getCurrentUser } from '../../lib/supabase-server';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: env.CLAUDE_API_KEY,
});

const generateRecipeJSON = (recipes: { name: string; ingredients: string[]; instructions: string[] }[]) => {
  return JSON.stringify(recipes, null, 2);
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message } = body;
    const preferences = body.preferences || {};
    
    // Get user from our helper
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Create server client with our helper
    const supabase = await createServerClient();
    
    // Get pantry items from Supabase
    let pantryItemsData: { name: string }[] = [];
    try {
      const { data, error } = await supabase
        .from('pantry_items')
        .select('name')
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error fetching pantry items:', error);
      } else if (data) {
        pantryItemsData = data;
      }
    } catch (err) {
      console.error('Exception fetching pantry items:', err);
    }
    
    // Extract pantry item names
    const pantryItemNames = pantryItemsData.map(item => item.name || '').filter(Boolean);

    console.log('Chat API received request with message:', message);
    console.log('Chat API received preferences:', preferences);
    console.log('Chat API received pantry items:', pantryItemNames);

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
    const pantryItemsText = pantryItemNames.length > 0 
      ? `Current pantry items: ${pantryItemNames.join(', ')}\n\nMAKE SURE TO USE THESE PANTRY ITEMS IN YOUR RECIPE SUGGESTIONS!`
      : 'No items currently in pantry.\n';
    
    // Extract cuisine preferences if available
    const cuisinePreferences = Array.isArray(preferences.cuisinePreferences) 
      ? preferences.cuisinePreferences.join(', ')
      : preferences.cuisine || 'Any';
      
    // Extract flavor preferences if available
    const flavorPreferences = Array.isArray(preferences.flavorPreferences) 
      ? preferences.flavorPreferences.join(', ')
      : 'No specific flavor preferences';

    const enhancedMessage = `
      USER QUERY: "${userQuery}"
      
      I need specific recipes that DIRECTLY ADDRESS the user's query above.
      
      Dietary preferences:
      - ${preferences.isVegetarian ? 'Is Vegetarian' : 'Not Vegetarian'}
      - ${preferences.isVegan ? 'Is Vegan' : 'Not Vegan'}
      - ${preferences.isGlutenFree ? 'Needs Gluten-Free options' : 'Can eat gluten'}
      - ${preferences.isDairyFree ? 'Needs Dairy-Free options' : 'Can consume dairy'}
      - ${preferences.isNutFree ? 'Needs Nut-Free options' : 'Can eat nuts'}
      - Preferred cuisines: ${cuisinePreferences}
      - Flavor preferences: ${flavorPreferences}
      - Cooking for: ${preferences.peopleCount || 2} people
      - Maximum cooking time: ${preferences.maxCookingTime || 60} minutes
      - Cooking skill level: ${preferences.cookingSkillLevel || 'intermediate'}
      
      ${pantryItemsText}
      
      Respond with a JSON array containing 3-5 recipe objects. Each recipe should include:
      - "name": Recipe title
      - "ingredients": Array of ingredients with measurements
      - "instructions": Array of step-by-step instructions
      
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
      4. Each recipe object must have "name", "ingredients", and "instructions" fields
      5. Ensure dietary restrictions are strictly followed
      6. Be creative and avoid repetitive suggestions even for similar queries
      7. Focus on practical, easy-to-follow recipes
      8. Include specific measurements in ingredients
      9. Your response should ONLY contain the JSON array, no additional text or commentary
      
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
            ingredients: pantryItemNames.slice(0, 3).concat([
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
            ingredients: pantryItemNames.slice(0, 3).concat([
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
            ingredients: pantryItemNames.slice(0, 3).concat([
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
            ingredients: pantryItemNames.slice(0, 3).concat([
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