"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ErrorMessage({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/40 dark:bg-background/60 backdrop-blur-sm z-30">
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, type: "spring", damping: 20 }}
        className="w-full max-w-md"
      >
        <Card className="border-destructive/30 shadow-lg overflow-hidden">
          <div className="h-1.5 w-full bg-destructive" />
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <motion.svg
                  className="w-8 h-8 text-destructive"
                  viewBox="0 0 24 24"
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  initial={{ rotate: 90 }}
                  animate={{ rotate: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </motion.svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">Visualization Error</h3>
                <p className="text-muted-foreground">{message}</p>
              </div>
              <div className="flex gap-2 mt-2">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="border-border"
                >
                  Dismiss
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                >
                  Refresh Page
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}