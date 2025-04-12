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
  detailedErrors?: string;
  transformed?: boolean;
}

/**
 * Extract detailed validation errors from a ZodError
 */
function extractValidationErrors(error: z.ZodError): string {
  return error.errors.map(err => {
    const path = err.path.join('.');
    return `Field "${path}": ${err.message}`;
  }).join('\n');
}

/**
 * Transform props to match schema requirements
 * Fixes common issues that cause validation failures
 */
function transformPropsToMatchSchema(props: any, schemaType: string, templateId: string): any {
  const transformed = {...props};
  
  // Special handling for the custom chart template with ID 09f2d352-131f-4b1f-9a73-449fa8742742
  if (templateId === '09f2d352-131f-4b1f-9a73-449fa8742742') {
    console.log('Applying custom chart template transformations for template ID:', templateId);
    
    // Detect the format we're working with
    const hasChartJsFormat = 
      transformed.data && 
      typeof transformed.data === 'object' && 
      !Array.isArray(transformed.data) &&
      transformed.data.datasets;
      
    const hasCustomFormat = 
      transformed.data && 
      Array.isArray(transformed.data) && 
      transformed.data.length > 0 && 
      transformed.data[0].label !== undefined &&
      transformed.data[0].value !== undefined;
    
    console.log(`Detected format: ${hasChartJsFormat ? 'Chart.js' : hasCustomFormat ? 'Custom' : 'Unknown'}`);
    
    // OPTION 1: If we have Chart.js format, convert to custom format
    if (hasChartJsFormat) {
      console.log('Converting Chart.js format to custom format...');
      
      // Create the custom format props
      const customData = transformed.data.labels.map((label: string, index: number) => {
        const dataset = transformed.data.datasets[0] || { data: [] };
        const value = dataset.data[index] || 0;
        
        // Handle colors - either take from backgroundColor array or use a default color
        let color;
        if (dataset.backgroundColor) {
          if (Array.isArray(dataset.backgroundColor)) {
            color = dataset.backgroundColor[index % dataset.backgroundColor.length];
          } else {
            color = dataset.backgroundColor;
          }
        } else {
          // Default colors
          const defaultColors = ['#4BC0C0', '#FF6384', '#FFCE56', '#36A2EB', '#9966FF'];
          color = defaultColors[index % defaultColors.length];
        }
        
        return { label, value, color };
      });
      
      const customProps = {
        title: transformed.title || transformed.options?.plugins?.title?.text || 'Tax Distribution Chart',
        type: transformed.type || 'bar',
        data: customData.length > 0 ? customData : [
          { label: 'Income Tax', value: 35, color: '#4BC0C0' },
          { label: 'Corporate Tax', value: 25, color: '#FF6384' },
          { label: 'Property Tax', value: 20, color: '#FFCE56' }
        ],
        xAxisLabel: transformed.xAxisLabel || transformed.options?.scales?.x?.title?.text || 'Tax Type',
        yAxisLabel: transformed.yAxisLabel || transformed.options?.scales?.y?.title?.text || 'Percentage',
        showLegend: transformed.showLegend !== undefined ? transformed.showLegend : 
                    transformed.options?.plugins?.legend?.display !== undefined ? 
                    transformed.options.plugins.legend.display : true,
        _templateType: 'chart_template'
      } as any;
      
      console.log('Converted to custom format:', JSON.stringify(customProps, null, 2));
      return customProps;
    }
    
    // OPTION 2: If we already have custom format, ensure all required fields exist
    if (hasCustomFormat) {
      console.log('Already in custom format, ensuring all required fields exist...');
      
      // Ensure type is valid
      if (!transformed.type || !['bar', 'line', 'pie', 'scatter', 'area'].includes(transformed.type)) {
        transformed.type = 'bar';
        console.log('- Added default chart type: bar');
      }
      
      // Ensure title exists
      if (!transformed.title) {
        transformed.title = 'Tax Distribution Chart';
        console.log('- Added default title');
      }
      
      // Add default axis labels if missing
      if (!transformed.xAxisLabel) {
        transformed.xAxisLabel = 'Tax Type';
        console.log('- Added default X axis label');
      }
      
      if (!transformed.yAxisLabel) {
        transformed.yAxisLabel = 'Percentage';
        console.log('- Added default Y axis label');
      }
      
      // Add showLegend if missing
      if (transformed.showLegend === undefined) {
        transformed.showLegend = true;
        console.log('- Added default legend setting');
      }
      
      // Add _templateType so template-loader can identify the type
      transformed._templateType = 'chart_template';
      
      return transformed;
    }
    
    // OPTION 3: If we have neither format, create a default custom format
    console.log('No existing data structure detected, creating default custom format...');
    
    const defaultProps = {
      title: transformed.title || 'Tax Distribution Chart',
      type: transformed.type || 'bar',
      data: [
        { label: 'Income Tax', value: 35, color: '#4BC0C0' },
        { label: 'Corporate Tax', value: 25, color: '#FF6384' },
        { label: 'Property Tax', value: 20, color: '#FFCE56' }
      ],
      xAxisLabel: 'Tax Type',
      yAxisLabel: 'Percentage',
      showLegend: true,
      _templateType: 'chart_template'
    } as any;
    
    console.log('Created default custom format:', JSON.stringify(defaultProps, null, 2));
    return defaultProps;
  }
  
  // Common transformations based on schema type
  if (schemaType === 'chart_template' || schemaType === 'ChartProps') {
    console.log('Applying chart template transformations...');
    // Ensure type is valid
    if (!transformed.type || !['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea', 'scatter', 'bubble'].includes(transformed.type)) {
      transformed.type = 'bar';
      console.log('- Added default chart type: bar');
    }
    
    // Ensure data object exists
    if (!transformed.data) {
      transformed.data = {};
      console.log('- Added empty data object');
    }
    
    // Ensure datasets is an array with at least one item
    if (!transformed.data.datasets || !Array.isArray(transformed.data.datasets) || transformed.data.datasets.length === 0) {
      transformed.data.datasets = transformed.data.datasets || [{ 
        label: 'Default Dataset',
        data: [10, 20, 30]
      }];
      console.log('- Added default dataset');
    }
    
    // Ensure each dataset has required properties
    transformed.data.datasets = transformed.data.datasets.map((dataset: any, index: number) => {
      if (!dataset.label) {
        dataset.label = `Dataset ${index + 1}`;
        console.log(`- Added label for dataset ${index + 1}`);
      }
      
      if (!dataset.data || !Array.isArray(dataset.data) || dataset.data.length === 0) {
        dataset.data = [10, 20, 30];
        console.log(`- Added default data for dataset ${index + 1}`);
      }
      
      return dataset;
    });
    
    // Ensure labels exist
    if (!transformed.data.labels || !Array.isArray(transformed.data.labels) || transformed.data.labels.length === 0) {
      transformed.data.labels = ['Label 1', 'Label 2', 'Label 3'];
      console.log('- Added default labels');
    }
    
    // Ensure options object exists
    if (!transformed.options) {
      transformed.options = {};
      console.log('- Added empty options object');
    }
  }
  
  else if (schemaType === 'scheduler_template' || schemaType === 'SchedulerProps') {
    console.log('Applying scheduler template transformations...');
    
    // Ensure activities array exists and has at least one item
    if (!transformed.activities || !Array.isArray(transformed.activities) || transformed.activities.length === 0) {
      transformed.activities = [
        { date: 'Monday', label: 'Sample Activity 1' },
        { date: 'Tuesday', label: 'Sample Activity 2' }
      ];
      console.log('- Added default activities');
    }
    
    // Ensure each activity has required properties
    transformed.activities = transformed.activities.map((activity: any, index: number) => {
      if (!activity.date) {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        activity.date = days[index % days.length];
        console.log(`- Added default date for activity ${index + 1}`);
      }
      
      if (!activity.label) {
        activity.label = `Activity ${index + 1}`;
        console.log(`- Added default label for activity ${index + 1}`);
      }
      
      return activity;
    });
    
    // Add title if missing
    if (!transformed.title) {
      transformed.title = 'Weekly Schedule';
      console.log('- Added default title');
    }
  }
  
  else if (schemaType === 'timeline_template' || schemaType === 'TimelineProps') {
    console.log('Applying timeline template transformations...');
    
    // Ensure events array exists and has at least one item
    if (!transformed.events || !Array.isArray(transformed.events) || transformed.events.length === 0) {
      transformed.events = [
        { 
          date: '2023-01-01', 
          title: 'Event 1',
          description: 'Sample event description'
        },
        { 
          date: '2023-02-01', 
          title: 'Event 2',
          description: 'Sample event description'
        }
      ];
      console.log('- Added default events');
    }
    
    // Ensure each event has required properties
    transformed.events = transformed.events.map((event: any, index: number) => {
      if (!event.date) {
        const month = index + 1;
        event.date = `2023-${month < 10 ? '0' + month : month}-01`;
        console.log(`- Added default date for event ${index + 1}`);
      }
      
      if (!event.title) {
        event.title = `Event ${index + 1}`;
        console.log(`- Added default title for event ${index + 1}`);
      }
      
      if (!event.description) {
        event.description = `Description for event ${index + 1}`;
        console.log(`- Added default description for event ${index + 1}`);
      }
      
      return event;
    });
    
    // Add default options if missing
    if (!transformed.options) {
      transformed.options = {
        timelineTitle: 'Sample Timeline'
      };
      console.log('- Added default options');
    }
  }
  
  return transformed;
}

