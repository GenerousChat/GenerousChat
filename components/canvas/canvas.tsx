"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { 
  CanvasVisualization,
  CanvasInput,
  LoadingOverlay,
  ErrorMessage,
  usePusherChannel,
  CanvasMessage,
  createLoadingVisualization,
  createErrorVisualization
} from "./index";
import { Card, CardContent } from "@/components/ui/card";
import { BlurFade } from "@/components/ui/magicui";
import { Button } from "@/components/ui/button";

export default function Canvas({
  currentUser,
}: {
  currentUser: User;
}) {
  const [canvasMessages, setCanvasMessages] = useState<CanvasMessage[]>([]);
  const [canvasId] = useState<string>(`canvas-${Date.now()}`);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [visualizationError, setVisualizationError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Set up Pusher channel and handle real-time updates
  usePusherChannel({
    canvasId,
    setCanvasMessages,
    setHtmlContent,
    setIsLoading,
    setVisualizationError,
    supabase
  });

  // Handle message submission
  const handleSendMessage = async (newMessage: string) => {
    if (!newMessage.trim()) return;
    
    setVisualizationError(null);
    
    try {
      const { data, error } = await supabase
        .from("canvas_messages")
        .insert({
          canvas_id: canvasId,
          user_id: currentUser.id,
          content: newMessage
        })
        .select()
        .single();

      if (error) throw new Error(`Error saving message: ${error.message}`);

      const messageObject = {
        id: data.id,
        user_id: currentUser.id,
        content: newMessage,
        created_at: data.created_at
      };
      
      setCanvasMessages(prev => [...prev, messageObject]);
      
      // Send to Pusher
      await fetch('/api/pusher/canvas-element', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canvasId,
          type: 'message',
          message: messageObject
        }),
      });
      
      // Always trigger visualization generation on every text input
      console.log('Requesting visualization');
      setIsLoading(true);
      
      // Show loading visualization immediately for better UX
      const loadingHtml = createLoadingVisualization(newMessage);
      setHtmlContent(loadingHtml);
      
      // Request visualization
      try {
        const response = await fetch('/api/canvas/generate-visualization', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            canvasId,
            messages: [...canvasMessages, messageObject],
            prompt: newMessage
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Visualization request failed: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Visualization request result:', result);
        
        // If direct HTML response is provided, use it immediately
        if (result.html) {
          setHtmlContent(result.html);
          setIsLoading(false);
        }
        // Otherwise the server will send through Pusher
      } catch (error: any) {
        console.error("Error requesting visualization:", error);
        setVisualizationError(error.message || "Failed to generate visualization");
        setIsLoading(false);
        
        // Show error visualization
        setHtmlContent(createErrorVisualization(error.message || "Unknown error occurred"));
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      setVisualizationError(error.message || "Failed to send message");
      setIsLoading(false);
    }
  };

  // Listen for iframe messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'close-visualization') {
        setHtmlContent(null);
        setIsLoading(false);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Main content area with visualization - extends to the top */}
      <div className="flex-1 relative overflow-hidden bg-background dark:bg-background">
        {/* Visualization container */}
        <div 
          ref={containerRef}
          className="absolute inset-0 flex items-center justify-center"
        >
          {!htmlContent && !isLoading && !visualizationError && (
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
                    Ready to Visualize
                  </motion.h2>
                  <motion.p 
                    className="text-muted-foreground mb-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    Enter a prompt below to generate an interactive data visualization.
                  </motion.p>
                  {/* Example suggestions removed */}
                </CardContent>
              </Card>
            </BlurFade>
          )}
        </div>
        
        {/* Visualization component */}
        <CanvasVisualization 
          htmlContent={htmlContent}
          onClose={() => setHtmlContent(null)}
        />
        
        {/* Error message display */}
        {visualizationError && !isLoading && !htmlContent && (
          <ErrorMessage 
            message={visualizationError} 
            onClose={() => setVisualizationError(null)} 
          />
        )}
        
        {/* Loading overlay */}
        {isLoading && !htmlContent && (
          <LoadingOverlay message="Generating visualization..." />
        )}
      </div>
      
      {/* Input area at bottom */}
      <div className="border-t border-border bg-card dark:bg-card p-4 shadow-md">
        <CanvasInput 
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}