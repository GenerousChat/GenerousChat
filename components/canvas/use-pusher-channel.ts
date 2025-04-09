"use client";

import { useEffect } from 'react';
import Pusher from 'pusher-js';
import { CanvasMessage } from './canvas-utils';
import { SupabaseClient } from '@supabase/supabase-js';

type UsePusherChannelProps = {
  canvasId: string;
  setCanvasMessages: React.Dispatch<React.SetStateAction<CanvasMessage[]>>;
  setHtmlContent: React.Dispatch<React.SetStateAction<string | null>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setVisualizationError: React.Dispatch<React.SetStateAction<string | null>>;
  supabase: SupabaseClient;
};

export function usePusherChannel({
  canvasId,
  setCanvasMessages,
  setHtmlContent,
  setIsLoading,
  setVisualizationError,
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
    channel.bind('visualization', (data: { html: string }) => {
      console.log('Received visualization from Pusher:', data);
      if (data.html) {
        setHtmlContent(data.html);
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
  }, [canvasId, setCanvasMessages, setHtmlContent, setIsLoading, setVisualizationError, supabase]);
}