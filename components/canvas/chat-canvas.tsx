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
  CanvasMessage,
  createLoadingVisualization,
  createErrorVisualization,
  ClientTemplateRenderer
} from "./index";
import { useCanvasData } from "./use-canvas-data";
import { Card, CardContent } from "@/components/ui/card";
import { BlurFade } from "@/components/ui/magicui";

// Add debugging flag
const DEBUG = true;
function log(...args: any[]) {
  if (DEBUG) {
    console.log('[Canvas]', ...args);
  }
}

export default function Canvas({
  currentUser,
  messages,
}: {
  currentUser: User;
  messages: CanvasMessage[];
}) {
  log('Canvas component rendering, user:', currentUser.id);
  
  const [canvasMessages, setCanvasMessages] = useState<CanvasMessage[]>([]);
  const [canvasId] = useState<string>(`canvas-${Date.now()}`);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [visualizationError, setVisualizationError] = useState<string | null>(null);
  
  // New state for template-based visualizations
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [templateProps, setTemplateProps] = useState<any>(null);
  const [renderMethod, setRenderMethod] = useState<'jsx' | 'fallback_iframe'>('fallback_iframe');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  
  log('Canvas ID:', canvasId);

  // get the last message
  const lastMessage = messages[messages.length - 1];

  console.log({ lastMessage });

  // Use our data hook for fetching messages and visualizations
  useCanvasData({
    canvasId,
    setCanvasMessages,
    setHtmlContent,
    setIsLoading,
    setVisualizationError,
    setTemplateId,
    setTemplateProps,
    setRenderMethod,
    supabase
  });

  // Handle message submission
  const handleSendMessage = async (newMessage: string) => {
    if (!newMessage.trim()) return;
    
    log('Sending new message:', newMessage);
    setVisualizationError(null);
    
    try {
      // Save message to database
      log('Saving message to Supabase...');
      const { data, error } = await supabase
        .from("canvas_messages")
        .insert({
          canvas_id: canvasId,
          user_id: currentUser.id,
          content: newMessage
        })
        .select()
        .single();

      if (error) {
        log('Error saving message to Supabase:', error);
        throw new Error(`Error saving message: ${error.message}`);
      }

      log('Message saved successfully, ID:', data.id);
      const messageObject = {
        id: data.id,
        user_id: currentUser.id,
        content: newMessage,
        created_at: data.created_at
      };
      
      // Update local state immediately
      setCanvasMessages(prev => [...prev, messageObject]);
      
      // Start loading state and show loading visualization
      log('Requesting visualization...');
      setIsLoading(true);
      
      // Reset template state
      setTemplateId(null);
      setTemplateProps(null);
      
      // Show loading visualization immediately for better UX
      const loadingHtml = createLoadingVisualization(newMessage);
      setHtmlContent(loadingHtml);
      setRenderMethod('fallback_iframe');
      
      // Request visualization directly from our API
      try {
        log('Sending request to /api/canvas/generate-visualization...');
        log('Request payload:', {
          canvasId,
          messageCount: canvasMessages.length + 1,
          promptLength: newMessage.length
        });
        
        const response = await fetch('/api/canvas/generate-visualization', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            canvasId,
            messages: [...canvasMessages, messageObject],
            prompt: newMessage
          }),
        });
        
        log('Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          log('Error response:', errorText);
          throw new Error(`Visualization request failed: ${errorText}`);
        }
        
        const result = await response.json();
        log('Visualization request result:', result);
        
        // Handle response based on renderMethod
        if (result.renderMethod === 'jsx' && result.templateId && result.data) {
          log('Received template-based visualization:', result.templateId);
          setTemplateId(result.templateId);
          setTemplateProps(result.data);
          setRenderMethod('jsx');
          setHtmlContent(null); // Clear any HTML content
          setIsLoading(false);
        } else if (result.html) {
          // Direct HTML rendering (fallback approach)
          log('HTML content received, length:', result.html.length);
          setHtmlContent(result.html);
          setRenderMethod('fallback_iframe');
          setTemplateId(null);
          setTemplateProps(null);
          setIsLoading(false);
        } else {
          log('Invalid response format:', result);
          throw new Error('Invalid response format from visualization API');
        }
      } catch (error: any) {
        console.error("Error requesting visualization:", error);
        log('Error details:', error.message);
        setVisualizationError(error.message || "Failed to generate visualization");
        setIsLoading(false);
        
        // Show error visualization
        setHtmlContent(createErrorVisualization(error.message || "Unknown error occurred"));
        setRenderMethod('fallback_iframe');
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      log('Error details:', error.message);
      setVisualizationError(error.message || "Failed to send message");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (lastMessage) {
      handleSendMessage(lastMessage.content);
    }
  }, [lastMessage]);

  // Listen for iframe messages
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

  log('Canvas messages count:', canvasMessages.length);
  log('Render method:', renderMethod);
  log('Template ID:', templateId);
  log('HTML content status:', htmlContent ? 'present' : 'not present');
  log('Loading status:', isLoading);
  log('Error status:', visualizationError ? 'error' : 'no error');


  return (
    <div className="flex flex-col h-full">
      {/* Main content area with visualization - extends to the top */}
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