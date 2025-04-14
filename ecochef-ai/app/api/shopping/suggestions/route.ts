import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { createServerClient, getCurrentUser } from '../../../lib/supabase-server';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../../lib/env';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: env.CLAUDE_API_KEY,
});

export async function GET() {
  try {
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
    I need a shopping list suggestion based on my current pantry items and food preferences to help me make more meals.

    Current pantry contents:
    ${pantryItemsText || 'No items in pantry yet.'}
    
    ${preferencesText}
    
    Please analyze my pantry and suggest:
    1. A list of 5-10 ingredients I should buy to maximize meal possibilities
    2. 3 recipe ideas I could make if I buy these ingredients, combining them with what I already have
    3. For each suggested ingredient, explain why it would be useful (e.g., "Eggs - versatile protein source for breakfast and baking")
    
    Format the output as a JSON object with these fields:
    - shoppingListSuggestions: array of objects with "name", "category", and "reason" fields
    - recipeIdeas: array of objects with "name", "ingredients", and "description" fields
    
    Focus on practical, nutritious ingredients that will allow for meal variety. Consider staples, produce with good shelf life, versatile proteins, etc.
    `;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout
      
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1500,
        system: "You are a helpful AI assistant focused on nutrition and cooking advice. Provide practical shopping list suggestions and recipe ideas based on what's already in the pantry.",
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

      // Parse the JSON response
      try {
        const suggestions = JSON.parse(responseContent);
        return NextResponse.json(suggestions);
      } catch (e) {
        console.error('Failed to parse JSON from Claude response:', e);
        // Fall back to returning the raw text
        return NextResponse.json({
          shoppingListSuggestions: [
            { name: "Parse Error", category: "Error", reason: "Claude did not return valid JSON. Raw response: " + responseContent.substring(0, 100) + "..." }
          ],
          recipeIdeas: []
        });
      }
    } catch (error) {
      console.error('Error getting Claude suggestions:', error);
      
      // Provide fallback suggestions if Claude API fails
      const fallbackSuggestions = {
        shoppingListSuggestions: [
          { name: "Eggs", category: "Proteins", reason: "Versatile protein for breakfast, lunch and dinner" },
          { name: "Chicken breast", category: "Proteins", reason: "Lean protein that goes with many dishes" },
          { name: "Onions", category: "Vegetables", reason: "Base for many recipes, adds flavor to dishes" },
          { name: "Garlic", category: "Vegetables", reason: "Essential flavor ingredient for countless recipes" },
          { name: "Rice", category: "Grains", reason: "Versatile side dish that keeps well" },
          { name: "Pasta", category: "Grains", reason: "Quick base for many meals" },
          { name: "Tomato sauce", category: "Condiments", reason: "Ready-made sauce for pasta and other dishes" },
          { name: "Canned beans", category: "Proteins", reason: "Shelf-stable protein that's ready to use" }
        ],
        recipeIdeas: [
          {
            name: "Simple Pasta Dinner",
            ingredients: ["Pasta", "Tomato sauce", "Garlic", "Onions"],
            description: "Quick weeknight pasta with sauce and aromatics"
          },
          {
            name: "Chicken and Rice Bowl",
            ingredients: ["Chicken breast", "Rice", "Vegetables from pantry"],
            description: "Healthy protein bowl with grains and vegetables"
          },
          {
            name: "Breakfast Scramble",
            ingredients: ["Eggs", "Onions", "Any available vegetables"],
            description: "Protein-packed breakfast with vegetables"
          }
        ]
      };
      
      return NextResponse.json(fallbackSuggestions);
    }
  } catch (error) {
    console.error('Error in shopping suggestions API:', error);
    
    let errorMessage = 'Unknown error';
    if (error && typeof error === 'object' && 'message' in error && 
        typeof error.message === 'string') {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: 'Failed to get shopping suggestions', details: errorMessage },
      { status: 500 }
    );
  }
} 