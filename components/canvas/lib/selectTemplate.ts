"use server";

import { createClient } from "@/utils/supabase/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Interface for template data from database
interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  tags: string[];
  confidence_threshold: number;
}

// Interface for template selection result
export interface TemplateSelectionResult {
  templateId: string;
  confidence: number;
  reasoning: string;
  belowThreshold: boolean;
}

// Define schema for AI response validation
const AISelectionSchema = z.object({
  templateId: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string()
});

/**
 * Selects the most appropriate template based on user prompt and conversation context
 * Uses AI to analyze intent and confidence scoring
 */
export async function selectTemplate(
  prompt: string,
  conversation: string[] = []
): Promise<TemplateSelectionResult> {
  // Get available templates from the database
  const supabase = await createClient();
  const { data: templates, error } = await supabase
    .from('canvas_templates')
    .select('id, name, description, tags, confidence_threshold');
  
  if (error || !templates || templates.length === 0) {
    console.error('Error fetching templates:', error);
    // Fallback to a default template if database call fails
    return {
      templateId: 'generic',
      confidence: 0.5,
      reasoning: 'Failed to load templates from database',
      belowThreshold: true
    };
  }
  
  // Format the templates for the AI prompt
  const availableTemplates = templates.map(template => ({
    id: template.id,
    name: template.name,
    description: template.description,
    tags: template.tags || []
  }));
  
  // Generate a structured selection using the AI model
  try {
    // Use string template to build the system prompt
    const selectionPrompt = `
      You are an AI assistant that selects the most appropriate visualization template based on user requests.
      
      User conversation history:
      ${conversation.join('\n')}
      
      Latest user request: "${prompt}"
      
      Available templates:
      ${JSON.stringify(availableTemplates, null, 2)}
      
      Select the most appropriate template for this request. 
      Consider the following:
      - The user's intent (data visualization, scheduling, timeline, etc.)
      - Matching keywords in the request with template tags
      - The template's purpose and description
      
      Provide your selection with a confidence score (0.0 to 1.0) and reasoning.
      If you're uncertain (confidence < 0.65), select the best match but indicate lower confidence.
    `;
    
    // Call the AI model with the appropriate schema
    const response = await generateObject({
      model: openai("gpt-4o"),
      prompt: selectionPrompt,
      schema: AISelectionSchema
    });
    
    // Extract the selection result from the response
    const { templateId, confidence, reasoning } = response.object;
    
    // Find the matched template to get its confidence threshold
    const matchedTemplate = templates.find(t => t.id === templateId);
    const confidenceThreshold = matchedTemplate?.confidence_threshold || 0.75;
    
    // Return the result with the below threshold flag
    return {
      templateId,
      confidence,
      reasoning,
      belowThreshold: confidence < confidenceThreshold
    };
  } catch (error) {
    console.error('Error selecting template:', error);
    return {
      templateId: 'generic',
      confidence: 0.5,
      reasoning: 'Error during template selection',
      belowThreshold: true
    };
  }
} 