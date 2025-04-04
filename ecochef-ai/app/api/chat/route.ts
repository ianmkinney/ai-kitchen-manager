import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../lib/env';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: env.CLAUDE_API_KEY,
  // Set a timeout for the API request
  requestTimeout: 25000, // 25 seconds
});

// Add fallback suggestions for when the API is slow
const getFallbackSuggestions = (preferences: any) => {
  // Check dietary restrictions and return appropriate fallback suggestions
  const isVegetarian = preferences.isVegetarian;
  const isVegan = preferences.isVegan;
  const isGlutenFree = preferences.isGlutenFree;
  
  let suggestions = "Here are some meal suggestions based on your preferences:\n\n";
  
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

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Create a promise with a timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), 5000);
    });

    // Try to get a response from the API with a timeout
    try {
      const responsePromise = anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        system: "You are a helpful AI assistant focused on nutrition and cooking advice. Provide personalized meal suggestions and tips based on dietary preferences.",
        messages: [
          { role: 'user', content: message }
        ],
      });
      
      // Race between the API response and timeout
      const response = await Promise.race([responsePromise, timeoutPromise]);
      
      let responseText = '';
      if (response.content && Array.isArray(response.content)) {
        responseText = response.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('\n');
      }

      return NextResponse.json({ response: responseText });
    } catch (timeoutError) {
      // If timeout happens, use fallback
      console.log('AI response timed out, using fallback suggestions');
      return NextResponse.json({ 
        response: getFallbackSuggestions(preferences),
        source: 'fallback'
      });
    }
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    );
  }
} 