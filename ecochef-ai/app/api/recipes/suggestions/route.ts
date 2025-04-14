import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { createServerClient, getCurrentUser } from '../../../lib/supabase-server';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../../lib/env';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: env.CLAUDE_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = body;
    
    if (!query) {
      return NextResponse.json(
        { error: 'Recipe query is required' },
        { status: 400 }
      );
    }
    
    // Get the current user with our helper
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Create server client with our helper
    const supabase = createServerClient();
    
    // Get user preferences
    const userPrefs = await prisma.userPreferences.findUnique({
      where: {
        userId: user.id
      }
    });
    
    // Get current pantry items from Supabase
    const { data: pantryItems, error } = await supabase
      .from('pantry_items')
      .select('*')
      .eq('user_id', user.id);
      
    if (error) {
      console.error('Error fetching pantry items:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pantry items' },
        { status: 500 }
      );
    }
    
    // Format pantry items for Claude
    const pantryItemsText = pantryItems.map((item: any) => 
      `${item.name}`
    ).join('\n');
    
    // Prepare preferences text
    let preferencesText = 'User preferences:\n';
    if (userPrefs) {
      if (userPrefs.isVegetarian) preferencesText += '- Vegetarian\n';
      if (userPrefs.isVegan) preferencesText += '- Vegan\n';
      if (userPrefs.isGlutenFree) preferencesText += '- Gluten-free\n';
      if (userPrefs.isDairyFree) preferencesText += '- Dairy-free\n';
      if (userPrefs.isNutFree) preferencesText += '- Nut-free\n';
      
      if (userPrefs.spicyPreference) 
        preferencesText += `- Spicy preference: ${userPrefs.spicyPreference}/10\n`;
      if (userPrefs.sweetPreference) 
        preferencesText += `- Sweet preference: ${userPrefs.sweetPreference}/10\n`;
      if (userPrefs.savoryPreference) 
        preferencesText += `- Savory preference: ${userPrefs.savoryPreference}/10\n`;
        
      if (userPrefs.maxCookingTime) 
        preferencesText += `- Maximum cooking time: ${userPrefs.maxCookingTime} minutes\n`;
      if (userPrefs.cookingSkillLevel) 
        preferencesText += `- Cooking skill level: ${userPrefs.cookingSkillLevel}\n`;
    }
    
    // Prepare the prompt for Claude
    const prompt = `
    I'm looking for recipe suggestions based on what's in my pantry and my dietary preferences.
    
    User query: "${query}"
    
    Current pantry contents:
    ${pantryItemsText || 'No items in pantry yet.'}
    
    ${preferencesText}
    
    Please suggest 3 recipes I can make that:
    1. Use ingredients I already have in my pantry where possible
    2. Respect my dietary preferences
    3. Match my query/request
    
    For each recipe, include:
    - Recipe name
    - Ingredients list (mark which ones I already have in my pantry)
    - Brief cooking instructions
    - Nutritional highlights
    
    If I'm missing key ingredients, suggest possible substitutes from my pantry.
    `;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout
      
      const response = await anthropic.messages.create({
        model: 'claude-3.7',
        max_tokens: 1500,
        system: "You are a helpful AI cooking assistant. Provide personalized recipe suggestions based on what's in the user's pantry and their dietary preferences.",
        messages: [
          { role: 'user', content: prompt }
        ]
      }, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      let responseContent = '';
      if (response.content && Array.isArray(response.content)) {
        responseContent = response.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('\n');
      }

      return NextResponse.json({ suggestions: responseContent });
    } catch (error) {
      console.error('Error getting Claude recipe suggestions:', error);
      
      // Provide fallback suggestions if Claude API fails
      const fallbackSuggestion = `
        Based on your pantry and preferences, here are some recipe ideas:
        
        1. Simple Pasta Dish
           - Pasta (if in pantry)
           - Olive oil (if in pantry)
           - Garlic (if in pantry)
           - Any vegetables you have in your pantry
           
           Instructions: Cook pasta according to package. Sauté garlic in olive oil, add chopped vegetables, and mix with pasta.
           
        2. Quick Stir Fry
           - Rice or noodles (if in pantry)
           - Any protein you have (beans, tofu, meat)
           - Any vegetables in your pantry
           - Soy sauce or other seasonings
           
           Instructions: Cook rice/noodles. Stir fry protein and vegetables with seasonings and serve over rice/noodles.
           
        3. Pantry Bowl
           - Grain base (rice, quinoa if available)
           - Protein (beans, lentils, eggs if available)
           - Vegetables (whatever you have)
           - Dressing made from pantry staples
           
           Instructions: Arrange cooked grain, protein, and vegetables in a bowl. Top with simple dressing.
      `;
      
      return NextResponse.json({ suggestions: fallbackSuggestion });
    }
  } catch (error) {
    console.error('Error in recipe suggestions API:', error);
    
    let errorMessage = 'Unknown error';
    if (error && typeof error === 'object' && 'message' in error && 
        typeof error.message === 'string') {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: 'Failed to get recipe suggestions', details: errorMessage },
      { status: 500 }
    );
  }
} 