"use client";

import React, { Suspense } from 'react';
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
export default function TemplateLoader({ templateId, props, fallbackHtml }: TemplateLoaderProps) {
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

  // Handle template rendering based on ID
  switch (templateId) {
    case 'scheduler_template':
      return <Suspense fallback={<TemplateLoading name="Scheduler" />}><Scheduler {...props} /></Suspense>;
      
    case 'chart_template':
      return <Suspense fallback={<TemplateLoading name="Chart" />}><Chart {...props} /></Suspense>;
      
    case 'timeline_template':
      return <Suspense fallback={<TemplateLoading name="Timeline" />}><Timeline {...props} /></Suspense>;
      
    default:
      // Fallback for unknown templates
      return (
        <div className="flex items-center justify-center h-full p-8 text-center">
          <div className="max-w-md">
            <h3 className="text-lg font-medium mb-2">Template Not Found</h3>
            <p className="text-muted-foreground">
              The requested template &quot;{templateId}&quot; could not be loaded.
            </p>
          </div>
        </div>
      );
  }
} 