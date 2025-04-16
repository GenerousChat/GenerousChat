"use client";

import { useEffect, useRef, useState } from "react";
import { 
  CanvasVisualization,
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
  activeGeneration,
  onSelectGeneration
}: {
  roomId?: string;
  activeGeneration?: CanvasGeneration | null;
  onSelectGeneration?: (generation: CanvasGeneration) => void;
}) {
  
  // Generation state is now managed by parent component
  
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
 
  const containerRef = useRef<HTMLDivElement>(null);
  
  const loadGenerationContent = (generation: CanvasGeneration) => {
    
    // Reset state
    setHtmlContent(null);
    
    try {
      setHtmlContent(generation.html);
    } catch (err) {
      console.error('Failed to load visualization:', err);
    }
  };
  
  // Load content when activeGeneration changes
  useEffect(() => {
    if (activeGeneration) {
      loadGenerationContent(activeGeneration);
    }
  }, [activeGeneration]);


  return (
    <div className="flex flex-col h-full w-full">
      {/* GenerationHistory moved to chat-room.tsx */}
      
      <div className="flex-1 h-full relative bg-background dark:bg-background w-full bg-red-500">
        <div 
          ref={containerRef}
          className="absolute inset-0 flex items-center justify-center"
        >
          {!htmlContent && (
            <div className="w-full h-full flex items-center justify-center bg-[url('/canvas_loading_background.svg')] bg-repeat dark:invert">
              <img src="/canvas_loading.png" alt="Loading" className="max-w-full max-h-full object-contain" />
            </div>
          )}
        </div>
        
        {htmlContent && (
          <CanvasVisualization 
            generationId={activeGeneration?.id}
            htmlContent={htmlContent}
          />
        )}
      </div>
    </div>
  );
}