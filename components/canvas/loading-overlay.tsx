"use client";

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = "Loading..." }: LoadingOverlayProps) {
  return (
    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card p-6 rounded-lg shadow-lg flex flex-col items-center border border-border">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-foreground font-medium">{message}</p>
      </div>
    </div>
  );
}