"use client";

import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/utils/supabase/client";
import { CanvasGeneration } from './canvas';

// Use the CanvasGeneration type for our component
export type Generation = CanvasGeneration;

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
          // If there's no active generation yet, set the most recent one
          if (!activeGenerationId) {
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
            setGenerations(prev => [newGeneration, ...prev]);
            
            // Set as active if it's the first one or if we don't have an active one
            if (!activeGenerationId || generations.length === 0) {
              onSelectGeneration(newGeneration);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedGeneration = payload.new as Generation;
            setGenerations(prev => 
              prev.map(gen => gen.id === updatedGeneration.id ? updatedGeneration : gen)
            );
            
            // If this is the active generation, update the displayed content
            if (activeGenerationId === updatedGeneration.id) {
              onSelectGeneration(updatedGeneration);
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setGenerations(prev => {
              const filtered = prev.filter(gen => gen.id !== deletedId);
              
              // If the active generation was deleted, set a new active one
              if (activeGenerationId === deletedId && filtered.length > 0) {
                onSelectGeneration(filtered[0]);
              }
              
              return filtered;
            });
          }
        }
      )
      .subscribe();

    // Set up Pusher listener for new generations (if you're using Pusher)
    try {
      const Pusher = require('pusher-js');
      const pusher = new Pusher('96f9360f34a831ca1901', {
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
            // Add the new generation to the list
            setGenerations(prev => [generation, ...prev].slice(0, 20));
            
            // Set the most recent generation as active if there's no active one
            if (!activeGenerationId) {
              onSelectGeneration(generation);
            }
          } else {
            console.warn('Generation not found:', notificationData.generation_id);
          }
        } catch (error) {
          console.error('Error handling new generation notification:', error);
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
  }, [roomId, activeGenerationId, onSelectGeneration]);

  if (generations.length === 0 && !isLoading) return null;
  if (isLoading) return <div className="p-2 border-b border-border bg-card dark:bg-card">Loading generations...</div>;

  return (
    <div className="p-2 border-b border-border bg-card dark:bg-card">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex space-x-2 p-1">
          {generations.map(generation => (
            <span
              key={generation.id}
              onClick={() => onSelectGeneration(generation)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                activeGenerationId === generation.id 
                  ? "bg-primary text-primary-foreground font-medium" 
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              }`}
              title={generation.summary || new Date(generation.created_at).toLocaleString()}
            >
              {generation.slug || 'Gen'}
            </span>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
