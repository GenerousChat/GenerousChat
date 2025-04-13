# Canvas Component Rework PRD

## Overview

This document outlines the requirements for reworking the Canvas component to leverage the existing `canvas_generation` schema. The new implementation will focus on retrieving and displaying generations based on `room_id` rather than generating new visualizations via API calls.

## Schema Reference

### `canvas_generation` Table

| Column | Type | Default Value | Primary |
|--------|------|--------------|---------|
| id | uuid | uuid_generate_v4() | ✅ |
| canvas_id | text | NULL | |
| created_by | uuid | NULL | |
| template_id | text | NULL | ✅ |
| component_code | text | NULL | ✅ |
| component_data | jsonb | NULL | ✅ |
| html | text | NULL | ✅ |
| confidence | float8 | NULL | ✅ |
| render_method | text | NULL | |
| summary | text | NULL | ✅ |
| type | text | NULL | |
| metadata | jsonb | NULL | ✅ |
| created_at | timestamptz | now() | ✅ |
| room_id | text | NULL | ✅ |

## Key Requirements

### 1. Generation Retrieval and Display

- **Replace API Calls**: Remove all API calls to generate visualizations as the component will now only retrieve and display existing generations.
- **Room-Based Retrieval**: Use `room_id` as the primary identifier to retrieve generations.
- **Latest Generation Display**: By default, display the most recent generation for the current `room_id`.

### 2. Generation History UI

- **History List**: Add a UI component at the top of the file that displays all generations for the current `room_id`.
- **Click-Through Navigation**: Allow users to click on any generation in the history to view it.
- **Visual Indicators**: Clearly indicate which generation is currently being displayed.
- **Sorting**: Sort generations by `created_at` timestamp (newest to oldest).

### 3. Rendering Logic

- **Render Method Support**: Maintain support for different rendering methods (`jsx`, `fallback_iframe`) as specified in the generation record.
- **Template-Based Rendering**: For template-based visualizations, use the `template_id` and `component_data` fields.
- **HTML Fallback**: For HTML-based visualizations, use the `html` field.

## Component Flow

1. Component receives `room_id` as a prop
2. On mount, query Supabase for all generations associated with this `room_id`
3. Display the history list at the top of the component
4. By default, render the most recent generation
5. When a user selects a different generation from the history, display that generation instead

## Implementation Guidelines

### Data Subscription

```typescript
// Example of setting up a Supabase listener for canvas generations
const setupGenerationsListener = (roomId: string, setGenerations) => {
  // Initial fetch to get existing generations
  const fetchInitialGenerations = async () => {
    const { data, error } = await supabase
      .from("canvas_generation")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });
      
    if (error) {
      console.error("Error fetching initial generations:", error);
      return;
    }
    
    setGenerations(data || []);
  };

  // Call initial fetch
  fetchInitialGenerations();

  // Set up real-time listener for new generations
  const subscription = supabase
    .channel(`room-${roomId}-generations`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'canvas_generation',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        // Update the generations state based on the change type
        if (payload.eventType === 'INSERT') {
          setGenerations(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setGenerations(prev => 
            prev.map(gen => gen.id === payload.new.id ? payload.new : gen)
          );
        } else if (payload.eventType === 'DELETE') {
          setGenerations(prev => 
            prev.filter(gen => gen.id !== payload.old.id)
          );
        }
      }
    )
    .subscribe();

  // Return cleanup function to unsubscribe
  return () => {
    subscription.unsubscribe();
  };
};
```

### UI Components

#### Generation History

```tsx
// Example of Generation History component
const GenerationHistory = ({ 
  generations, 
  activeGenerationId, 
  onSelectGeneration 
}) => {
  return (
    <div className="generation-history-container p-2 overflow-x-auto">
      <div className="flex space-x-2">
        {generations.map(generation => (
          <button
            key={generation.id}
            className={`px-3 py-1 rounded text-sm ${
              generation.id === activeGenerationId 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            }`}
            onClick={() => onSelectGeneration(generation)}
          >
            {generation.summary || new Date(generation.created_at).toLocaleString()}
          </button>
        ))}
      </div>
    </div>
  );
};
```

## Performance Considerations

- **Pagination**: If a room has many generations, implement pagination for the history list
- **Lazy Loading**: Consider lazy loading generation content, especially for HTML content
- **Caching**: Cache retrieved generations to minimize database queries

## Migration Plan

1. Update the Canvas component to accept `room_id` as a prop
2. Implement the generation retrieval logic
3. Add the generation history UI component
4. Remove visualization generation code and API calls
5. Update the rendering logic to use retrieved generations
6. Add error handling for cases when no generations exist for a room

## Success Metrics

- **Load Time**: The component should load faster by eliminating generation API calls
- **User Interaction**: Measure how often users switch between different generations
- **Error Rate**: Monitor for any failures in retrieving or rendering generations
