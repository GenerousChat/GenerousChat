"use client";

import { ScrollArea } from "@/components/ui/scroll-area";

export interface Generation {
  id: string;
  summary?: string | null;
  created_at: string;
  [key: string]: any; // Allow for additional properties
}

interface GenerationHistoryProps {
  generations: Generation[];
  activeGenerationId?: string | null;
  onSelectGeneration: (generation: Generation) => void;
}

export function GenerationHistory({
  generations,
  activeGenerationId,
  onSelectGeneration
}: GenerationHistoryProps) {
  if (generations.length === 0) return null;
  
  return (
    <div className="p-2 border-b border-border bg-card dark:bg-card">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex space-x-2 p-1">
          {generations.map(generation => (
            <button
              key={generation.id}
              onClick={() => onSelectGeneration(generation)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                activeGenerationId === generation.id 
                  ? "bg-primary text-primary-foreground font-medium" 
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              }`}
              title={generation.summary || new Date(generation.created_at).toLocaleString()}
            >
              {generation.summary 
                ? (generation.summary.length > 20 
                    ? `${generation.summary.substring(0, 20)}...` 
                    : generation.summary)
                : new Date(generation.created_at).toLocaleTimeString()}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
