"use server";

import { createClient } from "@/utils/supabase/server";
import path from 'path';
import fs from 'fs/promises';

export interface TemplateConfig {
  id: string;
  name: string;
  type: string;
  description: string;
  template: string;
  tags?: string[];
  zod_schema: string;
  confidence_threshold: number;
  fallback_html?: string;
  example_prompt?: string;
  example_props?: any;
}

/**
 * Loads a template configuration either from the database
 * or falls back to loading from filesystem
 * @param templateIdOrType Can be either a UUID or a template type string (e.g., "scheduler_template")
 */
export async function loadTemplate(templateIdOrType: string): Promise<TemplateConfig | null> {
  try {
    console.log(`Attempting to load template: ${templateIdOrType}`);
    // First, try to load from Supabase
    const supabase = await createClient();
    
    // Try to find by type first (e.g., scheduler_template)
    let { data: typeData, error: typeError } = await supabase
      .from('canvas_templates')
      .select('*')
      .eq('type', templateIdOrType)
      .limit(1);
      
    if (typeData && typeData.length > 0) {
      console.log(`Template found by type: ${templateIdOrType}`);
      const template = typeData[0] as TemplateConfig;
      
      // Ensure the type field is set properly for schema lookup
      if (!template.type || template.type === '') {
        console.log(`Template type field was empty, setting to: ${templateIdOrType}`);
        template.type = templateIdOrType;
      }
      
      return template;
    }
    
    // If not found by type, try by UUID
    let { data, error } = await supabase
      .from('canvas_templates')
      .select('*')
      .eq('id', templateIdOrType)
      .limit(1);
    
    if (error) {
      console.error('Error loading template from database:', error);
    }
    
    // If found in database, return it
    if (data && data.length > 0) {
      console.log(`Template found by ID: ${templateIdOrType}`);
      const template = data[0] as TemplateConfig;
      
      // Ensure template has a valid type for schema lookup
      if (!template.type || !['scheduler_template', 'chart_template', 'timeline_template'].includes(template.type)) {
        console.log(`Template "${template.name}" has type "${template.type}" - checking if we need to map it`);
        
        // Check if we have a zod_schema field that maps to a known schema
        if (template.zod_schema && ['SchedulerProps', 'ChartProps', 'TimelineProps'].includes(template.zod_schema)) {
          console.log(`Using zod_schema "${template.zod_schema}" to infer template type`);
          
          // Map from schema name to template type
          if (template.zod_schema === 'SchedulerProps') {
            template.type = 'scheduler_template';
          } else if (template.zod_schema === 'ChartProps') {
            template.type = 'chart_template';
          } else if (template.zod_schema === 'TimelineProps') {
            template.type = 'timeline_template';
          }
          
          console.log(`Mapped zod_schema to type: ${template.type}`);
        } 
        // If we don't have a valid zod_schema, try to infer from the name
        else {
          console.log(`No valid zod_schema found, inferring type from name: "${template.name}"`);
          const name = template.name.toLowerCase();
          
          if (name.includes('chart') || name.includes('graph') || name.includes('visualization')) {
            template.type = 'chart_template';
          } else if (name.includes('schedule') || name.includes('calendar') || name.includes('event')) {
            template.type = 'scheduler_template';
          } else if (name.includes('timeline') || name.includes('history') || name.includes('sequence')) {
            template.type = 'timeline_template';
          } else {
            console.warn(`Cannot infer template type from name "${template.name}", defaulting to chart_template`);
            template.type = 'chart_template'; // Default to chart as fallback
          }
          
          console.log(`Inferred type from name: ${template.type}`);
        }
      }
      
      console.log(`Returning template with type: ${template.type}`);
      return template;
    }
    
    console.log(`Template not found in database, trying filesystem lookup for: ${templateIdOrType}`);
    
    // If not found in database, try to load from filesystem
    // This is a fallback mechanism for development or when database is not available
    const templateDir = path.join(process.cwd(), 'components', 'canvas', 'templates');
    
    // Determine directory to look in - try both a direct match and common templates
    let templatePath;
    
    // First check if the templateIdOrType is a known template type
    if (['scheduler_template', 'chart_template', 'timeline_template'].includes(templateIdOrType)) {
      templatePath = path.join(templateDir, templateIdOrType, 'config.json');
    } else {
      // Try to find by scanning available templates
      const templates = await fs.readdir(templateDir);
      for (const template of templates) {
        // Skip non-directories and files
        try {
          const stats = await fs.stat(path.join(templateDir, template));
          if (!stats.isDirectory()) continue;
          
          // Check if there's a config file
          const configPath = path.join(templateDir, template, 'config.json');
          try {
            const configContent = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(configContent);
            
            // Check if this config matches our templateIdOrType by id or type
            if (config.id === templateIdOrType || config.type === templateIdOrType) {
              templatePath = configPath;
              break;
            }
          } catch (configErr) {
            // Config file doesn't exist or can't be parsed, continue to next template
            continue;
          }
        } catch (statErr) {
          continue;
        }
      }
    }
    
    if (!templatePath) {
      console.error(`Template not found: ${templateIdOrType}`);
      return null;
    }
    
    // Load and parse the config file
    try {
      const configContent = await fs.readFile(templatePath, 'utf-8');
      const config = JSON.parse(configContent);
      console.log(`Loaded template from filesystem: ${config.name}`);
      return config as TemplateConfig;
    } catch (fsError) {
      console.error(`Error loading template config from filesystem: ${fsError}`);
      return null;
    }
  } catch (error) {
    console.error('Template loading error:', error);
    return null;
  }
}

