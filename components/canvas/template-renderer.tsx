"use server";

import React from 'react';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { loadTemplate, selectTemplate, validateProps } from './lib';
import TemplateLoader from './template-loader';
import fs from 'fs/promises';
import path from 'path';

interface TemplateRendererProps {
  prompt: string;
  conversation: string[];
}

/**
 * Load generic fallback HTML for all error cases
 */
async function loadGenericFallback() {
  try {
    const fallbackPath = path.join(process.cwd(), 'components', 'canvas', 'templates', 'generic_fallback.html');
    return await fs.readFile(fallbackPath, 'utf-8');
  } catch (error) {
    console.error('Error loading generic fallback:', error);
    return '<div>Unable to load fallback visualization. Please try again.</div>';
  }
}

/**
 * Server component that handles the AI template generation pipeline:
 * 1. Select the most appropriate template based on user prompt
 * 2. Generate props for the template using AI
 * 3. Validate the props against the template's schema
 * 4. Render the template with the validated props
 */
export async function TemplateRenderer({ 
  prompt, 
  conversation 
}: TemplateRendererProps) {
  try {
    // Step 1: Select the most appropriate template
    const selectionResult = await selectTemplate(prompt, conversation);
    
    // If confidence is below threshold, show the generic fallback
    if (selectionResult.belowThreshold) {
      console.log(`Template selection confidence (${selectionResult.confidence.toFixed(2)}) below threshold for ${selectionResult.templateId}`);
      
      // Load the generic fallback HTML
      const genericFallbackHtml = await loadGenericFallback();
      
      // Use the TemplateLoader with the generic fallback HTML
      return (
        <TemplateLoader
          templateId="generic"
          props={{}}
          fallbackHtml={genericFallbackHtml}
        />
      );
    }
    
    // Step 2: Load the template configuration
    const templateConfig = await loadTemplate(selectionResult.templateId);
    
    if (!templateConfig) {
      throw new Error(`Failed to load template configuration for ${selectionResult.templateId}`);
    }
    
    // Step 3: Generate props for the template
    let generatedProps;
    try {
      // Use AI to generate props based on the template and user prompt
      const result = await generateObject({
        model: openai.responses("o3"),
        prompt: `
          You are an AI assistant that generates data for visualizations based on user requests.
          
          User request: "${prompt}"
          
          Template: ${templateConfig.name} (${templateConfig.id})
          Description: ${templateConfig.description}
          
          ${templateConfig.example_prompt ? `Example prompt: "${templateConfig.example_prompt}"` : ''}
          ${templateConfig.example_props ? `Example props: ${JSON.stringify(templateConfig.example_props, null, 2)}` : ''}
          
          Generate the appropriate props object for this template based on the user's request.
          The props must match the required schema for this template type.
          Ensure all required fields are included and properly formatted.
        `,
        // We'll use any here since we're validating with Zod in the next step
        schema: {} as any
      });
      
      generatedProps = result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error generating props: ${errorMessage}`);
      
      // Use the generic fallback for prop generation errors
      const genericFallbackHtml = await loadGenericFallback();
      return (
        <TemplateLoader
          templateId="generic"
          props={{}}
          fallbackHtml={genericFallbackHtml}
        />
      );
    }
    
    // Step 4: Validate the generated props against the template's schema
    const validationResult = await validateProps(selectionResult.templateId, generatedProps);
    
    if (!validationResult.valid) {
      console.error('Prop validation failed:', validationResult.errors);
      
      // Use the generic fallback for validation errors
      const genericFallbackHtml = await loadGenericFallback();
      return (
        <TemplateLoader
          templateId="generic"
          props={{}}
          fallbackHtml={genericFallbackHtml}
        />
      );
    }
    
    // Step 5: Render the template with the validated props
    return (
      <TemplateLoader
        templateId={selectionResult.templateId}
        props={validationResult.data}
      />
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error in template renderer: ${errorMessage}`);
    
    // Use generic fallback for all unexpected errors
    const genericFallbackHtml = await loadGenericFallback();
    return (
      <TemplateLoader
        templateId="error"
        props={{}}
        fallbackHtml={genericFallbackHtml}
      />
    );
  }
} 