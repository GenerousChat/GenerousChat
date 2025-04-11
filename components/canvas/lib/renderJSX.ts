"use client";

import React, { useState, useEffect } from 'react';

/**
 * Client-side JSX renderer using dynamic component loading
 * Handles rendering, error states, and loading states for components
 */
export function useJSXRenderer(Component: React.ComponentType<any> | null, props: any) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Reset error and set loading state when Component or props change
  useEffect(() => {
    setError(null);
    setLoading(true);
    
    // Use a short timeout to allow the component to initialize
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 100);
    
    return () => clearTimeout(timeout);
  }, [Component, props]);

  /**
   * Renders the component with the provided props
   * Handles loading states and error rendering
   */
  const render = () => {
    if (loading) {
      return React.createElement(
        "div", 
        { className: "flex items-center justify-center p-4 rounded-md bg-muted/20 border border-border min-h-[100px]" },
        React.createElement(
          "div", 
          { className: "flex items-center space-x-2" },
          React.createElement("div", { className: "h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" }),
          React.createElement("p", { className: "text-sm text-muted-foreground" }, "Loading component...")
        )
      );
    }

    if (error) {
      return React.createElement(
        "div", 
        { className: "p-4 bg-destructive/10 border border-destructive/30 rounded-md" },
        React.createElement("h3", { className: "text-sm font-medium text-destructive mb-1" }, "Rendering Error"),
        React.createElement("p", { className: "text-sm text-destructive/80" }, error)
      );
    }

    if (!Component) {
      return React.createElement(
        "div", 
        { className: "p-4 bg-muted/20 border border-border rounded-md" },
        React.createElement("p", { className: "text-sm text-muted-foreground" }, "No component available")
      );
    }

    try {
      // Render the component with the provided props
      return React.createElement(Component, props);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      // Set the error for future renders
      setError(errorMessage);
      
      // Return an immediate error rendering
      return React.createElement(
        "div", 
        { className: "p-4 bg-destructive/10 border border-destructive/30 rounded-md" },
        React.createElement("h3", { className: "text-sm font-medium text-destructive mb-1" }, "Rendering Error"),
        React.createElement("p", { className: "text-sm text-destructive/80" }, `Error rendering component: ${errorMessage}`)
      );
    }
  };

  return {
    error,
    loading,
    render
  };
} 