/**
 * Creates a default configuration for known templates
 * This is a temporary solution until we have a proper filesystem config
 */
function createDefaultConfig(templateId: string): TemplateConfig {
  const defaults: Record<string, TemplateConfig> = {
    scheduler_template: {
      id: 'scheduler_template',
      name: 'Weekly Scheduler',
      type: 'component',
      description: 'Generates a weekly schedule UI with date + label items.',
      template: '<Scheduler activities={{{activities}}} title={{{title}}} colorTheme={{{colorTheme}}} showWeekends={{{showWeekends}}} layout={{{layout}}} />',
      tags: ['calendar', 'schedule', 'planner'],
      zod_schema: 'SchedulerProps',
      confidence_threshold: 0.75,
      fallback_html: '<div class="fallback-scheduler"><p>Sorry, we couldn\'t generate that scheduler. Please try again with a different prompt.</p></div>',
      example_props: {
        activities: [
          { date: 'Monday', label: 'Yoga' },
          { date: 'Tuesday', label: 'Cardio' }
        ]
      }
    },
    chart_template: {
      id: 'chart_template',
      name: 'Chart Visualization',
      type: 'component',
      description: 'Creates various types of charts including bar, line, pie, and more.',
      template: '<Chart type={{{type}}} data={{{data}}} options={{{options}}} width={{{width}}} height={{{height}}} theme={{{theme}}} />',
      tags: ['chart', 'graph', 'data', 'visualization'],
      zod_schema: 'ChartProps',
      confidence_threshold: 0.75,
      fallback_html: '<div class="fallback-chart"><p>Sorry, we couldn\'t generate that chart. Please try again with a different prompt.</p></div>'
    },
    timeline_template: {
      id: 'timeline_template',
      name: 'Timeline Display',
      type: 'component',
      description: 'Creates interactive timelines for historical events, project milestones, or processes.',
      template: '<Timeline events={{{events}}} options={{{options}}} categories={{{categories}}} />',
      tags: ['timeline', 'history', 'events', 'sequence'],
      zod_schema: 'TimelineProps',
      confidence_threshold: 0.75,
      fallback_html: '<div class="fallback-timeline"><p>Sorry, we couldn\'t generate that timeline. Please try again with a different prompt.</p></div>'
    }
  };
  
  return defaults[templateId];
} 