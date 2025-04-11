"use client";

import React, { useState } from 'react';
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

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
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
            <span className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            <span className="text-foreground font-medium">{`Template: ${templateId}`}</span>
          </span>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={toggleFullscreen}
            variant="outline" 
            size="icon"
            className="h-8 w-8 bg-card/90 dark:bg-card/80 backdrop-blur-sm shadow-sm"
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
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </Button>
        </div>
      </div>
      
      {/* Template content with animation */}
      <motion.div
        className="w-full h-full pt-12"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <TemplateLoader
          templateId={templateId}
          props={props}
        />
      </motion.div>
    </div>
  );
} 