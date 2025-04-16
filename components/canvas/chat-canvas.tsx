"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { 
  CanvasVisualization,
  ErrorMessage,
  CanvasMessage,
  ClientTemplateRenderer,
  GenerationHistory
} from "./index";
import { Card, CardContent } from "@/components/ui/card";
import Pusher from 'pusher-js';

// Add debugging flag
const DEBUG = true;
function log(...args: any[]) {
  if (DEBUG) {
    console.log('[Canvas]', ...args);
  }
}

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
  currentUser,
  messages,
  roomId,
}: {
  currentUser: User;
  messages: CanvasMessage[];  
  roomId?: string;
}) {
  log('Canvas component rendering, user:', currentUser.id, 'room:', roomId);
  
  // State for active generation only
  const [activeGeneration, setActiveGeneration] = useState<CanvasGeneration | null>(null);
  
  // State for visualization content
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [templateProps, setTemplateProps] = useState<any>(null);
  const [renderMethod, setRenderMethod] = useState<'jsx' | 'fallback_iframe'>('fallback_iframe');
  
  const [isLoading, setIsLoading] = useState(false);
  const [visualizationError, setVisualizationError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  
  // Function to load content from a generation
  const loadGenerationContent = (generation: CanvasGeneration) => {
    log('Loading generation content:', generation.id);
    
    // Reset state
    setHtmlContent(null);
    setTemplateId(null);
    setTemplateProps(null);
    setVisualizationError(null);
    
    try {
      if (generation.render_method === 'jsx' && generation.template_id) {
        // For JSX based renderings
        setTemplateId(generation.template_id);
        setTemplateProps(generation.component_data);
        setRenderMethod('jsx');
      } else {
        // For HTML based renderings (fallback)
        setHtmlContent(generation.html);
        setRenderMethod('fallback_iframe');
      }
    } catch (err) {
      log('Error loading generation content:', err);
      // Handle the unknown error type properly
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setVisualizationError(`Failed to load visualization: ${errorMessage}`);
    }
  };
  
  // Handle selecting a different generation
  const handleSelectGeneration = (generation: CanvasGeneration) => {
    log('Selecting generation:', generation.id);
    setActiveGeneration(generation);
    loadGenerationContent(generation); // We don't need to track messages changes as we're only displaying generations
  };

  // Reduce logging to minimize impact on performance
  useEffect(() => {
    log('Component state:', {
      roomId,
      activeGenerationId: activeGeneration?.id,
      templateId,
      renderMethod,
      hasHtmlContent: !!htmlContent,
      isLoading,
      hasError: !!visualizationError
    });
  }, [roomId, activeGeneration?.id, templateId, renderMethod, htmlContent, isLoading, visualizationError]);

  // If no roomId is provided, show a message
  if (!roomId) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-background dark:bg-background">
        <Card className="shadow-lg border-border bg-card text-card-foreground overflow-hidden max-w-md">
          <CardContent className="p-8 flex flex-col items-center text-center">
            <div className="mb-6">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="relative flex items-center justify-center w-full h-full bg-yellow-100 rounded-full border border-yellow-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
            </div>
 
          </CardContent>
        </Card>
      </div>
    );
  }
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
        
        {/* Template-based visualization (JSX) */}
        {renderMethod === 'jsx' && templateId && templateProps && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-full">
              <ClientTemplateRenderer 
                templateId={templateId}
                props={templateProps}
                onClose={() => null} // Simplified to prevent re-renders
              />
            </div>
          </div>
        )}
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