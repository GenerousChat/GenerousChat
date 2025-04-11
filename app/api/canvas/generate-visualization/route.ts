import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateText, generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { selectTemplate, loadTemplate, validateProps, TemplateSelectionResult, logTemplateInfo } from '@/components/canvas/lib';
import { z } from 'zod';

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

// Define the CanvasMessage type for TypeScript
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
    console.log('Request body keys:', Object.keys(body).join(', '));
    
    const { canvasId, messages, prompt } = body;
    
    if (!canvasId || !prompt) {
      console.error('Missing required fields in request');
      return NextResponse.json(
        { error: 'Missing required fields (canvasId or prompt)' }, 
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
      // Format message history for context
      const messageHistory = messages && messages.length > 0
        ? messages.map((msg: CanvasMessage) => msg.content)
        : [];
      
      console.log('Message count:', messageHistory.length);
      console.log('Current prompt:', prompt);

      // Step 1: Try the template-based approach first
      try {
        console.log('Attempting template-based visualization...');
        
        // Select the most appropriate template based on the prompt
        const templateSelection = await selectTemplate(prompt, messageHistory);
        console.log('Template selection result:', JSON.stringify(templateSelection, null, 2));
        
        // If template selection confidence is above threshold, use the template
        if (!templateSelection.belowThreshold) {
          console.log(`Using template ${templateSelection.templateId} with confidence ${templateSelection.confidence}`);
          
          // Load the template configuration
          const templateConfig = await loadTemplate(templateSelection.templateId);
          
          if (!templateConfig) {
            throw new Error(`Failed to load template: ${templateSelection.templateId}`);
          }
          
          // Log detailed template information for debugging
          logTemplateInfo('API', templateConfig);
          
          // Define a generic schema for the first pass
          const genericSchema = z.object({}).passthrough();
          
          // Generate props based on the template and user prompt
          console.log('Generating props for template...');
          const generationPrompt = `
            You are an AI assistant that generates data for visualizations based on user requests.
            
            User request: "${prompt}"
            
            Template: ${templateConfig.name} (${templateConfig.id})
            Description: ${templateConfig.description}
            
            ${templateConfig.example_prompt ? `Example prompt: "${templateConfig.example_prompt}"` : ''}
            ${templateConfig.example_props ? `Example props: ${JSON.stringify(templateConfig.example_props, null, 2)}` : ''}
            
            Generate the appropriate props object for this template based on the user's request.
            The props must match the required schema for this template type.
            Ensure all required fields are included and properly formatted.
          `;
          
          // Generate props using the appropriate model
          const propsResponse = await generateObject({
            model: openai("gpt-4o"),
            prompt: generationPrompt,
            schema: genericSchema
          });
          
          const generatedProps = propsResponse.object;
          
          // Validate the generated props against the template's schema
          console.log('Validating generated props...');
          try {
            const validationResult = await validateProps(templateSelection.templateId, generatedProps);
            
            if (!validationResult.valid) {
              console.error('Validation failed:', validationResult.errors);
              
              // Log the props that failed validation
              console.error('Props that failed validation:', JSON.stringify(generatedProps, null, 2));
              
              throw new Error('Generated props failed validation');
            }
            
            // Store the template-based visualization in the database
            console.log('Storing template-based visualization...');
            const { data: generation, error: insertError } = await supabase
              .from("canvas_generations")
              .insert({
                canvas_id: canvasId,
                template_id: templateSelection.templateId,
                component_data: validationResult.data,
                render_method: 'jsx',
                confidence: templateSelection.confidence,
                summary: `${templateConfig.name} visualization based on: ${prompt.substring(0, 50)}...`,
                created_by: user.id,
                type: "visualization",
                metadata: {
                  reasoning: templateSelection.reasoning,
                  messageCount: messages?.length || 0,
                  promptLength: prompt?.length || 0,
                },
              })
              .select()
              .single();

            if (insertError) {
              console.error('Error storing visualization:', insertError);
              throw new Error('Failed to store visualization in database');
            }

            console.log('Template visualization stored successfully, ID:', generation.id);
            
            // Return the component data for client-side rendering
            return NextResponse.json({ 
              success: true, 
              message: 'Template visualization generated successfully',
              templateId: templateSelection.templateId,
              data: validationResult.data,
              confidence: templateSelection.confidence,
              generation_id: generation.id,
              renderMethod: 'jsx'
            });
          } catch (validationError) {
            console.error('Error in validation:', validationError);
            throw validationError;
          }
        } else {
          console.log(`Template confidence below threshold (${templateSelection.confidence}), falling back to HTML generation`);
        }
      } catch (templateError) {
        console.error('Error in template-based approach:', templateError);
        console.log('Falling back to direct HTML generation...');
      }
      
      // Step 2: Fallback to direct HTML generation if template approach fails
      console.log('Generating direct HTML visualization...');
      
      // Create a prompt for generating HTML content
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
${messageHistory.join('\n')}

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

      // Generate HTML content using OpenAI
      const startTime = Date.now();
      const { text: htmlContent } = await generateText({
        model: openai("gpt-4o"),
        prompt: htmlPrompt,
        maxTokens: 4000,
        temperature: 0.7,
      });
      const endTime = Date.now();
      
      console.log(`HTML generation completed in ${(endTime - startTime)/1000} seconds`);
      console.log(`Generated HTML length: ${htmlContent.length} characters`);

      // Store the HTML visualization in the database
      const { data: generation, error: insertError } = await supabase
        .from("canvas_generations")
        .insert({
          canvas_id: canvasId,
          html: htmlContent,
          render_method: 'fallback_iframe',
          summary: `Direct HTML visualization based on: ${prompt.substring(0, 50)}...`,
          created_by: user.id,
          type: "visualization",
          metadata: {
            messageCount: messages?.length || 0,
            promptLength: prompt?.length || 0,
            generationTime: (endTime - startTime)/1000,
            fallback: true
          },
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error storing HTML visualization:', insertError);
        return NextResponse.json(
          { error: 'Failed to store visualization' }, 
          { status: 500 }
        );
      }

      console.log('HTML visualization stored successfully, ID:', generation.id);

      // Return the HTML content for iframe rendering
      return NextResponse.json({ 
        success: true, 
        message: 'HTML visualization generated successfully',
        html: htmlContent,
        generation_id: generation.id,
        renderMethod: 'fallback_iframe'
      });
      
    } catch (processingError: any) {
      console.error('Error processing visualization request:', processingError);
      
      // Generate a basic error visualization
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: system-ui, sans-serif;
              background-color: #fff;
              color: #1f2937;
              padding: 2rem;
              margin: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .error-container {
              max-width: 500px;
              background-color: #fee2e2;
              border: 1px solid #fecaca;
              border-left: 4px solid #ef4444;
              border-radius: 0.5rem;
              padding: 1.5rem;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }
            h2 {
              margin-top: 0;
              color: #b91c1c;
              font-size: 1.25rem;
            }
            p {
              margin-bottom: 0.5rem;
            }
            .error-details {
              margin-top: 1rem;
              padding: 0.75rem;
              background-color: rgba(0, 0, 0, 0.05);
              border-radius: 0.25rem;
              font-family: monospace;
              font-size: 0.875rem;
              overflow-wrap: break-word;
            }
            @media (prefers-color-scheme: dark) {
              body {
                background-color: #1f2937;
                color: #f9fafb;
              }
              .error-container {
                background-color: rgba(239, 68, 68, 0.1);
                border-color: rgba(239, 68, 68, 0.2);
              }
              .error-details {
                background-color: rgba(0, 0, 0, 0.2);
              }
            }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h2>Visualization Error</h2>
            <p>Sorry, we couldn't generate the visualization you requested.</p>
            <div class="error-details">
              ${processingError.message || 'Unknown error occurred'}
            </div>
            <p style="margin-top: 1rem;">Please try again with a different request.</p>
          </div>
        </body>
        </html>
      `;
      
      // Store the error visualization
      const { data: errorGeneration } = await supabase
        .from("canvas_generations")
        .insert({
          canvas_id: canvasId,
          html: errorHtml,
          render_method: 'fallback_iframe',
          summary: `Error visualization for: ${prompt.substring(0, 50)}...`,
          created_by: user.id,
          type: "error",
          metadata: {
            error: processingError.message,
            fallback: true
          },
        })
        .select()
        .single();
      
      // Return the error HTML
      return NextResponse.json({ 
        success: false, 
        message: 'Error generating visualization',
        html: errorHtml,
        error: processingError.message,
        generation_id: errorGeneration?.id,
        renderMethod: 'fallback_iframe'
      });
    }
  } catch (error: any) {
    console.error('Unexpected error in generate-visualization API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}