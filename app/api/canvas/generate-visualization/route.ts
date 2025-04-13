"use server";

import { NextResponse } from 'next/server';
import { generateCanvasVisualization, logSection } from './generateCanvas';

// Configure OpenAI - make sure environment variables are properly set
// Add detailed logging to debug environment variables
console.log('=== OPENAI API DEBUG INFO ===');
console.log('OPENAI_API_KEY set:', process.env.OPENAI_API_KEY ? 'YES' : 'NO');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('API route loaded at:', new Date().toISOString());

// If OPENAI_API_KEY isn't set, log a warning
if (!process.env.OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY environment variable is not set. Visualization generation may fail.');
}

export async function POST(request: Request) {
  logSection('API CALL', {
    timestamp: new Date().toISOString(),
    endpoint: 'generate-visualization'
  });
  
  try {
    const body = await request.json();
    logSection('REQUEST BODY', {
      canvasId: body.canvasId,
      promptPreview: body.prompt?.substring(0, 100) + (body.prompt?.length > 100 ? '...' : ''),
      messageCount: body.messages?.length || 0
    });
    
    const { canvasId, messages, prompt } = body;
    
    if (!canvasId || !prompt) {
      logSection('ERROR', 'Missing required fields (canvasId or prompt)');
      return NextResponse.json(
        { error: 'Missing required fields (canvasId or prompt)' }, 
        { status: 400 }
      );
    }

    try {
      // Call the abstracted business logic function
      const result = await generateCanvasVisualization(canvasId, messages, prompt);
      
      // Return the result from the abstracted function
      return NextResponse.json(result);
      
    } catch (processingError: any) {
      logSection('ERROR', 'Error in API route while processing visualization');
      
      // Return error response
      return NextResponse.json(
        { error: processingError.message || 'Error generating visualization' }, 
        { status: 500 }
      );
    }
  } catch (error: any) {
    logSection('ERROR', 'Unexpected error in generate-visualization API');
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
