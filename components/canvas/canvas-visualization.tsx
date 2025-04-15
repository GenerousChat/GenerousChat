"use client";

import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function CanvasVisualization({
  htmlContent,
  onClose,
  generationId
}: {
  htmlContent: string | null;
  onClose: () => void;
  generationId: string | null;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!htmlContent) return null;

  return (
    <div 
      className={`absolute inset-0 bg-background dark:bg-background z-10 transition-all duration-300 ${
        isFullscreen ? 'fixed top-0 left-0 right-0 bottom-0 z-50' : ''
      }`}
    >
      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 z-30 p-2 flex items-center justify-between bg-gradient-to-b from-background to-transparent">
        
        <div className="flex gap-2">
          {generationId && (
            <Button
              asChild
              variant="outline" 
              size="icon"
              className="h-8 w-8 bg-card/90 dark:bg-card/80 backdrop-blur-sm shadow-sm"
            >
              <Link href={`/api/generation/${generationId}`} target="_blank">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            </Button>
          )}
          
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
      

      {/* Iframe container with animation */}
      <motion.div
        className="w-full h-full"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <iframe
          srcDoc={htmlContent}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-downloads"
          allow="camera; microphone; geolocation; fullscreen"
          title="Conversation Visualization"
        />
        
      </motion.div>
    </div>
  );
}