/**
 * Validates generated props against a template's Zod schema
 * @param templateId The ID of the template
 * @param props The props to validate
 * @param isFromDatabase Whether the props are from the database (less aggressive transformation)
 */
export async function validateProps(
  templateId: string,
  props: any,
  isFromDatabase: boolean = false
): Promise<ValidationResult> {
  try {
    console.log(`Validating props for template ID: ${templateId}`);
    console.log('Input props:', JSON.stringify(props, null, 2));
    console.log('Source:', isFromDatabase ? 'Database' : 'Generated');
    
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
      console.log(`Template type "${schemaType}" is not a standard type. Checking zod_schema...`);
      if (templateConfig.zod_schema) {
        if (typeof templateConfig.zod_schema === 'string') {
          // If zod_schema is a string, check if it's one of our known schemas
          const schemaName = templateConfig.zod_schema;
          if (['SchedulerProps', 'ChartProps', 'TimelineProps'].includes(schemaName)) {
            console.log(`Using zod_schema "${schemaName}" to determine schema type`);
            
            if (schemaName === 'SchedulerProps') schemaType = 'scheduler_template';
            else if (schemaName === 'ChartProps') schemaType = 'chart_template';
            else if (schemaName === 'TimelineProps') schemaType = 'timeline_template';
          } else {
            // If it's a custom JSON schema definition as a string
            console.log(`Using custom schema definition from zod_schema field`);
            // Keep the original schemaType
          }
        }
      } else {
        // Try to infer type from template name
        console.log(`No zod_schema field. Inferring from template name: "${templateConfig.name}"`);
        const name = templateConfig.name.toLowerCase();
        if (name.includes('chart') || name.includes('graph')) {
          schemaType = 'chart_template';
        } else if (name.includes('schedule') || name.includes('calendar')) {
          schemaType = 'scheduler_template';
        } else if (name.includes('timeline') || name.includes('history')) {
          schemaType = 'timeline_template';
        } else {
          console.log(`Cannot infer type. Using original: ${schemaType}`);
          // Keep the original schemaType
        }
      }
    }
    
    console.log(`Looking for schema with type: ${schemaType}`);
    
    // Get the schema based on the determined type
    const schema = getSchemaByName(schemaType);
    
    if (!schema) {
      return {
        valid: false,
        errors: new Error(`Schema not found for template type: ${schemaType}`)
      };
    }
    
    console.log(`Validating props against schema for ${schemaType}`);
    
    // Try to validate with the original props
    try {
      const validatedData = schema.parse(props);
      console.log('Validation succeeded with original props!');
      return {
        valid: true,
        data: validatedData
      };
    } catch (error) {
      // If validation fails and the error is a Zod error
      if (error instanceof z.ZodError) {
        console.log('Validation error for ' + schemaType + ':');
        console.log(extractValidationErrors(error));
        
        // Only transform if needed
        if (!isFromDatabase || (isFromDatabase && Object.keys(props).length === 0)) {
          console.log('Attempting to transform props to match schema...');
          const transformedProps = transformPropsToMatchSchema(props, schemaType, templateId);
          console.log('Transformed props:', JSON.stringify(transformedProps, null, 2));
          
          // Try to validate the transformed props
          try {
            const validatedData = schema.parse(transformedProps);
            console.log('Validation succeeded after transformation!');
            return {
              valid: true,
              data: validatedData,
              transformed: true
            };
          } catch (transformError) {
            if (transformError instanceof z.ZodError) {
              return {
                valid: false,
                errors: transformError,
                detailedErrors: extractValidationErrors(transformError),
                transformed: true
              };
            }
            throw transformError;
          }
        } else {
          return {
            valid: false,
            errors: error,
            detailedErrors: extractValidationErrors(error)
          };
        }
      }
      // Re-throw if it's not a Zod error
      throw error;
    }
  } catch (error) {
    console.error('Unexpected error during validation:', error);
    return {
      valid: false,
      errors: error instanceof Error ? error : new Error(String(error))
    };
  }
} 