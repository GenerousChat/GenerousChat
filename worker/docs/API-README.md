# Canvas Visualization API Documentation

This README documents the Canvas Visualization API system, which generates dynamic, interactive visualizations based on user prompts using OpenAI's GPT models.

## Overview

The Canvas Visualization API allows users to send text prompts and receive HTML-based interactive visualizations in response. The system directly integrates with OpenAI's powerful language models to generate custom HTML, CSS, and JavaScript visualizations that respond to user requests.

## Architecture

The system uses a simplified architecture with the following components:

1. **Frontend Canvas Component** - React component that handles user input and displays visualizations
2. **API Routes** - Next.js API routes that process requests and communicate with OpenAI
3. **Database** - Supabase for storing messages, visualizations, and user data
4. **AI Integration** - Direct integration with OpenAI via AI SDK

## API Endpoints

### 1. `/api/canvas/generate-visualization`

Generates HTML visualizations from user prompts using OpenAI.

**Method:** `POST`

**Request Body:**
```json
{
  "canvasId": "unique-canvas-identifier",
  "messages": [
    {
      "id": "message-id",
      "user_id": "user-id",
      "content": "previous message content",
      "created_at": "timestamp"
    }
  ],
  "prompt": "current user message/prompt"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Visualization generated successfully",
  "html": "<html>...</html>",
  "generation_id": "generation-uuid"
}
```

**Error Response:**
```json
{
  "error": "Error message"
}
```

### 2. `/api/canvas-element`

Stores canvas elements (messages, drawing elements, etc.) in the database.

**Method:** `POST`

**Request Body (for messages):**
```json
{
  "canvasId": "unique-canvas-identifier",
  "type": "message",
  "message": {
    "id": "message-id",
    "user_id": "user-id", 
    "content": "message content",
    "created_at": "timestamp"
  }
}
```

**Request Body (for other elements):**
```json
{
  "canvasId": "unique-canvas-identifier",
  "element": {
    "type": "element-type",
    "properties": {}
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Canvas message/element stored",
  "messageId": "message-id" // or "element": {...}
}
```

## Data Flow

1. **User Input**:
   - User enters a prompt in the Canvas component
   - Frontend saves message to Supabase database
   - Frontend displays a loading visualization

2. **Visualization Generation**:
   - Frontend sends request to `/api/canvas/generate-visualization`
   - API authenticates user with Supabase
   - API formats prompt and conversation history
   - API calls OpenAI with the AI SDK
   - OpenAI generates HTML content
   - API stores the visualization in Supabase
   - API returns HTML directly in response

3. **Rendering**:
   - Frontend receives HTML and renders it in an iframe
   - User can interact with the visualization

## Database Schema

### 1. `canvas_messages` Table

Stores messages for each canvas session:

```sql
CREATE TABLE canvas_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canvas_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. `canvas_generations` Table

Stores generated visualizations:

```sql
CREATE TABLE canvas_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canvas_id TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  html TEXT NOT NULL,
  summary TEXT,
  type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. `canvas_elements` Table

Stores other canvas elements:

```sql
CREATE TABLE canvas_elements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canvas_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL,
  properties JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Authentication

All API endpoints require authentication using Supabase Auth. User identity is verified through the Next.js server component's Supabase client. Unauthenticated requests receive a 401 response.

## Environment Variables

Required environment variables:

```
# Supabase credentials
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"

# OpenAI credentials
OPENAI_API_KEY="your-openai-api-key"
```

## Frontend Integration

The Canvas component in `components/canvas/canvas.tsx` provides a complete UI for interacting with the Canvas API. The component:

1. Maintains state for messages, loading, and errors
2. Uses the `useCanvasData` hook to poll for new data
3. Sends requests to the API routes
4. Displays visualizations in an iframe

## Error Handling

The system handles errors at multiple levels:

1. **API Errors** - Return appropriate HTTP status codes and error messages
2. **OpenAI Errors** - Fall back to a simple visualization with error details
3. **Database Errors** - Logged and returned as 500 responses
4. **Frontend Errors** - Display error messages to the user

## Visualization Generation

The HTML generation prompt instructs OpenAI to:

1. Analyze conversation context for build/create/generate requests
2. Select appropriate technology (D3.js, Chart.js, Three.js, etc.)
3. Generate responsive HTML, CSS, and JavaScript
4. Ensure visualization works well in the sidebar panel
5. Add interactivity and annotations as appropriate

## Fallback Mechanism

If visualization generation fails, the system generates a simple fallback HTML that:

1. Shows an error message
2. Displays the original prompt
3. Indicates the number of messages in the conversation
4. Provides a close button to dismiss the visualization

## Debugging

The API includes extensive logging that can be enabled to debug issues:

1. Server-side logs show API calls, authentication, and OpenAI responses
2. Client-side logs show requests, responses, and rendering status

## Performance Considerations

1. HTML generation can take several seconds depending on OpenAI's response time
2. Visualizations are stored in the database to avoid regeneration
3. The frontend shows loading states for better user experience
4. Polling is used to check for updates (with a 3-second interval)

## Future Improvements

1. Add WebSocket support for real-time updates
2. Implement caching for frequently requested visualizations
3. Add visualization versioning and history
4. Support collaborative editing of visualizations
5. Add analytics to track visualization performance and usage