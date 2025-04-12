"use server";

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

// Add this utility function near the top of the file after the imports
function logSection(title: string, content?: any) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`💡 ${title.toUpperCase()} 💡`);
  console.log(`${'='.repeat(80)}`);
  if (content !== undefined) {
    if (typeof content === 'object') {
      console.log(JSON.stringify(content, null, 2));
    } else {
      console.log(content);
    }
  }
  console.log(`${'-'.repeat(80)}\n`);
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

    // Verify user is authenticated
    logSection('AUTHENTICATION', 'Creating Supabase client for authentication check...');
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      logSection('AUTH ERROR', authError);
    }
    
    if (!user) {
      logSection('AUTH ERROR', 'User not authenticated');
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }
    
    logSection('USER AUTHENTICATED', {
      userId: user.id,
      email: user.email
    });
    
    try {
      // Format message history for context
      const messageHistory = messages && messages.length > 0
        ? messages.map((msg: CanvasMessage) => msg.content)
        : [];
      
      logSection('CONTEXT', {
        messageCount: messageHistory.length,
        currentPrompt: prompt
      });

      // Step 1: Try the template-based approach first
      try {
        logSection('TEMPLATE SELECTION', 'Starting template selection process...');
        
        // Select the most appropriate template based on the prompt
        const templateSelection = await selectTemplate(prompt, messageHistory);
        logSection('TEMPLATE SELECTED', {
          templateId: templateSelection.templateId,
          confidence: templateSelection.confidence,
          belowThreshold: templateSelection.belowThreshold,
          reasoning: templateSelection.reasoning
        });
        
        // If template selection confidence is above threshold, use the template
        if (!templateSelection.belowThreshold) {
          logSection('USING TEMPLATE', `Template ${templateSelection.templateId} with confidence ${templateSelection.confidence}`);
          
          // Load the template configuration
          const templateConfig = await loadTemplate(templateSelection.templateId);
          
          if (!templateConfig) {
            logSection('ERROR', `Failed to load template: ${templateSelection.templateId}`);
            throw new Error(`Failed to load template: ${templateSelection.templateId}`);
          }
          
          // Log detailed template information for debugging
          logSection('TEMPLATE CONFIG', {
            id: templateConfig.id,
            name: templateConfig.name,
            type: templateConfig.type,
            zod_schema: typeof templateConfig.zod_schema === 'string' 
              ? (templateConfig.zod_schema.length > 100 
                ? templateConfig.zod_schema.substring(0, 100) + '...' 
                : templateConfig.zod_schema)
              : 'Complex schema object',
            hasExampleProps: !!templateConfig.example_props,
            hasExamplePrompt: !!templateConfig.example_prompt
          });
          
          // Add a new log section for example props and prompt
          if (templateConfig.example_props || templateConfig.example_prompt) {
            logSection('TEMPLATE EXAMPLES', {
              example_props: templateConfig.example_props,
              example_prompt: templateConfig.example_prompt
            });
          }
          
          // Check if we already have props for this template in the database
          logSection('DATABASE CHECK', 'Checking for existing template data...');
          const { data: existingGenerations, error: fetchError } = await supabase
            .from("canvas_generations")
            .select("*")
            .eq("canvas_id", canvasId)
            .eq("template_id", templateSelection.templateId)
            .eq("type", "visualization")
            .order("created_at", { ascending: false })
            .limit(1);
          
          if (fetchError) {
            logSection('DATABASE ERROR', fetchError);
          }
          
          // If we have existing props, use those
          if (existingGenerations && existingGenerations.length > 0 && existingGenerations[0].component_data) {
            logSection('EXISTING PROPS', 'Found existing props in database');
            
            const existingData = existingGenerations[0].component_data;
            
            // Validate the existing props
            logSection('VALIDATING EXISTING PROPS', 'Starting validation of existing props...');
            const validationResult = await validateProps(templateSelection.templateId, existingData, true);
            
            if (validationResult.valid) {
              logSection('VALIDATION SUCCESS', 'Existing props are valid');
              
              // NEW: Check if this is an update request and modify the props accordingly
              if (prompt.toLowerCase().includes("update") || 
                  prompt.toLowerCase().includes("change") || 
                  prompt.toLowerCase().includes("modify") || 
                  prompt.toLowerCase().includes("add") ||
                  prompt.toLowerCase().includes("remove")) {
                
                logSection('UPDATE REQUEST', 'This appears to be an update request');
                
                try {
                  // Generate update instructions based on the prompt
                  const updatePrompt = `
                    You are an AI assistant that updates template data based on user requests.
                    
                    Template Type: ${templateConfig.name} (${templateConfig.id})
                    
                    Existing props: ${JSON.stringify(validationResult.data, null, 2)}
                    
                    User request: "${prompt}"
                    
                    Your task is to analyze the user's request and determine what specific changes should be made to the 
                    existing props. Return ONLY a JSON object containing the updates to apply, structured to match the 
                    relevant parts of the existing props that need changes.
                    
                    For a schedule, your response might look like:
                    {"activities": [{"index": 4, "changes": {"label": "Yoga", "time": "9:00 AM"}}]}
                    
                    For a chart, your response might look like:
                    {"data": {"datasets": [{"index": 0, "changes": {"data": [10, 20, 30, 40]}}]}}
                    
                    Only include fields that need to be changed. Be specific about array indexes.
                    
                    Response:
                  `;
                  
                  logSection('GENERATING UPDATE INSTRUCTIONS', 'Generating update instructions...');
                  const { text: updateInstructionsText } = await generateText({
                    model: openai("gpt-4o"),
                    prompt: updatePrompt,
                    maxTokens: 1000,
                    temperature: 0.2,
                  });
                  
                  // Extract JSON from the response
                  let updateInstructions;
                  try {
                    // First try to parse the whole text as JSON
                    updateInstructions = JSON.parse(updateInstructionsText);
                  } catch (jsonError) {
                    // If that fails, try to extract JSON from the text
                    const jsonMatch = updateInstructionsText.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                      try {
                        updateInstructions = JSON.parse(jsonMatch[0]);
                      } catch (extractError) {
                        logSection('ERROR', 'Failed to extract valid JSON from update instructions');
                        throw new Error('Failed to parse update instructions');
                      }
                    } else {
                      logSection('ERROR', 'No JSON object found in update instructions');
                      throw new Error('No valid update instructions found');
                    }
                  }
                  
                  logSection('UPDATE INSTRUCTIONS', {
                    instructions: updateInstructions
                  });
                  
                  // Apply the updates to the existing props
                  let updatedProps = JSON.parse(JSON.stringify(validationResult.data)); // Deep clone
                  
                  // Helper function to apply updates recursively
                  const applyUpdates = (target: any, updates: any) => {
                    // Handle array updates with indexes
                    if (Array.isArray(target) && Array.isArray(updates)) {
                      // Update contains specific array items to modify
                      updates.forEach(update => {
                        if (update.index !== undefined && update.changes) {
                          if (target[update.index]) {
                            // Update existing item
                            Object.assign(target[update.index], update.changes);
                          }
                        } else if (update.add) {
                          // Add new item to array
                          target.push(update.add);
                        }
                      });
                      return;
                    }
                    
                    // Handle object updates
                    if (updates && typeof updates === 'object') {
                      Object.keys(updates).forEach(key => {
                        // Skip 'index' and 'changes' at top level, which are special fields for array updates
                        if (key === 'index' || key === 'changes') return;
                        
                        if (target[key] === undefined) {
                          // Add new field
                          target[key] = updates[key];
                        } else if (typeof target[key] === 'object' && typeof updates[key] === 'object') {
                          // Recursively update nested objects/arrays
                          applyUpdates(target[key], updates[key]);
                        } else {
                          // Update simple field
                          target[key] = updates[key];
                        }
                      });
                    }
                  };
                  
                  // Apply the updates
                  applyUpdates(updatedProps, updateInstructions);
                  
                  logSection('UPDATED PROPS', {
                    props: updatedProps
                  });
                  
                  // Validate the updated props
                  const updatedValidation = await validateProps(templateSelection.templateId, updatedProps, true);
                  
                  if (updatedValidation.valid) {
                    logSection('VALIDATION SUCCESS', 'Updated props are valid');
                    validationResult.data = updatedValidation.data;
                    validationResult.transformed = updatedValidation.transformed || false;
                  } else {
                    logSection('VALIDATION FAILED', {
                      errors: updatedValidation.errors,
                      transformed: updatedValidation.transformed
                    });
                    // We'll continue with the original valid props
                  }
                } catch (updateError) {
                  logSection('ERROR', 'Error updating props');
                  // Continue with original props on error
                }
              }
              
              // Create a new generation using the existing props (possibly modified)
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
                    reusedProps: true,
                    propsUpdated: prompt.toLowerCase().includes("update") || 
                                prompt.toLowerCase().includes("change") || 
                                prompt.toLowerCase().includes("modify") || 
                                prompt.toLowerCase().includes("add") ||
                                prompt.toLowerCase().includes("remove"),
                    transformed: validationResult.transformed || false,
                  },
                })
                .select()
                .single();
                
              if (insertError) {
                logSection('ERROR', 'Error storing visualization');
                throw new Error('Failed to store visualization in database');
              }
              
              logSection('TEMPLATE VISUALIZATION', {
                id: generation.id,
                templateId: templateSelection.templateId,
                data: validationResult.data
              });
              
              // Return the component data for client-side rendering
              return NextResponse.json({ 
                success: true, 
                message: validationResult.data !== existingData
                  ? 'Template visualization updated based on request'
                  : 'Template visualization generated successfully (reused props)',
                templateId: templateSelection.templateId,
                data: validationResult.data,
                confidence: templateSelection.confidence,
                generation_id: generation.id,
                renderMethod: 'jsx'
              });
            } else {
              logSection('VALIDATION FAILED', 'Existing props are invalid');
            }
          } else {
            logSection('DATABASE CHECK', 'No existing props found in database');
          }
          
          // Define a generic schema for the first pass
          const genericSchema = z.object({}).passthrough();
          
          // Get schema structure based on template type
          let schemaGuide = '';
          if (templateConfig.type === 'chart_template' || templateConfig.zod_schema === 'ChartProps') {
            schemaGuide = `
              SCHEMA STRUCTURE:
              {
                "type": string, // One of: "bar", "line", "pie", "doughnut", "radar", "polarArea", "scatter", "bubble"
                "data": {
                  "labels": string[], // REQUIRED - Array of labels for the data points, e.g. ["Jan", "Feb", "Mar"]
                  "datasets": [ // REQUIRED - Array with at least one dataset
                    {
                      "label": string, // REQUIRED - Name of the dataset
                      "data": number[], // REQUIRED - Array of numerical values
                      "backgroundColor": string | string[], // Optional - Color(s) for the dataset
                      "borderColor": string | string[], // Optional - Border color(s)
                      "borderWidth": number, // Optional - Border width
                      "fill": boolean, // Optional - Whether to fill area under line
                      "tension": number // Optional - Line tension for curved lines
                    }
                  ]
                },
                "options": { // Optional configuration
                  "responsive": boolean, // Optional
                  "maintainAspectRatio": boolean, // Optional
                  "plugins": {
                    "title": {
                      "display": boolean,
                      "text": string
                    },
                    "legend": {
                      "display": boolean,
                      "position": string // "top", "left", "bottom", "right"
                    }
                  },
                  "scales": {
                    "x": {
                      "title": {
                        "display": boolean,
                        "text": string
                      }
                    },
                    "y": {
                      "title": {
                        "display": boolean,
                        "text": string
                      }
                    }
                  }
                },
                "width": number, // Optional
                "height": number, // Optional
                "theme": string // Optional - "light" or "dark"
              }
            `;
          } else if (templateConfig.type === 'scheduler_template' || templateConfig.zod_schema === 'SchedulerProps') {
            schemaGuide = `
              SCHEMA STRUCTURE:
              {
                "title": string, // REQUIRED - Title for the scheduler
                "activities": [ // REQUIRED - Array with at least one activity
                  {
                    "date": string, // REQUIRED - Day of the week or date
                    "label": string, // REQUIRED - Activity description
                    "time": string, // Optional - Time of the activity
                    "color": string // Optional - Color for this activity
                  }
                ],
                "colorTheme": string, // Optional - Theme color
                "showWeekends": boolean, // Optional - Whether to display weekends
                "layout": string // Optional - Layout style
              }
            `;
          } else if (templateConfig.type === 'timeline_template' || templateConfig.zod_schema === 'TimelineProps') {
            schemaGuide = `
              SCHEMA STRUCTURE:
              {
                "events": [ // REQUIRED - Array with at least one event
                  {
                    "date": string, // REQUIRED - Date of the event (format: YYYY-MM-DD)
                    "title": string, // REQUIRED - Event title
                    "description": string, // REQUIRED - Event description
                    "category": string, // Optional - Category for grouping
                    "icon": string, // Optional - Icon name
                    "color": string // Optional - Color for this event
                  }
                ],
                "options": { // Optional configuration
                  "timelineTitle": string, // Optional - Title for the timeline
                  "orientation": string, // Optional - "horizontal" or "vertical"
                  "showLabels": boolean, // Optional - Whether to show labels
                  "groupByCategory": boolean // Optional - Group events by category
                },
                "categories": [ // Optional - List of categories
                  {
                    "id": string,
                    "name": string,
                    "color": string
                  }
                ]
              }
            `;
          }
          
          // Generate props based on the template and user prompt
          logSection('GENERATING PROPS', {
            templateId: templateSelection.templateId,
            templateName: templateConfig.name,
            promptPreview: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '')
          });
          
          const generationPrompt = `
            You are an AI assistant that generates data for visualizations based on user requests.
            
            User request: "${prompt}"
            
            Template: ${templateConfig.name} (${templateConfig.id})
            Description: ${templateConfig.description}
            
            ${schemaGuide}
            
            ${templateConfig.example_prompt ? `Example prompt: "${templateConfig.example_prompt}"` : ''}
            ${templateConfig.example_props ? `Example props: ${JSON.stringify(templateConfig.example_props, null, 2)}` : ''}
            
            IMPORTANT GUIDELINES:
            1. Follow the schema structure exactly
            2. Include ALL required fields (marked as REQUIRED in the schema)
            3. Use the correct data types (string, number, boolean, array)
            4. For arrays, always include at least one item
            5. Match the data to the user's request as closely as possible
            6. Ensure all data is realistic and makes sense in context
            7. Do not include any fields not mentioned in the schema
            
            Generate the appropriate props object for this template based on the user's request.
          `;
          
          // Generate props using the appropriate model
          const propsResponse = await generateObject({
            model: openai("gpt-4o"),
            prompt: generationPrompt,
            schema: genericSchema
          });
          
          const generatedProps = propsResponse.object;
          
          logSection('GENERATED PROPS', generatedProps);
          
          // Validate the generated props against the template's schema
          logSection('VALIDATING GENERATED PROPS', 'Starting validation of generated props...');
          try {
            console.log("=======");
            console.log("=======");
            console.log("=======");
            console.log("=======");
            console.log("=======");
            const validationResult = await validateProps(templateSelection.templateId, generatedProps);
            
            if (!validationResult.valid) {
              logSection('VALIDATION FAILED', {
                templateId: templateSelection.templateId,
                templateType: templateConfig.type,
                schemaType: templateConfig.zod_schema,
                errorCount: validationResult.errors && 'errors' in validationResult.errors 
                  ? validationResult.errors.errors.length 
                  : 1,
                errorMessage: validationResult.errors?.message || 'Unknown validation error'
              });
              
              // Add structured error details
              logSection('VALIDATION ERROR DETAILS', {
                invalidProps: generatedProps,
                detailedErrors: validationResult.detailedErrors,
                // Add schema hint for what was expected vs what was received
                schemaHint: templateConfig.example_props ? 
                  'Expected format similar to example props in template definition' : 
                  'Check template zod_schema for expected format'
              });
              
              // Log the props that failed validation
              logSection('INVALID PROPS', generatedProps);
              
              if (validationResult.detailedErrors) {
                logSection('DETAILED ERRORS', validationResult.detailedErrors);
              }
              
              throw new Error('Generated props failed validation');
            }
            
            // Also add enhanced validation success logging
            logSection('VALIDATION SUCCESS', {
              templateId: templateSelection.templateId,
              transformed: validationResult.transformed || false,
              propsMatchExpectedFormat: true
            });
            
            if (validationResult.transformed) {
              logSection('PROPS TRANSFORMATION', {
                reason: 'Props were transformed during validation to fix issues',
                transformedProps: validationResult.data
              });
            }
            
            // Store the template-based visualization in the database
            logSection('STORING TEMPLATE VISUALIZATION', 'Storing template-based visualization...');
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
                  transformed: validationResult.transformed || false,
                },
              })
              .select()
              .single();

            if (insertError) {
              logSection('ERROR', 'Error storing visualization');
              throw new Error('Failed to store visualization in database');
            }

            logSection('TEMPLATE VISUALIZATION', {
              id: generation.id,
              templateId: templateSelection.templateId,
              data: validationResult.data
            });
            
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
            logSection('ERROR', 'Error in validation');
            logSection('ATTEMPTING SECOND GENERATION', 'Attempting to generate a second time with more direct guidance...');
            
            // Try one more time with more explicit schema guidance
            try {
              // Create a more direct prompt based on the validation errors
              const fallbackPrompt = `
                You are an AI assistant that generates data for visualizations based on user requests.
                
                User request: "${prompt}"
                
                Template: ${templateConfig.name} (${templateConfig.id})
                
                Previous attempt failed validation. Please create a VERY SIMPLE version with minimal data
                that strictly follows the schema structure. Focus only on including the required fields
                with basic sample data that matches the types.
                
                ${schemaGuide}
                
                CRITICAL INSTRUCTIONS:
                1. Generate the absolute simplest valid data structure
                2. Include ONLY the required fields
                3. Use basic sample data that matches the correct types
                4. For arrays, include exactly one item unless more are required
                5. Do not add any extra fields or complex structures
              `;
              
              // Generate simplified props as fallback
              const fallbackResponse = await generateObject({
                model: openai("gpt-4o"),
                prompt: fallbackPrompt,
                schema: genericSchema
              });
              
              const fallbackProps = fallbackResponse.object;
              logSection('FALLBACK PROPS', fallbackProps);
              
              // Validate the fallback props
              const fallbackValidation = await validateProps(templateSelection.templateId, fallbackProps);
              
              if (fallbackValidation.valid) {
                logSection('VALIDATION SUCCESS', 'Fallback props validation successful!');
                
                // Store the template-based visualization with fallback props
                const { data: fallbackGeneration, error: fallbackInsertError } = await supabase
                  .from("canvas_generations")
                  .insert({
                    canvas_id: canvasId,
                    template_id: templateSelection.templateId,
                    component_data: fallbackValidation.data,
                    render_method: 'jsx',
                    confidence: templateSelection.confidence * 0.8, // Reduce confidence for fallback
                    summary: `${templateConfig.name} visualization (fallback) based on: ${prompt.substring(0, 50)}...`,
                    created_by: user.id,
                    type: "visualization",
                    metadata: {
                      reasoning: templateSelection.reasoning,
                      messageCount: messages?.length || 0,
                      promptLength: prompt?.length || 0,
                      fallbackGeneration: true,
                      transformed: fallbackValidation.transformed || false
                    },
                  })
                  .select()
                  .single();
    
                if (!fallbackInsertError) {
                  logSection('FALLBACK TEMPLATE VISUALIZATION', {
                    id: fallbackGeneration.id,
                    data: fallbackValidation.data
                  });
                  
                  return NextResponse.json({ 
                    success: true, 
                    message: 'Template visualization generated with fallback approach',
                    templateId: templateSelection.templateId,
                    data: fallbackValidation.data,
                    confidence: templateSelection.confidence * 0.8,
                    generation_id: fallbackGeneration.id,
                    renderMethod: 'jsx',
                    fallback: true
                  });
                }
              }
            } catch (fallbackError) {
              logSection('ERROR', 'Fallback approach also failed');
            }
            
            // If we get here, both approaches failed - throw the original error
            throw validationError;
          }
        } else {
          logSection('TEMPLATE CONFIDENCE', `Template confidence below threshold (${templateSelection.confidence})`);
        }
      } catch (templateError) {
        logSection('ERROR', 'Error in template-based approach');
        logSection('FALLING BACK', 'Falling back to direct HTML generation...');
      }
      
      // Step 2: Fallback to direct HTML generation if template approach fails
      logSection('DIRECT HTML GENERATION', 'Generating direct HTML visualization...');
      
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
      
      logSection('HTML GENERATION', {
        duration: (endTime - startTime)/1000,
        length: htmlContent.length
      });

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
        logSection('ERROR', 'Error storing HTML visualization');
        return NextResponse.json(
          { error: 'Failed to store visualization' }, 
          { status: 500 }
        );
      }

      logSection('HTML VISUALIZATION', {
        id: generation.id,
        length: htmlContent.length
      });

      // Return the HTML content for iframe rendering
      return NextResponse.json({ 
        success: true, 
        message: 'HTML visualization generated successfully',
        html: htmlContent,
        generation_id: generation.id,
        renderMethod: 'fallback_iframe'
      });
      
    } catch (processingError: any) {
      logSection('ERROR', 'Error processing visualization request');
      
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
    logSection('ERROR', 'Unexpected error in generate-visualization API');
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}