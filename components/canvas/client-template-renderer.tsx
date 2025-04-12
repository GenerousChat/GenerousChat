"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import TemplateLoader from './template-loader';
import { Button } from '@/components/ui/button';

interface ClientTemplateRendererProps {
  templateId: string;
  props: any;
  onClose: () => void;
}

/**
 * Client-side component for rendering templates with appropriate props
 * Handles animation, UI controls, and dark mode
 */
export function ClientTemplateRenderer({ 
  templateId, 
  props,
  onClose
}: ClientTemplateRendererProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [rendererKey, setRendererKey] = useState<number>(1);
  const [hasError, setHasError] = useState<boolean>(false);

  // Check if props exist and have required fields
  useEffect(() => {
    // Reset error state when props change
    setHasError(false);
    
    // Force re-render of template loader when props change
    setRendererKey(prev => prev + 1);
    
    // Basic validation check
    if (!props || typeof props !== 'object' || Object.keys(props).length === 0) {
      console.error('Invalid props provided to ClientTemplateRenderer:', props);
      setHasError(true);
    }
  }, [props, templateId]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const toggleDebug = () => {
    setShowDebug(!showDebug);
  };

  // Handle errors in template rendering
  const handleError = () => {
    setHasError(true);
  };

  return (
    <div 
      className={`absolute inset-0 bg-background dark:bg-background z-10 transition-all duration-300 ${
        isFullscreen ? 'fixed top-0 left-0 right-0 bottom-0 z-50' : ''
      }`}
    >
      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 z-30 p-2 flex items-center justify-between bg-gradient-to-b from-background to-transparent">
        <div className="px-3 py-1.5 bg-card/90 dark:bg-card/80 backdrop-blur-sm rounded-lg border border-border/50 text-sm flex items-center shadow-sm">
          <span className="flex items-center">
            <span className={`h-2 w-2 ${hasError ? 'bg-red-500' : 'bg-green-500'} rounded-full mr-2 animate-pulse`}></span>
            <span className="text-foreground font-medium">{`Template: ${templateId}`}</span>
          </span>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={toggleDebug}
            variant="outline" 
            size="icon"
            className="h-8 w-8 bg-card/90 dark:bg-card/80 backdrop-blur-sm shadow-sm"
            title="Toggle debug info"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </Button>
          
          <Button
            onClick={toggleFullscreen}
            variant="outline" 
            size="icon"
            className="h-8 w-8 bg-card/90 dark:bg-card/80 backdrop-blur-sm shadow-sm"
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            )}
          </Button>
          
          <Button
            onClick={onClose}
            variant="outline"
            size="icon"
            className="h-8 w-8 bg-card/90 dark:bg-card/80 backdrop-blur-sm shadow-sm"
            title="Close visualization"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </Button>
        </div>
      </div>
      
      {/* Debug panel */}
      {showDebug && (
        <div className="absolute top-12 right-0 z-40 w-80 max-h-[60vh] overflow-auto bg-card/95 dark:bg-card/95 backdrop-blur-md p-3 rounded-l-lg border border-border shadow-lg text-xs font-mono">
          <h4 className="font-semibold mb-2 text-foreground">Template Debug Info</h4>
          <div className="mb-2">
            <span className="text-muted-foreground">Template ID: </span>
            <span className="text-foreground">{templateId}</span>
          </div>
          <div>
            <h5 className="font-semibold mb-1 text-foreground">Props:</h5>
            <pre className="p-2 bg-muted/50 rounded text-[10px] overflow-auto max-h-[300px]">
              {JSON.stringify(props, null, 2)}
            </pre>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="max-w-md w-full bg-card p-6 rounded-lg border border-destructive shadow-lg">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium">Template Rendering Error</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              There was a problem rendering the {templateId} template. This might be due to missing or invalid props.
            </p>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleDebug}
              >
                View Details
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Template content with animation */}
      <motion.div
        className="w-full h-full pt-12"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {!hasError && (
          <TemplateLoader
            key={rendererKey}
            templateId={templateId}
            props={props}
            onError={handleError}
          />
        )}
      </motion.div>
    </div>
  );
} 