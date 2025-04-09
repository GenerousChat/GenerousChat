import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

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

// Define the CanvasMessage type to fix the TypeScript error
interface CanvasMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export async function POST(request: Request) {
  console.log('=== GENERATE VISUALIZATION API CALLED ===');
  console.log('Request received at:', new Date().toISOString());
  
  try {
    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    const { canvasId, messages, prompt } = body;
    
    if (!canvasId) {
      console.error('Missing canvasId in request');
      return NextResponse.json(
        { error: 'Missing canvasId' }, 
        { status: 400 }
      );
    }

    // Verify user is authenticated
    console.log('Creating Supabase client for authentication check...');
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Authentication error:', authError);
    }
    
    if (!user) {
      console.error('User not authenticated');
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }
    
    console.log('User authenticated successfully:', user.id);
    
    try {
      // Format the messages for the AI prompt with proper type annotation
      console.log('Formatting message history...');
      const messageHistory = messages && messages.length > 0
        ? messages.map((msg: CanvasMessage) => `${msg.user_id === user.id ? 'User' : 'Assistant'}: ${msg.content}`).join('\n')
        : 'No previous messages';
      
      console.log('Message count:', messages?.length || 0);
      console.log('Current prompt:', prompt);

      // Create a prompt for generating HTML content that responds to conversation intent
      const htmlPrompt = `# Conversation-Driven UI Generation

## PRIORITY: Focus on BUILD/CREATE/GENERATE Requests
Analyze the conversation for the most recent message that explicitly asks for something to be built, created, generated, or visualized. Ignore casual conversation or messages that don't request creation of something. Look for phrases like "build", "create", "generate", "make", "show me", "visualize", etc.

## Context Analysis Guidelines:
- Find the most recent message containing an EXPLICIT request to build/create something
- Look for clear directives like "build X", "create Y", "generate Z", "make a...", "show me..."
- Skip over casual messages, questions, or discussion that don't request creation
- Once found, implement exactly what that message requested
- Use conversation history only as supporting context for implementing the request

## Technology Selection - Match the right tool to the request and load required libraries:

- Data/statistics → Use D3.js or Chart.js (but only if actual data is present)
- Timelines/processes → Use TimelineJS or custom animations
- 3D objects/spaces → Use Three.js (only when truly beneficial)
- Creative explanations → Use SVG/Canvas/p5.js for illustrations
- Interactive tools → Use appropriate JS framework for the specific tool
- Math concepts → use MathJax or KaTeX for math, or custom SVG
- Games/simulations → Use Phaser or p5.js, 
- Maps/locations → Use Leaflet.js or Mapbox GL JS
- Physics simulations → Use Matter.js
- Simple animations → Use CSS animations or GSAP
- Scientific visualizations → Use Plotly.js or Vega-Lite
- Youtube videos → Use lite YouTube embed
- Simple text/concepts → Use elegant typography 

IMPORTANT: Use complex libraries when simpler approaches are less visually appealing. Choose technology based on conversation needs, and always prioritize user experience and aesthetics.

## Conversation:
${messageHistory}

## Latest Prompt:
${prompt}

## Your Creation Requirements:
1. Ensure responsive design that works well in the sidebar panel
2. Create a visualization that directly fulfills the most recent build/create request
3. DO NOT INCLUDE markdown code comment blocks in the output as it will be rendered directly
4. Optimize performance (lazy load libraries, efficient code) 
5. Balance aesthetics with functionality - beautiful but purposeful
6. Use libraries and technologies that fit the conversation needs
7. Add thoughtful interactivity that improves understanding
8. Provide clear visual cues for how to interact with your creation
9. Include helpful annotations where appropriate
10. Handle edge cases gracefully with fallbacks

## Implementation Details:
- You may use external libraries from trusted CDNs (cdnjs, unpkg, jsdelivr)
- The visualization must work immediately without setup steps
- Use appropriate semantic HTML and accessibility features
- Include fallback content if libraries fail to load
- Create smooth loading experience with transitions
- Make appropriate use of viewport dimensions

MAKE SURE YOUR SOLUTION INVOLVES EVERYTHING, DON'T WORRY ABOUT HOW BIG THE FILE IS

IF YOU LOAD JAVASCRIPT OR CSS FROM A CDN, NEVER USE THE INTEGRITY ATTRIBUTE, KEEP THE SCRIPT OR LINK TAG AS SIMPLE AS POSSIBLE, JUST LOAD THE ASSET

## RETURN FORMAT: VALID HTML WITH NO COMMENTARY OR MARKDOWN - JUST RAW HTML/CSS/JS DOCUMENT

Create something that directly fulfills the most recent build/create request and makes users say "This is exactly what I asked for!"`;

      console.log('Calling OpenAI for HTML generation...');
      console.log('Using model: gpt-4o');
      
      try {
        // Generate HTML content using OpenAI via AI SDK
        const startTime = Date.now();
        const { text: htmlContent } = await generateText({
          model: openai.responses("o3-mini"),
          prompt: htmlPrompt,
          maxTokens: 4000, // Adjust based on your needs
          temperature: 0.7, // Adjust for creativity vs determinism
        });
        const endTime = Date.now();
        
        console.log(`OpenAI API call completed in ${(endTime - startTime)/1000} seconds`);
        console.log(`Generated HTML length: ${htmlContent.length} characters`);

        // Store the visualization in the database
        console.log('Storing visualization in Supabase...');
        const { data: generation, error: insertError } = await supabase
          .from("canvas_generations")
          .insert({
            canvas_id: canvasId,
            html: htmlContent,
            summary: `Visualization based on: ${prompt.substring(0, 100)}...`,
            created_by: user.id,
            type: "visualization",
            metadata: {
              messageCount: messages?.length || 0,
              promptLength: prompt?.length || 0,
              generationTime: (endTime - startTime)/1000,
            },
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error storing visualization:', insertError);
          return NextResponse.json(
            { error: 'Failed to store visualization' }, 
            { status: 500 }
          );
        }

        console.log('Visualization stored successfully, ID:', generation.id);

        // Return the HTML directly in the response
        console.log('Sending successful response with HTML content');
        return NextResponse.json({ 
          success: true, 
          message: 'Visualization generated successfully',
          html: htmlContent,
          generation_id: generation.id
        });
      } catch (openaiError: any) {
        console.error('OpenAI API error:', openaiError);
        console.error('Error details:', openaiError.message);
        
        if (openaiError.response) {
          console.error('OpenAI API response status:', openaiError.response.status);
          console.error('OpenAI API response data:', openaiError.response.data);
        }
        
        throw openaiError;
      }
    } catch (error: any) {
      console.error('Error generating visualization:', error);
      
      // Create a simple fallback visualization if AI generation fails
      console.log('Generating fallback visualization...');
      const fallbackHtml = generateFallbackVisualization(prompt, messages?.length || 0);
      
      // Store the fallback visualization
      try {
        console.log('Storing fallback visualization...');
        const { data: fallbackGeneration, error: fallbackError } = await supabase
          .from("canvas_generations")
          .insert({
            canvas_id: canvasId,
            html: fallbackHtml,
            summary: "Fallback visualization (AI generation failed)",
            created_by: user.id,
            type: "visualization",
            metadata: {
              fallback: true,
              error: error.message || "Unknown error",
              messageCount: messages?.length || 0,
            },
          })
          .select()
          .single();
          
        if (fallbackError) {
          console.error('Error storing fallback visualization:', fallbackError);
        } else {
          console.log('Fallback visualization stored, ID:', fallbackGeneration.id);
        }
        
        // Return the fallback HTML
        console.log('Sending fallback visualization response');
        return NextResponse.json({ 
          success: true, 
          message: 'Fallback visualization generated',
          html: fallbackHtml,
          fallback: true,
          error: error.message || "AI generation failed",
          generation_id: fallbackGeneration?.id
        });
      } catch (fallbackError) {
        console.error('Error with fallback visualization:', fallbackError);
        return NextResponse.json(
          { error: 'Visualization generation failed completely' }, 
          { status: 500 }
        );
      }
    }
  } catch (error: any) {
    console.error('Error in canvas-visualization API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// Function to generate a simple fallback visualization
function generateFallbackVisualization(prompt: string, messageCount: number) {
  console.log('Generating fallback visualization for prompt:', prompt);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #334155;
        }
        .container {
          max-width: 100%;
          background: white;
          padding: 30px;
          border-radius: 15px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          text-align: center;
          animation: fadeIn 0.6s ease-out;
        }
        h2 {
          margin-top: 0;
          color: #3b82f6;
          font-size: 1.8rem;
        }
        p {
          line-height: 1.6;
          margin: 20px 0;
          font-size: 1.1rem;
          color: #4b5563;
        }
        .icon {
          font-size: 4rem;
          margin-bottom: 20px;
          color: #3b82f6;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .prompt {
          background: rgba(59, 130, 246, 0.1);
          padding: 15px;
          border-radius: 10px;
          font-style: italic;
          margin-top: 30px;
          font-size: 1rem;
          color: #6b7280;
        }
        .button {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          margin-top: 20px;
          transition: all 0.2s;
        }
        .button:hover {
          background: #2563eb;
          transform: translateY(-2px);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">✨</div>
        <h2>Visualization</h2>
        <p>Sorry, I couldn't generate a custom visualization based on your request. Here's a simple fallback instead.</p>
        <p>Messages in conversation: ${messageCount}</p>
        <div class="prompt">"${prompt}"</div>
        <button class="button" onclick="window.parent.postMessage('close-visualization', '*')">Close</button>
      </div>
    </body>
    </html>
  `;
}