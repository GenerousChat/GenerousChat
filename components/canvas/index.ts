// Export main Canvas components
export { default } from './canvas';
export { CanvasVisualization } from './canvas-visualization';
export { CanvasInput } from './canvas-input';
export { LoadingOverlay } from './loading-overlay';
export { ErrorMessage } from './error-message';
export { GenerationHistory } from './generation-history';

// Export hooks
export { useCanvasData } from './use-canvas-data';
export { usePusherChannel } from './use-pusher-channel';

// Export utilities
export * from './canvas-utils';

// Export template components
export { default as TemplateLoader } from './template-loader';
export { TemplateRenderer } from './template-renderer';

// Import and re-export ClientTemplateRenderer
import { ClientTemplateRenderer as CTR } from './client-template-renderer';
export const ClientTemplateRenderer = CTR;

// Re-export template types
export * from './templates';