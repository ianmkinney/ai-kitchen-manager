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
  maxCookingTime?: number;
  cuisine?: string;
  peopleCount?: number;
  [key: string]: boolean | number | string | undefined;
}

// Add fallback suggestions for when the API is slow
const getFallbackSuggestions = (preferences: unknown) => {
  // Type assertion to work with the preferences
  const prefs = preferences as UserPreferences;
  
  // Check dietary restrictions and return appropriate fallback suggestions
  const isVegetarian = prefs.isVegetarian;
  const isVegan = prefs.isVegan;
  const cuisine = prefs.cuisine || 'Any';
  
  let suggestions = `Here are some meal suggestions based on your preferences (cuisine: ${cuisine}):\n\n`;
  
  if (isVegan) {
    suggestions += "1. Chickpea and vegetable curry with brown rice\n";
    suggestions += "2. Lentil and vegetable soup with a side salad\n";
    suggestions += "3. Quinoa bowl with roasted vegetables and tahini dressing\n\n";
  } else if (isVegetarian) {
    suggestions += "1. Greek yogurt parfait with berries and granola\n";
    suggestions += "2. Spinach and feta omelet with whole grain toast\n";
    suggestions += "3. Caprese salad with crusty bread\n\n";
  } else {
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

    console.log('Chat API received request with message:', message);
    console.log('Chat API received preferences:', preferences);

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Create a enhanced message with detailed preferences
    const enhancedMessage = `
      Based on the following dietary preferences:
      - ${preferences.isVegetarian ? 'Is Vegetarian' : 'Not Vegetarian'}
      - ${preferences.isVegan ? 'Is Vegan' : 'Not Vegan'}
      - ${preferences.isGlutenFree ? 'Needs Gluten-Free options' : 'Can eat gluten'}
      - ${preferences.isDairyFree ? 'Needs Dairy-Free options' : 'Can consume dairy'}
      - Preferred cuisine: ${preferences.cuisine || 'Any'}
      - Cooking for: ${preferences.peopleCount || 2} people
      - Maximum cooking time: ${preferences.maxCookingTime || 60} minutes
      
      ${message}
      
      Give 3 specific meal suggestions with brief cooking instructions, and a few nutrition tips.
    `;

    // Try to get a response from the API with a timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout
      
      const responsePromise = anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        system: "You are a helpful AI assistant focused on nutrition and cooking advice. Provide personalized meal suggestions and tips based on dietary preferences.",
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
          response: getFallbackSuggestions(preferences),
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