"use client";

import { useRef, useState } from "react";
import { 
  CanvasVisualization,
  ErrorMessage,
  GenerationHistory
} from "./index";


// Type for canvas generations
type CanvasGeneration = {
  id: string;
  canvas_id: string;
  created_by: string;
  template_id: string | null;
  component_code: string | null;
  component_data: any;
  html: string | null;
  confidence: number | null;
  render_method: 'jsx' | 'fallback_iframe' | null;
  summary: string | null;
  type: string | null;
  metadata: any;
  created_at: string;
  room_id: string;
};

export default function Canvas({
  roomId,
}: {
  roomId?: string;
}) {
  
  // State for active generation only
  const [activeGeneration, setActiveGeneration] = useState<CanvasGeneration | null>(null);
  
  // State for visualization content
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [renderMethod, setRenderMethod] = useState<'jsx' | 'fallback_iframe'>('fallback_iframe');
  
  const [isLoading, setIsLoading] = useState(false);
  const [visualizationError, setVisualizationError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Function to load content from a generation
  const loadGenerationContent = (generation: CanvasGeneration) => {
    
    // Reset state
    setHtmlContent(null);
    setTemplateId(null);
    setVisualizationError(null);
    
    try {
      // For HTML based renderings (fallback)
      setHtmlContent(generation.html);
      setRenderMethod('fallback_iframe');
    } catch (err) {
      // Handle the unknown error type properly
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setVisualizationError(`Failed to load visualization: ${errorMessage}`);
    }
  };
  
  // Handle selecting a different generation
  const handleSelectGeneration = (generation: CanvasGeneration) => {
    setActiveGeneration(generation);
    loadGenerationContent(generation); // We don't need to track messages changes as we're only displaying generations
  };


  // No longer needed as GenerationHistory handles this
  return (
    <div className="flex flex-col h-full w-full">
      {/* Generation history at the top */}
          <GenerationHistory 
        roomId={roomId || ''}
        activeGenerationId={activeGeneration?.id}
        onSelectGeneration={handleSelectGeneration}
      />
      
      {/* Main content area with visualization */}
      <div className="flex-1 h-full relative bg-background dark:bg-background w-full bg-red-500">
        {/* Visualization container */}
        <div 
          ref={containerRef}
          className="absolute inset-0 flex items-center justify-center"
        >
          {!htmlContent && !templateId && !isLoading && !visualizationError && (
            <div><img src="/canvas_loading.png" alt="Loading" /></div>
          )}
        </div>
        
        {/* HTML-based visualization (iframe) */}
        {renderMethod === 'fallback_iframe' && htmlContent && (
          <CanvasVisualization 
            generationId={activeGeneration?.id}
            htmlContent={htmlContent}
            onClose={() => setHtmlContent(null)}
          />
        )}
        
        {/* Error message display */}
        {visualizationError && !isLoading && !htmlContent && !templateId && (
          <ErrorMessage 
            message={visualizationError} 
            onClose={() => setVisualizationError(null)} 
          />
        )}
        
        {/* Loading overlay */}
        {isLoading && !htmlContent && !templateId && (
          <div><img src="/canvas_loading.png" alt="Loading" /></div>
        )}
      </div>
    </div>
  );
}