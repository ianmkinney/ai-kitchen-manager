import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../lib/env';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: env.CLAUDE_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message } = body;

    console.log('Cooking Assistant API received request with message:', message);

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Try to get a response from the API with a timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout
      
      const responsePromise = anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1500,
        system: "You are Chef Claude, a friendly and knowledgeable cooking assistant focused on providing step-by-step cooking instructions, recipe guidance, and food safety advice. Your expertise includes cooking techniques, ingredient substitutions, meal planning, dietary guidance, and kitchen safety. When providing recipes, always break them down into clear steps, list all ingredients with measurements, and include cooking times and temperatures. For food safety questions, prioritize accurate information about safe food handling, storage, cooking temperatures, and expiration guidelines. Be encouraging and supportive of all skill levels, from beginners to advanced cooks.",
        messages: [
          { role: 'user', content: message }
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
        console.log('AI response timed out, using fallback response');
        return NextResponse.json({ 
          response: "I'm sorry, but I'm having trouble generating a response right now. Here are some general cooking tips:\n\n- Always read the entire recipe before starting\n- Prep and measure ingredients before cooking (mise en place)\n- Taste and adjust seasoning as you go\n- For food safety, make sure to cook meats to their proper internal temperatures\n- When in doubt, throw it out - don't risk consuming spoiled food\n\nPlease try your question again in a moment!",
          source: 'fallback'
        });
      }
      // Handle other errors
      throw error;
    }
  } catch (error) {
    // Improved error logging with proper type checking
    console.error('Error in cooking assistant API:', error);
    
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