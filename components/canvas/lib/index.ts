// Export all Canvas library functions and types

// Template loader and configuration
export { loadTemplate } from './loadTemplate';
export type { TemplateConfig } from './loadTemplate';

// Template selection
export { selectTemplate } from './selectTemplate';
export type { TemplateSelectionResult } from './selectTemplate';

// Prop validation
export { validateProps } from './validateProps';

// Debug utilities
export function logTemplateInfo(tag: string, template: any) {
  console.log(`[${tag}] Template Info:`);
  console.log(`- ID: ${template?.id || 'N/A'}`);
  console.log(`- Name: ${template?.name || 'N/A'}`);
  console.log(`- Type: ${template?.type || 'N/A'}`);
  console.log(`- Zod Schema: ${template?.zod_schema || 'N/A'}`);
  console.log(`- Tags: ${template?.tags?.join(', ') || 'N/A'}`);
  
  // Log additional helpful info for debugging
  const knownTypes = ['scheduler_template', 'chart_template', 'timeline_template'];
  const knownSchemas = ['SchedulerProps', 'ChartProps', 'TimelineProps'];
  
  const hasKnownType = template?.type ? knownTypes.includes(template.type) : false;
  const hasKnownSchema = template?.zod_schema ? knownSchemas.includes(template.zod_schema) : false;
  
  console.log(`- Uses Known Type: ${hasKnownType ? 'YES' : 'NO'}`);
  console.log(`- Uses Known Schema: ${hasKnownSchema ? 'YES' : 'NO'}`);
}

// Export client-side utilities
export { useJSXRenderer } from './renderJSX'; 