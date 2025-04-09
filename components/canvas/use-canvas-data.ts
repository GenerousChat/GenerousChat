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
  supabase: SupabaseClient;
};

export function useCanvasData({
  canvasId,
  setCanvasMessages,
  setHtmlContent,
  setIsLoading,
  setVisualizationError,
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
        // Only update HTML content if we're not currently loading a visualization
        const isCurrentlyLoading = false; // We'll grab the current loading state from React state in a moment
        if (data[0].html) {
          setHtmlContent(data[0].html);
          setIsLoading(false); // Turn off loading state once visualization is loaded
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