"use client";

import React, { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Import templates dynamically
const Scheduler = dynamic(() => import('./templates/scheduler_template/preview').then(mod => ({ default: mod.Scheduler })), {
  loading: () => <TemplateLoading name="Scheduler" />,
  ssr: false
});

const Chart = dynamic(() => import('./templates/chart_template/preview').then(mod => ({ default: mod.Chart })), {
  loading: () => <TemplateLoading name="Chart" />,
  ssr: false
});

const Timeline = dynamic(() => import('./templates/timeline_template/preview').then(mod => ({ default: mod.Timeline })), {
  loading: () => <TemplateLoading name="Timeline" />,
  ssr: false
});

interface TemplateLoaderProps {
  templateId: string;
  props: any;
  fallbackHtml?: string;
  onError?: () => void;
}

function TemplateLoading({ name }: { name: string }) {
  return (
    <div className="p-8 flex flex-col items-center justify-center h-full">
      <div className="h-40 w-full mb-4 animate-pulse bg-muted rounded-md"></div>
      <div className="h-6 w-3/4 mb-2 animate-pulse bg-muted rounded-md"></div>
      <div className="h-6 w-1/2 animate-pulse bg-muted rounded-md"></div>
      <div className="mt-4 text-sm text-muted-foreground">Loading {name} template...</div>
    </div>
  );
}

/**
 * Dynamically loads and renders the appropriate template component
 */
export default function TemplateLoader({ templateId, props, fallbackHtml, onError }: TemplateLoaderProps) {
  // Add a state to track the template type if needed
  const [templateType, setTemplateType] = useState<string | null>(null);
  
  // Validate props and call onError if invalid
  useEffect(() => {
    try {
      if (!props || typeof props !== 'object' || Object.keys(props).length === 0) {
        console.error('Invalid props provided to TemplateLoader:', props);
        onError?.();
      }
      
      // Check if we have type information in the props
      if (props && props._templateType) {
        setTemplateType(props._templateType);
      }
    } catch (error) {
      console.error('Error validating props:', error);
      onError?.();
    }
  }, [props, onError]);

  // If fallback HTML is provided, render it in an iframe
  if (fallbackHtml) {
    return (
      <div className="w-full h-full relative">
        <iframe
          srcDoc={fallbackHtml}
          className="w-full h-full border-0"
          title="Visualization Fallback"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    );
  }

  // Handle template rendering based on ID or type
  try {
    // First try to match by ID for backward compatibility
    switch (templateId) {
      case 'scheduler_template':
        return (
          <Suspense fallback={<TemplateLoading name="Scheduler" />}>
            <Scheduler {...props} />
          </Suspense>
        );
        
      case 'chart_template':
      case '09f2d352-131f-4b1f-9a73-449fa8742742': // Explicitly handle the custom chart template
        return (
          <Suspense fallback={<TemplateLoading name="Chart" />}>
            <Chart {...props} />
          </Suspense>
        );
        
      case 'timeline_template':
        return (
          <Suspense fallback={<TemplateLoading name="Timeline" />}>
            <Timeline {...props} />
          </Suspense>
        );
    }
    
    // If ID doesn't match, try to match by type
    // This allows custom templates with UUID identifiers to use standard components
    const type = templateType || (props && props.type ? props.type : null);
    
    if (type === 'chart_template' || templateId.includes('chart')) {
      return (
        <Suspense fallback={<TemplateLoading name="Chart" />}>
          <Chart {...props} />
        </Suspense>
      );
    }
    
    if (type === 'scheduler_template' || templateId.includes('scheduler')) {
      return (
        <Suspense fallback={<TemplateLoading name="Scheduler" />}>
          <Scheduler {...props} />
        </Suspense>
      );
    }
    
    if (type === 'timeline_template' || templateId.includes('timeline')) {
      return (
        <Suspense fallback={<TemplateLoading name="Timeline" />}>
          <Timeline {...props} />
        </Suspense>
      );
    }
    
    // If we still can't determine the template, show the "not found" fallback
    setTimeout(() => onError?.(), 0);
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <div className="max-w-md">
          <h3 className="text-lg font-medium mb-2">Template Not Found</h3>
          <p className="text-muted-foreground">
            The requested template &quot;{templateId}&quot; could not be loaded.
            {templateType ? ` (Type: ${templateType})` : ''}
          </p>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error rendering template:', error);
    setTimeout(() => onError?.(), 0);
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <div className="max-w-md">
          <h3 className="text-lg font-medium mb-2">Template Error</h3>
          <p className="text-muted-foreground">
            An error occurred while rendering the template.
          </p>
        </div>
      </div>
    );
  }
} 