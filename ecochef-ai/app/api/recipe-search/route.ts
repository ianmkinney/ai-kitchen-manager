import { NextResponse } from 'next/server';

// Mock recipe database
const mockRecipes = [
  {
    id: 1,
    title: 'Classic Spaghetti Carbonara',
    description: 'A traditional Italian pasta dish with eggs, cheese, pancetta, and black pepper.',
    image: '/recipe-images/carbonara.jpg',
    difficulty: 'Intermediate',
    time: '30 minutes',
    cuisine: 'Italian',
    mealType: 'Dinner'
  },
  {
    id: 2,
    title: 'Vegetable Thai Curry',
    description: 'A fragrant and spicy Thai curry with mixed vegetables and coconut milk.',
    image: '/recipe-images/thai-curry.jpg',
    difficulty: 'Easy',
    time: '45 minutes',
    cuisine: 'Thai',
    mealType: 'Dinner'
  },
  {
    id: 3,
    title: 'Classic French Omelette',
    description: 'A soft, delicate omelette with fresh herbs and cheese.',
    image: '/recipe-images/omelette.jpg',
    difficulty: 'Easy',
    time: '15 minutes',
    cuisine: 'French',
    mealType: 'Breakfast'
  },
  {
    id: 4,
    title: 'Avocado Toast with Poached Egg',
    description: 'Creamy avocado on toasted bread topped with a perfectly poached egg.',
    image: '/recipe-images/avocado-toast.jpg',
    difficulty: 'Easy',
    time: '20 minutes',
    cuisine: 'American',
    mealType: 'Breakfast'
  },
  {
    id: 5,
    title: 'Chicken Tikka Masala',
    description: 'Tender chicken in a rich and creamy tomato-based curry sauce.',
    image: '/recipe-images/tikka-masala.jpg',
    difficulty: 'Intermediate',
    time: '1 hour',
    cuisine: 'Indian',
    mealType: 'Dinner'
  },
  {
    id: 6,
    title: 'Mediterranean Quinoa Salad',
    description: 'A refreshing salad with quinoa, cucumbers, tomatoes, feta, and olives.',
    image: '/recipe-images/quinoa-salad.jpg',
    difficulty: 'Easy',
    time: '25 minutes',
    cuisine: 'Mediterranean',
    mealType: 'Lunch'
  },
  {
    id: 7,
    title: 'Beef and Vegetable Stir Fry',
    description: 'A quick and healthy stir fry with tender beef strips and seasonal vegetables.',
    image: '/recipe-images/stir-fry.jpg',
    difficulty: 'Easy',
    time: '30 minutes',
    cuisine: 'Asian',
    mealType: 'Dinner'
  },
  {
    id: 8,
    title: 'Classic Apple Pie',
    description: 'A traditional pie with a flaky crust and spiced apple filling.',
    image: '/recipe-images/apple-pie.jpg',
    difficulty: 'Advanced',
    time: '2 hours',
    cuisine: 'American',
    mealType: 'Dessert'
  }
];

export async function GET(request: Request) {
  // Get search parameters from URL
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || '';
  const cuisine = searchParams.get('cuisine');
  const mealType = searchParams.get('mealType');
  const difficulty = searchParams.get('difficulty');
  
  // Filter recipes based on search parameters
  let results = [...mockRecipes];
  
  if (query) {
    const searchTerms = query.toLowerCase();
    results = results.filter(
      recipe => recipe.title.toLowerCase().includes(searchTerms) || 
                recipe.description.toLowerCase().includes(searchTerms)
    );
  }
  
  if (cuisine) {
    results = results.filter(recipe => recipe.cuisine === cuisine);
  }
  
  if (mealType) {
    results = results.filter(recipe => recipe.mealType === mealType);
  }
  
  if (difficulty) {
    results = results.filter(recipe => recipe.difficulty === difficulty);
  }
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return NextResponse.json({ recipes: results });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = body;
    
    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }
    
    // Filter recipes based on search query
    const searchTerms = query.toLowerCase();
    const results = mockRecipes.filter(
      recipe => recipe.title.toLowerCase().includes(searchTerms) || 
                recipe.description.toLowerCase().includes(searchTerms)
    );
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return NextResponse.json({ recipes: results });
  } catch (error) {
    console.error('Error in recipe search API:', error);
    
    let errorMessage = 'Unknown error';
    if (error && typeof error === 'object' && 'message' in error && 
        typeof error.message === 'string') {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: 'Failed to search recipes', details: errorMessage },
      { status: 500 }
    );
  }
} 