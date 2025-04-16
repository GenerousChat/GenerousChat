"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { 
  CanvasVisualization,
  ErrorMessage,
  CanvasMessage,
  ClientTemplateRenderer
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
  
  // State for generations
  const [generations, setGenerations] = useState<CanvasGeneration[]>([]);
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
  
  // Setup Supabase listener for generations
  useEffect(() => {
    if (!roomId) {
      log('No room ID provided');
      setIsLoading(false);
      return;
    }
    
    log('Setting up generations listener for room:', roomId);
    setIsLoading(true);
    
    // Initial fetch to get existing generations
    const fetchInitialGenerations = async () => {
      try {
        const { data, error } = await supabase
          .from("canvas_generations")
          .select("*")
          .eq("room_id", roomId)
          .order("created_at", { ascending: false });
          
        if (error) {
          log('Error fetching initial generations:', error);
          setVisualizationError(`Error loading visualizations: ${error.message}`);
          return;
        }
        
        log(`Fetched ${data?.length || 0} generations for room ${roomId}`);
        
        if (data && data.length > 0) {
          setGenerations(data);
          // Set the most recent generation as active
          setActiveGeneration(data[0]);
          // Load the visualization content
          loadGenerationContent(data[0]);
        }
      } catch (err) {
        log('Error in fetchInitialGenerations:', err);
        // Handle the unknown error type properly
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setVisualizationError(`Failed to load visualizations: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    // Call initial fetch
    fetchInitialGenerations();
    
    // Setup Pusher for real-time updates
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || 'asdasd', {
      cluster: 'us3',
    });

    const channel = pusher.subscribe(`room-${roomId}`);

    // Listen for new generation notifications
    channel.bind('new-generation', async (data: any) => {
      log("New generation received:", data);
      try {
        const notificationData = typeof data === 'string' ? JSON.parse(data) : data;
        
        // Fetch the generation from the database
        const { data: generation, error } = await supabase
          .from('canvas_generations')
          .select('*')
          .eq('id', notificationData.generation_id)
          .single();

        if (error) {
          throw new Error(`Error fetching generation: ${error.message}`);
        }
        
        if (generation) {
          // Add the new generation to the list and select it
          setGenerations(prev => [generation, ...prev].slice(0, 20));
          setActiveGeneration(generation);
          loadGenerationContent(generation);
        } else {
          console.warn('Generation found but no html field:', generation);
        }
      } catch (error) {
        console.error('Error handling new generation notification:', error);
      }
    });
    
    // Return cleanup function
    return () => {
      log('Cleaning up Pusher connection');
      channel.unbind_all();
      pusher.unsubscribe(`room-${roomId}`);
    };
    // Set up real-time listener for new generations using Supabase
    const subscription = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'canvas_generations',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          log('Received generation update:', payload);
          
          // Update the generations state based on the change type
          if (payload.eventType === 'INSERT') {
            const newGeneration = payload.new as CanvasGeneration;
            setGenerations(prev => [newGeneration, ...prev]);
            
            // Set as active if it's the first one or if we don't have an active one
            if (!activeGeneration) {
              setActiveGeneration(newGeneration);
              loadGenerationContent(newGeneration);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedGeneration = payload.new as CanvasGeneration;
            setGenerations(prev => 
              prev.map(gen => gen.id === updatedGeneration.id ? updatedGeneration : gen)
            );
            
            // If this is the active generation, update the displayed content
            if (activeGeneration && activeGeneration.id === updatedGeneration.id) {
              setActiveGeneration(updatedGeneration);
              loadGenerationContent(updatedGeneration);
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setGenerations(prev => {
              const filtered = prev.filter(gen => gen.id !== deletedId);
              
              // If the active generation was deleted, set a new active one
              if (activeGeneration && activeGeneration.id === deletedId && filtered.length > 0) {
                setActiveGeneration(filtered[0]);
                loadGenerationContent(filtered[0]);
              }
              
              return filtered;
            });
          }
        }
      )
      .subscribe();

    // Return cleanup function for both Pusher and Supabase subscriptions
    return () => {
      log('Cleaning up listeners');
      channel.unbind_all();
      pusher.unsubscribe(`room-${roomId}`);
      subscription.unsubscribe();
    };
  }, [roomId]); // Remove activeGeneration from dependencies to prevent re-render loops
  
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
      generationsCount: generations.length,
      templateId,
      renderMethod,
      hasHtmlContent: !!htmlContent,
      isLoading,
      hasError: !!visualizationError
    });
  }, [roomId, activeGeneration?.id, generations.length, templateId, renderMethod, htmlContent, isLoading, visualizationError]);

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
            <motion.h2 
              className="text-xl font-semibold mb-3 text-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              No Room ID Specified
            </motion.h2>
            <motion.p 
              className="text-muted-foreground mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              A room ID is required to display visualizations. Please provide a valid room ID.
            </motion.p>
          </CardContent>
        </Card>
      </div>
    );
  }
  const canvasGenButton = (generation: CanvasGeneration) => {
    return <span
    key={generation.id}
    onClick={() => handleSelectGeneration(generation)}
    className={`px-3 py-1 rounded text-sm transition-colors ${
      activeGeneration?.id === generation.id 
        ? "bg-primary text-primary-foreground font-medium" 
        : "bg-muted hover:bg-muted/80 text-muted-foreground"
    }`}
    title={generation.summary || new Date(generation.created_at).toLocaleString()}
  >
    Gen
    {/* {generation.summary 
      ? (generation.summary.length > 20 
          ? `${generation.summary.substring(0, 20)}...` 
          : generation.summary)
      : new Date(generation.created_at).toLocaleTimeString()} */}
  </span>
  }
  return (
    <div className="flex flex-col h-full w-full">
      {/* Generation history at the top */}
      {generations.length > 0 && (
        <div className="p-2 border-b border-border bg-card dark:bg-card">
          <div className="overflow-x-auto" style={{ width: '100%', maxWidth: '100%' }}>
            <div className="flex flex-nowrap space-x-2 p-1">
              {generations.reverse().slice(0, 8).map(generation => (
                canvasGenButton(generation)
              ))}
            </div>
          </div>
        </div>
      )}
      
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