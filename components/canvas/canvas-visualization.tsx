"use client";

import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function CanvasVisualization({
  htmlContent,
  generationId
}: {
  htmlContent: string | null;
  generationId: string | null |undefined;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update isFullscreen state when fullscreen changes from browser controls
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      // Enter fullscreen
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      // Exit fullscreen
      document.exitFullscreen().catch(err => {
        console.error(`Error attempting to exit fullscreen: ${err.message}`);
      });
    }
  };

  if (!htmlContent) return null;

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 bg-background dark:bg-background z-10 transition-all duration-300 flex flex-col"
    >
      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 z-30 p-2 flex items-center justify-between">
        <div></div> {/* Empty div to maintain justify-between */}
        
        <div className="flex gap-2">
          {generationId && (
            <>
              <Button
                asChild
                variant="ghost" 
                size="icon"
                className="h-8 w-8 bg-white dark:bg-white dark:invert border-0"
              >
                <Link href={`/api/generation/${generationId}`} target="_blank">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 dark:invert" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </Link>
              </Button>
              
              <Button
                asChild
                variant="ghost" 
                size="icon"
                className="h-8 w-8 bg-white dark:bg-white dark:invert border-0"
              >
                <Link href={`/api/generation/${generationId}/code`} target="_blank">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 dark:invert" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
                  </svg>
                </Link>
              </Button>
            </>
          )}
          
          <Button
            onClick={toggleFullscreen}
            variant="ghost" 
            size="icon"
            className="h-8 w-8 bg-white dark:bg-white dark:invert border-0"
          >
            {isFullscreen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 dark:invert" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 dark:invert" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            )}
          </Button>
          
        </div>
      </div>
      

      {/* Wrapper for iframe with padding and background */}
      <div className="flex-grow p-5 bg-[url('/canvas_loading.png')] bg-cover bg-center rounded-lg">
        <iframe
          srcDoc={htmlContent}
          // Iframe fills the padded wrapper, with rounded corners
          className="w-full h-full border-0 rounded-md opacity-95"
          allow="accelerometer; autoplay; camera; clipboard-read; clipboard-write; display-capture; encrypted-media; fullscreen; gamepad; geolocation; gyroscope; hid; identity-credentials-get; idle-detection; interest-cohort; keyboard-map; magnetometer; microphone; midi; payment; picture-in-picture; publickey-credentials-get; screen-wake-lock; serial; storage-access; usb; web-share; xr-spatial-tracking"
          title="Conversation Visualization"
        />
      </div>
    </div>
  );
}