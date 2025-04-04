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

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const response = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1000,
      system: "You are a helpful AI assistant focused on nutrition and cooking advice. Provide personalized meal suggestions and tips based on dietary preferences.",
      messages: [
        { role: 'user', content: message }
      ],
    });

    // The content is an array of content blocks
    // We need to extract the text content from each block
    let responseText = '';
    if (response.content && Array.isArray(response.content)) {
      responseText = response.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');
    }

    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error('Error communicating with Claude:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    );
  }
} 