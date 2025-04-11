import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { loadTemplate, validateProps } from '@/components/canvas/lib';
import { z } from 'zod';

/**
 * API endpoint for generating a preview using a specific template
 * POST /api/canvas/template-preview
 * 
 * Request Body:
 * {
 *   "templateId": "scheduler_template",
 *   "prompt": "Make me a workout schedule for the week"
 * }
 */
export async function POST(request: Request) {
  console.log('=== TEMPLATE PREVIEW API CALLED ===');
  
  try {
    const body = await request.json();
    const { templateId, prompt } = body;
    
    if (!templateId || !prompt) {
      return NextResponse.json(
        { error: 'Missing templateId or prompt' }, 
        { status: 400 }
      );
    }
    
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }
    
    // Load template configuration
    const templateConfig = await loadTemplate(templateId);
    
    if (!templateConfig) {
      return NextResponse.json(
        { error: `Template not found: ${templateId}` }, 
        { status: 404 }
      );
    }
    
    // Generate props for the template using AI
    try {
      // Set up the prompt for generating props
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
      
      // Define a generic schema for the first pass
      const genericSchema = z.object({}).passthrough();
      
      // Generate the initial props
      const response = await generateObject({
        model: openai("gpt-4o"),
        prompt: generationPrompt,
        schema: genericSchema
      });
      
      // Get the object from the response
      const generatedProps = response.object;
      
      // Validate the generated props against the template's schema
      const validationResult = await validateProps(templateId, generatedProps);
      
      if (!validationResult.valid) {
        console.error('Validation failed:', validationResult.errors);
        
        // If validation fails, get a better error message
        let errorDetails = 'Invalid data format';
        
        if (validationResult.errors instanceof z.ZodError) {
          errorDetails = JSON.stringify(validationResult.errors.format(), null, 2);
        } else if (validationResult.errors instanceof Error) {
          errorDetails = validationResult.errors.message;
        }
        
        return NextResponse.json(
          { 
            error: 'Generated props failed validation',
            details: errorDetails 
          }, 
          { status: 400 }
        );
      }
      
      // Return the validated props
      return NextResponse.json({
        success: true,
        templateId,
        data: validationResult.data
      });
      
    } catch (error: any) {
      console.error('Error generating props:', error);
      return NextResponse.json(
        { error: `Failed to generate props: ${error.message}` }, 
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('Unexpected error in template preview API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 