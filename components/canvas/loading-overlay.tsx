"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";

export function LoadingOverlay({
  message = "Loading..."
}: {
  message: string;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/40 dark:bg-background/60 backdrop-blur-sm z-30">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="shadow-lg border-border overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="relative">
                <svg 
                  className="w-16 h-16 text-muted-foreground" 
                  viewBox="0 0 100 100" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle 
                    cx="50" cy="50" r="45" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="8" 
                    strokeOpacity="0.2" 
                  />
                  <motion.circle 
                    cx="50" cy="50" r="45" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="8" 
                    strokeLinecap="round"
                    strokeDasharray="283"
                    strokeDashoffset="283"
                    animate={{
                      strokeDashoffset: [283, 0],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div 
                    className="w-8 h-8 rounded-full bg-primary"
                    animate={{ 
                      scale: [0.5, 1, 0.5],
                      opacity: [0.2, 1, 0.2],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </div>
              </div>
              <div>
                <p className="text-lg font-medium text-foreground">{message}</p>
                <p className="text-sm text-muted-foreground mt-1">This may take a moment...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}