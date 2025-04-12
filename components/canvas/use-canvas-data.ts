"use client";

import { useEffect, useState } from 'react';
import { CanvasMessage } from './canvas-utils';
import { SupabaseClient } from '@supabase/supabase-js';

type UseCanvasDataProps = {
  canvasId: string;
  setCanvasMessages: React.Dispatch<React.SetStateAction<CanvasMessage[]>>;
  setHtmlContent: React.Dispatch<React.SetStateAction<string | null>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setVisualizationError: React.Dispatch<React.SetStateAction<string | null>>;
  setTemplateId?: React.Dispatch<React.SetStateAction<string | null>>;
  setTemplateProps?: React.Dispatch<React.SetStateAction<any>>;
  setRenderMethod?: React.Dispatch<React.SetStateAction<'jsx' | 'fallback_iframe'>>;
  supabase: SupabaseClient;
};

export function useCanvasData({
  canvasId,
  setCanvasMessages,
  setHtmlContent,
  setIsLoading,
  setVisualizationError,
  setTemplateId,
  setTemplateProps,
  setRenderMethod,
  supabase
}: UseCanvasDataProps) {
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState<string | null>(null);

  // Function to fetch canvas messages
  const fetchMessages = async () => {
    try {
      let query = supabase
        .from('canvas_messages')
        .select('*')
        .eq('canvas_id', canvasId)
        .order('created_at', { ascending: true });

      // If we have a timestamp, only get messages after that time
      if (lastFetchTimestamp) {
        query = query.gt('created_at', lastFetchTimestamp);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      if (data && data.length > 0) {
        // Update timestamp to the most recent message
        setLastFetchTimestamp(data[data.length - 1].created_at);
        
        // If this is our first fetch, replace all messages
        // Otherwise, append the new messages
        if (lastFetchTimestamp === null) {
          setCanvasMessages(data as CanvasMessage[]);
        } else {
          setCanvasMessages(prev => [...prev, ...data as CanvasMessage[]]);
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Function to fetch visualizations
  const fetchVisualizations = async () => {
    try {
      let query = supabase
        .from('canvas_generations')
        .select('*')
        .eq('canvas_id', canvasId)
        .order('created_at', { ascending: false })
        .limit(1);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching visualizations:', error);
        return;
      }

      if (data && data.length > 0) {
        const generation = data[0];
        
        // Handle different rendering methods
        if (generation.render_method === 'jsx' && generation.template_id && generation.component_data) {
          console.log('Found template-based visualization:', generation.template_id);
          
          // Only update if we have the proper setters available
          if (setTemplateId && setTemplateProps && setRenderMethod) {
            // Check if props are valid
            try {
              if (generation.component_data && typeof generation.component_data === 'object') {
                // Ensure we have the required fields based on template type
                let hasRequiredFields = false;
                
                // Simple validation based on template type
                if (generation.template_id === 'chart_template') {
                  hasRequiredFields = generation.component_data.type && 
                                     generation.component_data.data &&
                                     generation.component_data.data.datasets;
                } else if (generation.template_id === 'scheduler_template') {
                  hasRequiredFields = generation.component_data.activities && 
                                     Array.isArray(generation.component_data.activities);
                } else if (generation.template_id === 'timeline_template') {
                  hasRequiredFields = generation.component_data.events && 
                                     Array.isArray(generation.component_data.events);
                } else {
                  // For unknown templates, just check if we have any properties
                  hasRequiredFields = Object.keys(generation.component_data).length > 0;
                }
                
                if (hasRequiredFields) {
                  setTemplateId(generation.template_id);
                  setTemplateProps(generation.component_data);
                  setRenderMethod('jsx');
                  setHtmlContent(null); // Clear any HTML content
                  setIsLoading(false);
                  if (setVisualizationError) {
                    setVisualizationError(null);
                  }
                  console.log('Successfully loaded template props from database');
                } else {
                  console.error('Template props from database missing required fields');
                  if (generation.html) {
                    console.log('Falling back to HTML content');
                    setHtmlContent(generation.html);
                    setTemplateId(null);
                    setTemplateProps(null);
                    setRenderMethod('fallback_iframe');
                  }
                }
              } else {
                console.error('Invalid template props from database:', generation.component_data);
                if (generation.html) {
                  console.log('Falling back to HTML content');
                  setHtmlContent(generation.html);
                  setTemplateId(null);
                  setTemplateProps(null);
                  setRenderMethod('fallback_iframe');
                }
              }
            } catch (error) {
              console.error('Error processing template props:', error);
              if (generation.html) {
                console.log('Falling back to HTML content');
                setHtmlContent(generation.html);
                setTemplateId(null);
                setTemplateProps(null);
                setRenderMethod('fallback_iframe');
              }
            }
          }
        } else if (generation.html) {
          console.log('Found HTML-based visualization');
          setHtmlContent(generation.html);
          
          // Clear template data if we have the setters
          if (setTemplateId && setTemplateProps && setRenderMethod) {
            setTemplateId(null);
            setTemplateProps(null);
            setRenderMethod('fallback_iframe');
          }
          
          setIsLoading(false);
          if (setVisualizationError) {
            setVisualizationError(null);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching visualizations:', error);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchMessages();
    fetchVisualizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasId]);

  // Set up polling for new messages and visualizations
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMessages();
      fetchVisualizations();
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasId, lastFetchTimestamp]);
}