"use server";

import { z } from 'zod';
import { loadTemplate } from './loadTemplate';

// Import all template schemas 
import { 
  SchedulerPropsType, 
  ChartPropsType, 
  TimelinePropsType 
} from '@/components/canvas/templates';

// Import the actual schema validators
import { SchedulerProps } from '@/components/canvas/templates/scheduler_template/schema';
import { ChartProps } from '@/components/canvas/templates/chart_template/schema';
import { TimelineProps } from '@/components/canvas/templates/timeline_template/schema';

// Define a function to get a schema by name or alias
function getSchemaByName(name: string): z.ZodTypeAny | null {
  // Direct mappings
  if (name === 'scheduler_template' || name === 'SchedulerProps') return SchedulerProps;
  if (name === 'chart_template' || name === 'ChartProps') return ChartProps;
  if (name === 'timeline_template' || name === 'TimelineProps') return TimelineProps;
  
  // Fallback for similar names (case insensitive)
  const lowerName = name.toLowerCase();
  if (lowerName.includes('schedule') || lowerName.includes('calendar')) return SchedulerProps;
  if (lowerName.includes('chart') || lowerName.includes('graph')) return ChartProps;
  if (lowerName.includes('timeline') || lowerName.includes('history')) return TimelineProps;
  
  return null;
}

// Map of template IDs to their Zod schemas
const templateSchemas: Record<string, z.ZodTypeAny> = {
  scheduler_template: SchedulerProps,
  chart_template: ChartProps,
  timeline_template: TimelineProps,
  // Add aliases
  SchedulerProps: SchedulerProps,
  ChartProps: ChartProps,
  TimelineProps: TimelineProps
};

interface ValidationResult<T = any> {
  valid: boolean;
  data?: T;
  errors?: z.ZodError | Error;
}

/**
 * Validates generated props against a template's Zod schema
 */
export async function validateProps(
  templateId: string,
  props: any
): Promise<ValidationResult> {
  try {
    console.log(`Validating props for template ID: ${templateId}`);
    
    // Get template info (might be needed for custom validation logic)
    const templateConfig = await loadTemplate(templateId);
    
    if (!templateConfig) {
      console.error(`Template not found with ID: ${templateId}`);
      return {
        valid: false,
        errors: new Error(`Template not found: ${templateId}`)
      };
    }
    
    // Log template info for debugging
    console.log(`Template found by ID: ${templateId}`);
    console.log(`Template details: ${JSON.stringify({
      name: templateConfig.name,
      type: templateConfig.type,
      zod_schema: templateConfig.zod_schema
    }, null, 2)}`);
    
    // Map common types to ensure we can find the schema
    // This ensures database templates can be mapped to filesystem schemas
    let schemaType = templateConfig.type;
    
    // If type isn't one of our known types, check the zod_schema field
    if (!['scheduler_template', 'chart_template', 'timeline_template'].includes(schemaType)) {
      console.log(`Template type "${schemaType}" isn't a known schema type, checking zod_schema`);
      
      if (templateConfig.zod_schema) {
        // Use zod_schema if available (should be more reliable than type)
        schemaType = templateConfig.zod_schema;
        console.log(`Using zod_schema field: ${schemaType}`);
      } else {
        // Try to infer from name if all else fails
        const name = templateConfig.name.toLowerCase();
        if (name.includes('chart') || name.includes('graph')) {
          schemaType = 'chart_template';
          console.log(`Inferred type from name: ${schemaType}`);
        } else if (name.includes('schedule') || name.includes('calendar')) {
          schemaType = 'scheduler_template';
          console.log(`Inferred type from name: ${schemaType}`);
        } else if (name.includes('timeline') || name.includes('history')) {
          schemaType = 'timeline_template';
          console.log(`Inferred type from name: ${schemaType}`);
        }
      }
    }
    
    // Look for the schema with the determined type
    console.log(`Looking for schema with type: ${schemaType}`);
    let schema = templateSchemas[schemaType];
    
    // If still not found, try using our helper function as a fallback
    if (!schema) {
      console.log(`Schema not found by type "${schemaType}", trying helper function`);
      const helperSchema = getSchemaByName(schemaType);
      if (helperSchema) {
        schema = helperSchema;
      }
    }
    
    if (!schema) {
      console.error(`Schema not found for template: ${templateId}`);
      return {
        valid: false,
        errors: new Error(`Schema not found for template: ${templateId}`)
      };
    }
    
    try {
      // Validate props against the schema
      console.log(`Validating props against schema for ${schemaType}`);
      const validatedData = schema.parse(props);
      
      console.log(`Validation successful for ${schemaType}`);
      return {
        valid: true,
        data: validatedData
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error(`Validation error for ${schemaType}:`, error.format());
        return {
          valid: false,
          errors: error
        };
      }
      throw error;
    }
  } catch (error) {
    console.error('Error validating props:', error);
    return {
      valid: false,
      errors: error instanceof Error ? error : new Error('Unknown validation error')
    };
  }
} 