/**
 * Mock implementation of the canvas visualization generator
 * This is used in the worker context to avoid dependencies on files outside the worker directory
 */

export async function generateCanvasVisualization(
  canvasId: string, 
  messages: any[], 
  prompt: string, 
  roomId: string
): Promise<any> {
  console.log(`[Mock] Generating canvas visualization for canvas ${canvasId}`);
  
  // Return a mock canvas visualization result
  return {
    id: `canvas-${Date.now()}`,
    created_at: new Date().toISOString(),
    content: "<div>Canvas visualization placeholder</div>",
    type: "visualization"
  };
}

export const selectTemplate = async (templateName: string) => {
  return { templateName, success: true };
};

export const loadTemplate = async (templateName: string) => {
  return { templateName, config: {}, success: true };
};

export const validateProps = (templateName: string, props: any) => {
  return { valid: true, errors: [] };
};

export const logTemplateInfo = (templateName: string, info: any) => {
  console.log(`[Mock] Template info for ${templateName}:`, info);
};
