"use client";

import { useEffect, useState } from 'react';
import Pusher, { Channel } from 'pusher-js';
import { CanvasMessage } from './canvas-utils';
import { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';

type UsePusherChannelProps = {
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

// Initialize Pusher with environment variables
let pusher: Pusher | null = null;

// Hook for subscribing to a Pusher channel
export function usePusherChannel(channelName: string) {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    async function setupPusher() {
      try {
        // Initialize Pusher if not already done
        if (!pusher) {
          // Get Pusher credentials from Supabase
          const supabase = createClient();
          const { data, error } = await supabase.functions.invoke('get-pusher-credentials');
          
          if (error) {
            throw new Error(`Failed to get Pusher credentials: ${error.message}`);
          }
          
          const { key, cluster } = data;
          
          if (!key || !cluster) {
            throw new Error('Missing Pusher credentials');
          }
          
          pusher = new Pusher(key, {
            cluster,
            forceTLS: true
          });
        }
        
        // Subscribe to the specified channel
        const newChannel = pusher.subscribe(channelName);
        setChannel(newChannel);
        
        // Set up connection event handlers
        newChannel.bind('pusher:subscription_succeeded', () => {
          setIsConnected(true);
        });
        
        newChannel.bind('pusher:subscription_error', (error: any) => {
          setError(new Error(`Subscription error: ${error}`));
          setIsConnected(false);
        });
        
        return () => {
          if (newChannel) {
            pusher?.unsubscribe(channelName);
          }
        };
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsConnected(false);
      }
    }
    
    setupPusher();
    
    return () => {
      if (channel) {
        pusher?.unsubscribe(channelName);
        setChannel(null);
      }
    };
  }, [channelName]);
  
  return { channel, isConnected, error };
}

export function usePusherChannelForCanvas({
  canvasId,
  setCanvasMessages,
  setHtmlContent,
  setIsLoading,
  setVisualizationError,
  setTemplateId,
  setTemplateProps,
  setRenderMethod,
  supabase
}: UsePusherChannelProps) {
  useEffect(() => {
    // Initialize Pusher
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
    });

    // Subscribe to the canvas channel
    const channel = pusher.subscribe(`canvas-${canvasId}`);

    // Handle real-time visualization updates
    channel.bind('visualization', (data: { 
      html?: string;
      templateId?: string;
      data?: any;
      renderMethod?: 'jsx' | 'fallback_iframe';
    }) => {
      console.log('Received visualization from Pusher:', data);
      
      // Handle template-based visualizations
      if (data.renderMethod === 'jsx' && data.templateId && data.data) {
        console.log('Received template-based visualization:', data.templateId);
        
        // Only update if we have the proper setters available
        if (setTemplateId && setTemplateProps && setRenderMethod) {
          setTemplateId(data.templateId);
          setTemplateProps(data.data);
          setRenderMethod('jsx');
          setHtmlContent(null); // Clear any HTML content
          setIsLoading(false);
        }
      } 
      // Handle HTML-based visualizations
      else if (data.html) {
        console.log('Received HTML visualization');
        setHtmlContent(data.html);
        
        // Clear template data if we have the setters
        if (setTemplateId && setTemplateProps && setRenderMethod) {
          setTemplateId(null);
          setTemplateProps(null);
          setRenderMethod('fallback_iframe');
        }
        
        setIsLoading(false);
      }
    });

    // Handle real-time message updates
    channel.bind('message', (data: { message: CanvasMessage }) => {
      console.log('Received message from Pusher:', data);
      setCanvasMessages(prev => [...prev, data.message]);
    });

    // Handle real-time error notifications
    channel.bind('error', (data: { message: string }) => {
      console.error('Received error from Pusher:', data);
      setVisualizationError(data.message);
      setIsLoading(false);
    });

    // Load existing messages on first render
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('canvas_messages')
          .select('*')
          .eq('canvas_id', canvasId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching messages:', error);
          return;
        }

        if (data && data.length > 0) {
          setCanvasMessages(data as CanvasMessage[]);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();

    // Clean up on unmount
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`canvas-${canvasId}`);
    };
  }, [canvasId, setCanvasMessages, setHtmlContent, setIsLoading, setVisualizationError, setTemplateId, setTemplateProps, setRenderMethod, supabase]);
}