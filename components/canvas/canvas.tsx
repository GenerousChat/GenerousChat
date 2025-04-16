"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";

import { 
  CanvasVisualization,
  LoadingOverlay,
  ErrorMessage,
  ClientTemplateRenderer
} from "./index";
import { Card, CardContent } from "@/components/ui/card";
import { BlurFade } from "@/components/ui/magicui";
import { GenerationHistory } from "./generation-history";

// Add debugging flag
const DEBUG = true;
function log(...args: any[]) {
  if (DEBUG) {
    console.log('[Canvas]', ...args);
  }
}

// Type for canvas generations
export type CanvasGeneration = {
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
  slug: string;
  room_id: string;
};

export default function Canvas({
  currentUser,
  roomId = 'default-room' // Provide a default value for roomId
}: {
  currentUser: User;
  roomId?: string; // Make roomId optional
}) {
  log('Canvas component rendering, user:', currentUser.id, 'room:', roomId);
  
  // State for active generation
  const [activeGeneration, setActiveGeneration] = useState<CanvasGeneration | null>(null);
  
  // State for visualization content
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [templateProps, setTemplateProps] = useState<any>(null);
  const [renderMethod, setRenderMethod] = useState<'jsx' | 'fallback_iframe'>('fallback_iframe');
  
  const [isLoading, setIsLoading] = useState(true);
  const [visualizationError, setVisualizationError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // We don't need the generations listener setup anymore as it's moved to GenerationHistory
  
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
    loadGenerationContent(generation);
  };
  
  // No message handling functionality needed since we're only displaying existing generations
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      log('Received message from iframe:', event.data);
      if (event.data === 'close-visualization') {
        log('Closing visualization');
        setHtmlContent(null);
        setTemplateId(null);
        setTemplateProps(null);
        setIsLoading(false);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Log component state
  log('Render method:', renderMethod);
  log('Template ID:', templateId);
  log('HTML content status:', htmlContent ? 'present' : 'not present');
  log('Loading status:', isLoading);
  log('Error status:', visualizationError ? 'error' : 'no error');
  log('Active generation:', activeGeneration?.id);

  return (
    <div className="flex flex-col h-full">
      {/* Generation history at the top */}
      <GenerationHistory 
        roomId={roomId}
        activeGenerationId={activeGeneration?.id}
        onSelectGeneration={handleSelectGeneration}
      />
      
      {/* Main content area with visualization */}
      <div className="flex-1 relative overflow-hidden bg-background dark:bg-background">
        {/* Visualization container */}
        <div 
          ref={containerRef}
          className="absolute inset-0 flex items-center justify-center"
        >
          {!htmlContent && !templateId && !isLoading && !visualizationError && (
            <BlurFade className="max-w-lg w-full">
              <Card className="shadow-lg border-border bg-card text-card-foreground overflow-hidden">
                <CardContent className="p-8 flex flex-col items-center text-center">
                  <div className="mb-6">
                    <div className="relative w-20 h-20 mx-auto mb-4">
                      <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping [animation-duration:3s]"></div>
                      <div className="relative flex items-center justify-center w-full h-full bg-primary/5 rounded-full border border-primary/20">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <motion.h2 
                    className="text-xl font-semibold mb-3 text-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {generations.length === 0 ? "No Visualizations Yet" : "Select a Visualization"}
                  </motion.h2>
                  <motion.p 
                    className="text-muted-foreground mb-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {!activeGeneration 
                      ? "No visualizations available for this room yet." 
                      : "Click on a visualization in the history above to view it."}
                  </motion.p>
                </CardContent>
              </Card>
            </BlurFade>
          )}
        </div>
        
        {/* Template-based visualization (JSX) */}
        {renderMethod === 'jsx' && templateId && templateProps && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-full">
              <ClientTemplateRenderer 
                templateId={templateId}
                props={templateProps}
                onClose={() => {
                  setTemplateId(null);
                  setTemplateProps(null);
                }}
              />
            </div>
          </div>
        )}
        
        {/* HTML-based visualization (iframe) */}
        {renderMethod === 'fallback_iframe' && htmlContent && (
          <CanvasVisualization 
            generationId={activeGeneration?.id || null}
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
          <LoadingOverlay message="Loading visualizations..." />
        )}
      </div>
      {/* No input area needed since we're only displaying existing generations */}
    </div>
  );
}