import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../lib/env';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: env.CLAUDE_API_KEY,
});

// Add a proper interface for the preferences
interface UserPreferences {
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree?: boolean;
  isDairyFree?: boolean;
  isNutFree?: boolean;
  maxCookingTime?: number;
  cookingSkillLevel?: string;
  cuisinePreferences?: string[];
  flavorPreferences?: string[];
  peopleCount?: number;
  [key: string]: boolean | number | string | string[] | undefined;
}

// Add fallback suggestions for when the API is slow
const getFallbackSuggestions = (preferences: unknown, pantryItems: string[] = []) => {
  // Type assertion to work with the preferences
  const prefs = preferences as UserPreferences;
  
  // Check dietary restrictions and return appropriate fallback suggestions
  const isVegetarian = prefs.isVegetarian;
  const isVegan = prefs.isVegan;
  
  const pantryItemsList = pantryItems.length > 0 ? `Based on your pantry items (${pantryItems.join(', ')}), ` : '';
  
  let suggestions = `${pantryItemsList}Here are some shopping suggestions and meal ideas based on your preferences:\n\n`;
  
  if (isVegan) {
    suggestions += "Shopping List Suggestions:\n";
    suggestions += "1. Tofu or tempeh for protein\n";
    suggestions += "2. Nutritional yeast for cheesy flavor\n";
    suggestions += "3. Canned beans for quick meals\n";
    suggestions += "4. Fresh seasonal vegetables\n";
    suggestions += "5. Plant-based milk\n\n";
    
    suggestions += "Meal Ideas:\n";
    suggestions += "1. Chickpea and vegetable curry with brown rice\n";
    suggestions += "2. Lentil and vegetable soup with a side salad\n";
    suggestions += "3. Quinoa bowl with roasted vegetables and tahini dressing\n\n";
  } else if (isVegetarian) {
    suggestions += "Shopping List Suggestions:\n";
    suggestions += "1. Eggs for quick protein\n";
    suggestions += "2. Greek yogurt\n";
    suggestions += "3. Various cheeses\n";
    suggestions += "4. Fresh seasonal vegetables\n";
    suggestions += "5. Nuts and seeds\n\n";
    
    suggestions += "Meal Ideas:\n";
    suggestions += "1. Greek yogurt parfait with berries and granola\n";
    suggestions += "2. Spinach and feta omelet with whole grain toast\n";
    suggestions += "3. Caprese salad with crusty bread\n\n";
  } else {
    suggestions += "Shopping List Suggestions:\n";
    suggestions += "1. Chicken breasts or thighs\n";
    suggestions += "2. Ground turkey\n";
    suggestions += "3. Fish (salmon or white fish)\n";
    suggestions += "4. Fresh seasonal vegetables\n";
    suggestions += "5. Whole grains like quinoa or brown rice\n\n";
    
    suggestions += "Meal Ideas:\n";
    suggestions += "1. Grilled chicken with roasted vegetables\n";
    suggestions += "2. Salmon with quinoa and steamed broccoli\n";
    suggestions += "3. Turkey and vegetable stir-fry with brown rice\n\n";
  }
  
  suggestions += "Nutrition Advice: Focus on whole foods, plenty of vegetables, lean proteins, and whole grains. Stay hydrated and try to limit processed foods.";
  
  return suggestions;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message } = body;
    const preferences = body.preferences || {};
    const pantryItems = body.pantryItems || [];

    console.log('Chat API received request with message:', message);
    console.log('Chat API received preferences:', preferences);
    console.log('Chat API received pantry items:', pantryItems);

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Create a enhanced message with detailed preferences and pantry items
    const pantryItemsText = pantryItems.length > 0 
      ? `Current pantry items: ${pantryItems.join(', ')}\n`
      : 'No items currently in pantry.\n';
    
    // Extract cuisine preferences if available
    const cuisinePreferences = Array.isArray(preferences.cuisinePreferences) 
      ? preferences.cuisinePreferences.join(', ')
      : 'Any';
      
    // Extract flavor preferences if available
    const flavorPreferences = Array.isArray(preferences.flavorPreferences) 
      ? preferences.flavorPreferences.join(', ')
      : 'No specific flavor preferences';

    const enhancedMessage = `
      Based on the following dietary preferences:
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
      
      ${message}
      
      If this is a shopping request, suggest 5-10 ingredients that would complement their pantry items, considering their preferences. 
      If recipe suggestions are requested, give 3 specific meal ideas that can be made using their pantry items plus a few additional ingredients, with brief cooking instructions.
      Include sustainability tips if possible.
    `;

    // Try to get a response from the API with a timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout
      
      const responsePromise = anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        system: "You are a helpful AI assistant focused on nutrition and cooking advice. Provide personalized meal suggestions and tips based on dietary preferences and pantry inventory. Suggest recipes that use ingredients the person already has plus a few additional items they could purchase. Always consider dietary restrictions and preferences in your suggestions.",
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

      return NextResponse.json({ response: responseText });
    } catch (error) {
      // Type guard to check if error is an object with a name property
      if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
        // Handle timeout
        console.log('AI response timed out, using fallback suggestions');
        return NextResponse.json({ 
          response: getFallbackSuggestions(preferences, pantryItems),
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