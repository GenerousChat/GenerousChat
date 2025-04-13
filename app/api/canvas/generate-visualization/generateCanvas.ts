"use server";

const { createClient } = require("@supabase/supabase-js");
import { generateText, generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { selectTemplate, loadTemplate, validateProps, logTemplateInfo } from '../../../../components/canvas/lib';
import { z } from 'zod';

// Define the CanvasMessage type for TypeScript
export interface CanvasMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

// Utility function for logging sections
export function logSection(title: string, content?: any) {
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

// Helper function to apply updates recursively
export function applyUpdates(target: any, updates: any) {
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    return updates;
  }
  
  const result = { ...target };
  
  for (const key in updates) {
    if (updates[key] === null) {
      delete result[key];
    } else if (
      typeof updates[key] === 'object' && 
      !Array.isArray(updates[key]) && 
      typeof result[key] === 'object' && 
      !Array.isArray(result[key])
    ) {
      result[key] = applyUpdates(result[key], updates[key]);
    } else {
      result[key] = updates[key];
    }
  }
  
  return result;
}

// Main function to generate canvas visualization
export async function generateCanvasVisualization(canvasId: string, messages: CanvasMessage[], prompt: string) {
  if (!canvasId || !prompt) {
    logSection('ERROR', 'Missing required fields (canvasId or prompt)');
    throw new Error('Missing required fields (canvasId or prompt)');
  }

  // Verify user is authenticated
  logSection('AUTHENTICATION', 'Creating Supabase client for authentication check...');
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError) {
    logSection('AUTH ERROR', authError);
    throw new Error('Authentication error');
  }
  
  if (!user) {
    logSection('AUTH ERROR', 'User not authenticated');
    throw new Error('Unauthorized');
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
        const template = await loadTemplate(templateSelection.templateId);
        logTemplateInfo(template);
        
        // Extract properties from the prompt using AI
        logSection('EXTRACTING PROPERTIES', 'Using AI to extract properties from prompt...');
        
        const extractionSystemPrompt = `
You are a helpful assistant that extracts structured data from user prompts.
You need to extract properties for a visualization template with the following schema:

${template.schema}

IMPORTANT INSTRUCTIONS:
1. Extract ONLY the properties defined in the schema above
2. Use reasonable defaults for missing properties
3. Return valid JSON that matches the schema
4. Be creative but reasonable with visualization data
5. For color properties, prefer hex codes (#RRGGBB format)
6. For numerical properties, use appropriate ranges
7. For text properties, keep them concise and relevant
`;

        // Extract properties using AI
        const extractedProps = await generateObject({
          model: openai('gpt-4o'),
          schema: z.any(),
          system: extractionSystemPrompt,
          messages: [
            { role: 'user', content: `Extract properties from this prompt: "${prompt}"` }
          ]
        });
        
        logSection('EXTRACTED PROPERTIES', extractedProps);
        
        // Validate the extracted properties against the template schema
        const { isValid, validatedProps, errors } = validateProps(extractedProps, template.schema);
        
        if (!isValid) {
          logSection('VALIDATION ERRORS', errors);
          throw new Error(`Template property validation failed: ${errors.join(', ')}`);
        }
        
        logSection('VALIDATED PROPERTIES', validatedProps);
        
        // Generate the HTML content using the template
        logSection('GENERATING HTML', 'Using template to generate HTML...');
        
        // Prepare the template data
        const templateData = {
          props: validatedProps,
          metadata: {
            templateId: template.id,
            confidence: templateSelection.confidence,
            prompt: prompt,
            userId: user.id
          }
        };
        
        // Generate HTML using the template
        let htmlContent = template.generateHtml(templateData);
        
        logSection('TEMPLATE HTML GENERATED', {
          length: htmlContent.length,
          templateId: template.id
        });
        
        // Store the generated visualization in the database
        const { data: generation, error: insertError } = await supabase
          .from("canvas_generations")
          .insert({
            canvas_id: canvasId,
            html: htmlContent,
            render_method: 'template',
            summary: `${template.name}: ${prompt.substring(0, 50)}...`,
            created_by: user.id,
            type: template.type || "visualization",
            metadata: {
              template_id: template.id,
              template_confidence: templateSelection.confidence,
              properties: validatedProps
            },
          })
          .select()
          .single();
        
        if (insertError) {
          logSection('DATABASE ERRORb', insertError);
          throw new Error('Failed to store visualization');
        }
        
        logSection('TEMPLATE VISUALIZATION STORED', {
          id: generation.id,
          canvasId: canvasId,
          templateId: template.id
        });
        
        // Return the HTML content and generation details
        return { 
          success: true, 
          message: 'Template-based visualization generated successfully',
          html: htmlContent,
          generation_id: generation.id,
          renderMethod: 'template'
        };
      }
    } catch (templateError: any) {
      // Log template approach error but continue to fallback
      logSection('TEMPLATE ERROR', {
        message: templateError.message,
        stack: templateError.stack
      });
      logSection('FALLBACK', 'Template approach failed, falling back to direct HTML generation');
    }
    
    // Step 2: Fallback to direct HTML generation
    logSection('DIRECT HTML GENERATION', 'Starting direct HTML generation...');
    
    // Generate HTML directly using AI
    const systemPrompt = `
You are an expert data visualization creator that generates HTML visualizations.

REQUIREMENTS:
1. Create a SINGLE, SELF-CONTAINED HTML file with all CSS and JavaScript inline
2. Use only vanilla JavaScript (no external libraries)
3. Make visualizations interactive and responsive
4. Use modern CSS and semantic HTML
5. Support both light and dark mode with @media (prefers-color-scheme: dark)
6. Ensure the visualization is accessible (proper ARIA attributes, color contrast)
7. Use inline SVG for vector graphics when appropriate
8. Keep the code clean and well-commented
9. Optimize for performance (avoid unnecessary calculations)
10. Handle edge cases gracefully

Your HTML must be valid and complete, starting with <!DOCTYPE html> and ending with </html>.
`;

    const htmlContent = await generateText({
      model: openai('gpt-4o'),
      system: systemPrompt,
      messages: [
        { role: 'user', content: `Create a visualization for: ${prompt}` }
      ]
    });
    
    // Store the generated HTML in the database
    const { data: generation, error: insertError } = await supabase
      .from("canvas_generations")
      .insert({
        canvas_id: canvasId,
        html: htmlContent,
        render_method: 'fallback_iframe',
        summary: `Visualization for: ${prompt.substring(0, 50)}...`,
        created_by: user.id,
        type: "visualization",
        metadata: {
          fallback: true
        },
      })
      .select()
      .single();
    
    if (insertError) {
      logSection('DATABASE ERRORa', insertError);
      throw new Error('Failed to store visualization');
    }

    logSection('HTML VISUALIZATION', {
      id: generation.id,
      length: htmlContent.length
    });

    // Return the HTML content for iframe rendering
    return { 
      success: true, 
      message: 'HTML visualization generated successfully',
      html: htmlContent,
      generation_id: generation.id,
      renderMethod: 'fallback_iframe'
    };
    
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: errorGeneration } = await supabase
      .from("canvas_generations")
      .insert({
        canvas_id: canvasId,
        html: errorHtml,
        render_method: 'fallback_iframe',
        summary: `Error visualization for: ${prompt.substring(0, 50)}...`,
        created_by: user?.id,
        type: "error",
        metadata: {
          error: processingError.message,
          fallback: true
        },
      })
      .select()
      .single();
    
    // Return the error HTML
    return { 
      success: false, 
      message: 'Error generating visualization',
      html: errorHtml,
      error: processingError.message,
      generation_id: errorGeneration?.id,
      renderMethod: 'fallback_iframe'
    };
  }
}
