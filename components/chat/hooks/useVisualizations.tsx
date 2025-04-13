import { useState, useEffect, useCallback } from 'react';
import { createClient } from "@/utils/supabase/client";
import Pusher from 'pusher-js';

export function useVisualizations(roomId: string) {
  const [latestHtmlContent, setLatestHtmlContent] = useState<string | null>(null);
  const [generations, setGenerations] = useState<any[]>([]);
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null);
  const supabase = createClient();

  // Fetch generations for the room
  const fetchGenerations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('canvas_generations')
        .select('*')
        .eq('room_id', roomId)
        .eq('type', 'visualization')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching generations:', error);
        return;
      }

      setGenerations(data || []);
      
      // If there are generations and none is selected, select the latest one
      if (data?.length > 0 && !selectedGenerationId) {
        setSelectedGenerationId(data[0].id);
        setLatestHtmlContent(data[0].html);
      }
    } catch (error) {
      console.error('Error fetching generations:', error);
    }
  }, [roomId, selectedGenerationId, supabase]);

  // Load generations when room loads
  useEffect(() => {
    fetchGenerations();
  }, [fetchGenerations]);

  // Set up Pusher subscription for real-time visualization updates
  useEffect(() => {
    const pusher = new Pusher('96f9360f34a831ca1901', {
      cluster: 'us3',
    });

    const channel = pusher.subscribe(`room-${roomId}`);

    // Listen for new generation notifications
    channel.bind('new-generation', async (data: any) => {
      console.log("New generation received:", data);
      console.log("New generation received:", data);
      console.log("New generation received:", data);
      console.log("New generation received:", data);
      console.log("New generation received:", data);
      console.log("New generation received:", data);
      console.log("New generation received:", data);
      console.log("New generation received:", data);
      console.log("New generation received:", data);
      console.log("New generation received:", data);
      console.log("New generation received:", data);
      console.log("New generation received:", data);
      try {
        const notificationData = typeof data === 'string' ? JSON.parse(data) : data;
        
        // Fetch the generation from the database
        const { data: generation, error } = await supabase
          .from('canvas_generations')
          .select('*')
          .eq('id', notificationData.generation_id)
          .single();

        console.log("ASDASDASDSAS");
        console.log("ASDASDASDSAS");
        console.log("ASDASDASDSAS");
        console.log("ASDASDASDSAS" , {generation, error});

        if (error) {
          throw new Error(`Error fetching generation: ${error.message}`);
        }
        
        if (generation?.html) {
          // Add the new generation to the list and select it
          setGenerations(prev => [generation, ...prev].slice(0, 20));
          setSelectedGenerationId(generation.id);
          setLatestHtmlContent(generation.html);
        } else {
          console.warn('Generation found but no html field:', generation);
        }
      } catch (error) {
        console.error('Error handling new generation notification:', error);
      }
    });
    
    // Also keep the old event handler for backward compatibility
    channel.bind('html-visualization', (data: any) => {
      try {
        const visualizationData = typeof data === 'string' ? JSON.parse(data) : data;
        
        // Update the visualization panel with the HTML content
        if (visualizationData.html) {
          setLatestHtmlContent(visualizationData.html);
        } else {
          console.warn('HTML visualization received but no html field found:', visualizationData);
        }
      } catch (error) {
        console.error("Error processing HTML visualization:", error);
      }
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`room-${roomId}`);
    };
  }, [roomId, supabase]);

  // Default HTML content for visualization
  const defaultHtmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body {
        background-color: #f9fafb;
        font-family: Arial, sans-serif;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #334155;
      }
      .container {
        max-width: 100%;
        background: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        text-align: center;
      }
      h2 {
        margin-top: 0;
        color: #3b82f6;
      }
      p {
        line-height: 1.6;
        margin-bottom: 0;
      }
      .pulse {
        animation: pulse 2s infinite;
      }
      @keyframes pulse {
        0% { opacity: 0.6; }
        50% { opacity: 1; }
        100% { opacity: 0.6; }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>Chat Visualization</h2>
      <p class="pulse">As your conversation evolves, AI will occasionally generate visual summaries that will appear here.</p>
    </div>
  </body>
  </html>
  `;

  return {
    latestHtmlContent,
    defaultHtmlContent,
    generations,
    selectedGenerationId,
    setSelectedGenerationId,
    setLatestHtmlContent
  };
}
