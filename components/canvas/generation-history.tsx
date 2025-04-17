"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

// Define the Generation type to match CanvasGeneration
export interface Generation {
  id: string;
  canvas_id: string;
  created_by: string;
  template_id: string | null;
  component_code: string | null;
  component_data: any;
  html: string | null;
  confidence: number | null;
  render_method: 'jsx' | 'fallback_iframe' | null;
  summary: string | null;
  type: string | null;
  metadata: any;
  created_at: string;
  room_id: string;
  slug?: string;
  agent_expert_response?: string;
}

interface GenerationHistoryProps {
  roomId: string;
  activeGenerationId?: string | null;
  onSelectGeneration: (generation: Generation) => void;
}

export function GenerationHistory({
  roomId,
  activeGenerationId,
  onSelectGeneration
}: GenerationHistoryProps) {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  // Setup Supabase listener for generations
  useEffect(() => {
    if (!roomId) return;
    
    console.log('Setting up generations listener for room:', roomId);
    setIsLoading(true);

    // Initial fetch to get existing generations
    const fetchInitialGenerations = async () => {
      try {
        const { data, error } = await supabase
          .from("canvas_generations")
          .select("*")
          .eq("room_id", roomId)
          .order("created_at", { ascending: false });
          
        if (error) {
          console.error('Error fetching initial generations:', error);
          return;
        }
        
        console.log(`Fetched ${data?.length || 0} generations for room ${roomId}`);
        
        if (data && data.length > 0) {
          setGenerations(data);
          // Only set the first generation as active on initial load
          if (data.length > 0 && generations.length === 0) {
            onSelectGeneration(data[0]);
          }
        }
      } catch (err) {
        console.error('Error in fetchInitialGenerations:', err);
      } finally {
        setIsLoading(false);
      }
    };

    // Call initial fetch
    fetchInitialGenerations();

    // Set up real-time listener for new generations
    const subscription = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'canvas_generations',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('Received generation update:', payload);
          
          // Update the generations state based on the change type
          if (payload.eventType === 'INSERT') {
            const newGeneration = payload.new as Generation;
            
            // Check if this generation already exists in our list
            setGenerations(prev => {
              // Check if we already have this generation
              const exists = prev.some(g => g.id === newGeneration.id);
              if (exists) {
                // If it exists, update it
                return prev.map(g => g.id === newGeneration.id ? newGeneration : g);
              } else {
                // If it's new, add it to the top
                return [newGeneration, ...prev];
              }
            });
            
            // Set as active if it's the first one or if we don't have an active one
            if (generations.length === 0) {
              onSelectGeneration(newGeneration);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedGeneration = payload.new as Generation;
            setGenerations(prev => 
              prev.map(gen => gen.id === updatedGeneration.id ? updatedGeneration : gen)
            );
            
            // Parent component will handle updating the active generation if needed
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setGenerations(prev => {
              const filtered = prev.filter(gen => gen.id !== deletedId);
              
              // Parent component will handle selecting a new generation if needed
              
              return filtered;
            });
          }
        }
      )
      .subscribe();

    // Set up Pusher listener for new generations (if you're using Pusher)
    try {
      const Pusher = require('pusher-js');
      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: 'us3',
      });

      const channel = pusher.subscribe(`room-${roomId}`);

      // Listen for new generation notifications
      channel.bind('new-generation', async (data: any) => {
        console.log("New generation received:", data);

        try {
          const notificationData = typeof data === 'string' ? JSON.parse(data) : data;
          
          // Fetch the generation from the database
          const { data: generation, error } = await supabase
            .from('canvas_generations')
            .select('*')
            .eq('id', notificationData.generation_id)
            .single();

          if (error) {
            throw new Error(`Error fetching generation: ${error.message}`);
          }
          
          if (generation) {
            // Check if this generation already exists in our list
            setGenerations(prev => {
              // Check if we already have this generation
              const exists = prev.some(g => g.id === generation.id);
              if (exists) {
                // If it exists, update it
                return prev.map(g => g.id === generation.id ? generation : g);
              } else {
                // If it's new, add it to the top
                return [generation, ...prev].slice(0, 20);
              }
            });
            
            // Only set as active on first load
            if (generations.length === 0) {
              onSelectGeneration(generation);
            }
          } else {
            console.warn('Generation not found:', notificationData.generation_id);
          }
        } catch (error) {
          console.error('Error handling new generation notification:', error);
        }
      });

      // Listen for generation completed notifications
      channel.bind('generation-completed', async (data: any) => {
        console.log("Generation completed received:", data);

        try {
          const notificationData = typeof data === 'string' ? JSON.parse(data) : data;
          
          // Fetch the updated generation from the database
          const { data: updatedGeneration, error } = await supabase
            .from('canvas_generations')
            .select('*')
            .eq('id', notificationData.generation_id)
            .single();

          if (error) {
            throw new Error(`Error fetching updated generation: ${error.message}`);
          }
          
          if (updatedGeneration) {
            // Update the existing generation in the list
            setGenerations(prev => 
              prev.map(gen => gen.id === updatedGeneration.id ? updatedGeneration : gen)
            );
            
            // If this is the active generation, update it
            if (activeGenerationId === updatedGeneration.id) {
              onSelectGeneration(updatedGeneration);
            }
          } else {
            console.warn('Updated generation not found:', notificationData.generation_id);
          }
        } catch (error) {
          console.error('Error handling generation completed notification:', error);
        }
      });

      // Return cleanup function for Pusher
      return () => {
        console.log('Cleaning up generations listener');
        channel.unbind_all();
        pusher.unsubscribe(`room-${roomId}`);
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up Pusher:', error);
      
      // Return cleanup function for just Supabase if Pusher fails
      return () => {
        console.log('Cleaning up Supabase subscription');
        subscription.unsubscribe();
      };
    }
  }, [roomId]); // Remove activeGenerationId and onSelectGeneration from dependencies

  if (generations.length === 0 && !isLoading) {
    return (
      <div className="p-2  bg-card dark:bg-card text-muted-foreground text-sm text-center">
        You should generate something by chatting...
      </div>
    );
  }
  if (isLoading) return <div className="p-2 border-b border-border bg-card dark:bg-card">Loading generations...</div>;

  // Filter out any duplicate generations by ID
  const uniqueGenerations = generations.reduce((acc, current) => {
    const x = acc.find(item => item.id === current.id);
    if (!x) {
      return acc.concat([current]);
    } else {
      return acc;
    }
  }, [] as Generation[]);


  return (
    <div className="p-2">
      <div className="w-full overflow-x-auto scrollbar-hide" style={{ maxWidth: '100%', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <div className="flex flex-nowrap space-x-2 p-1" onWheel={(e) => {
          const container = e.currentTarget.parentElement;
          if (container) {
            container.scrollLeft += e.deltaY;
            e.preventDefault();
          }
        }}>
          {uniqueGenerations.map(generation => (
            <span
              key={generation.id}
              onClick={() => onSelectGeneration(generation)}
              className={`px-3 py-1 rounded-xl border dark:border-[#444] text-sm transition-colors cursor-pointer inline-block flex-shrink-0 ${
                activeGenerationId === generation.id 
                  ? "bg-primary text-primary-foreground font-medium" 
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              }`}
              title={generation.summary || new Date(generation.created_at).toLocaleString()}
            >
              {generation.slug || 'Gen'}
              {generation.metadata?.status === 'generating' && ' ⏳'}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
