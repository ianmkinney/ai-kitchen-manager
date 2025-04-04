import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Test API received:', body);
    
    // Simple response with no external API calls
    return NextResponse.json({
      response: "This is a test response. Here are three meal ideas:\n\n1. Pasta with tomato sauce\n2. Grilled chicken salad\n3. Vegetable stir-fry",
      received: body
    });
  } catch (error) {
    console.error('Error in test API:', error);
    return NextResponse.json(
      { error: 'Test API error' },
      { status: 500 }
    );
  }
} 