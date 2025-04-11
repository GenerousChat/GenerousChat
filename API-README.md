# Canvas Visualization API Documentation

This README documents the Canvas Visualization API system, which generates dynamic, interactive visualizations based on user prompts using OpenAI's GPT models and a template-based architecture.

## Overview

The Canvas Visualization API allows users to send text prompts and receive interactive React component visualizations in response. The system intelligently selects appropriate templates based on user intent, generates data that fits these templates, validates the data with Zod schemas, and renders JSX components using Babel.

## Architecture

The system uses a modular architecture with the following components:

1. **Frontend Canvas Component** - React component that handles user input and displays visualizations
2. **Template System** - Collection of reusable templates with Zod validation schemas
3. **API Routes** - Next.js API routes that process requests and communicate with OpenAI
4. **Database** - Supabase for storing templates, tools, messages, visualizations, and user data
5. **AI Integration** - Direct integration with OpenAI via AI SDK
6. **JSX Renderer** - Babel-based transpilation and execution of JSX in a sandbox

## API Endpoints

### 1. `/api/canvas/generate-visualization`

Analyzes user prompts, selects appropriate templates, and generates visualizations.

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
  "templateId": "scheduler_template",
  "confidence": 0.87,
  "renderMethod": "jsx",
  "component": "const SchedulerComponent = (props) => { /* component code */ }",
  "data": { /* component props */ },
  "generation_id": "generation-uuid"
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "fallback": true,
  "html": "<html>...</html>" // Fallback HTML if available
}
```

### 2. `/api/canvas/templates`

Lists available visualization templates.

**Method:** `GET`

**Response:**
```json
{
  "templates": [
    {
      "id": "scheduler_template",
      "name": "Weekly Scheduler",
      "description": "Generates a weekly schedule UI with date + label items",
      "tags": ["calendar", "schedule", "planner"],
      "confidenceThreshold": 0.75
    }
  ]
}
```

### 3. `/api/canvas/template-preview`

Generates a preview using a specific template.

**Method:** `POST`

**Request Body:**
```json
{
  "templateId": "scheduler_template",
  "prompt": "Make me a workout schedule for the week"
}
```

**Response:**
```json
{
  "success": true,
  "component": "const PreviewComponent = (props) => { /* component code */ }",
  "data": { /* example data */ }
}
```

### 4. `/api/canvas-element`

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

**Response:**
```json
{
  "success": true,
  "message": "Canvas message/element stored",
  "messageId": "message-id"
}
```

## Data Flow

1. **User Input**:
   - User enters a prompt in the Canvas component
   - Frontend saves message to Supabase database
   - Frontend displays a loading visualization

2. **Intent Analysis & Template Selection**:
   - Frontend sends request to `/api/canvas/generate-visualization`
   - API authenticates user with Supabase
   - API analyzes intent and selects the most appropriate template
   - API evaluates confidence score against template threshold
   - If confidence is too low, system falls back to direct HTML generation

3. **Data Generation & Validation**:
   - API prompts OpenAI to generate data fitting the selected template
   - Data is validated against template's Zod schema
   - If validation fails, system uses fallback mechanism

4. **JSX Rendering**:
   - API generates JSX code using the template and validated data
   - Babel transpiles JSX to JavaScript for client-side execution
   - JSX code and data are stored in Supabase
   - API returns JSX component code and data in response

5. **Client Rendering**:
   - Frontend receives JSX component and data
   - React renders the component within a sandboxed environment
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
  template_id TEXT,
  component_code TEXT,
  component_data JSONB,
  html TEXT, -- Fallback HTML if needed
  confidence FLOAT,
  render_method TEXT NOT NULL, -- 'jsx' or 'fallback_iframe'
  summary TEXT,
  type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. `canvas_templates` Table

Stores visualization templates:

```sql
CREATE TABLE canvas_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  template TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  zod_schema TEXT NOT NULL,
  confidence_threshold FLOAT DEFAULT 0.75,
  fallback_html TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. `canvas_tools` Table

Stores tools that can be used with templates:

```sql
CREATE TABLE canvas_tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  script_url TEXT,
  config_schema JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. `canvas_triggers` Table

Stores trigger phrases for template selection:

```sql
CREATE TABLE canvas_triggers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  template_id UUID REFERENCES canvas_templates(id),
  tool_id UUID REFERENCES canvas_tools(id),
  matcher JSONB NOT NULL,
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

1. Maintains state for messages, templates, and visualizations
2. Uses the `useCanvasData` hook to poll for new data
3. Sends requests to the API routes
4. Renders visualizations using either JSX or fallback iframes

## Error Handling

The system handles errors at multiple levels:

1. **API Errors** - Return appropriate HTTP status codes and error messages
2. **OpenAI Errors** - Fall back to a simple visualization with error details
3. **Database Errors** - Logged and returned as 500 responses
4. **Validation Errors** - Use fallback rendering for invalid data
5. **Frontend Errors** - Display error messages to the user with retry options

## Template-Based Generation

The system uses a template-based approach where:

1. Templates define structure and expected data format
2. Zod schemas validate data before rendering
3. Confidence scores ensure appropriate template selection
4. Tools can be attached to templates for enhanced functionality

## Fallback Mechanism

If any part of the template-based generation fails, the system:

1. Records the failure reason in metadata
2. Uses template-specific fallback HTML if available
3. Otherwise generates a simple fallback visualization
4. Displays the error with helpful context
5. Offers users the option to try again or refine their prompt

## Debugging

The API includes extensive logging that can be enabled to debug issues:

1. Server-side logs show API calls, template selection, and OpenAI responses
2. Client-side logs show requests, JSX rendering status, and tool initialization
3. Template validation errors are recorded for debugging

## Performance Considerations

1. JSX components are lightweight and render efficiently
2. Templates are cached to avoid regeneration
3. Fallback mechanisms ensure visualization even if parts fail
4. The frontend shows loading states for better user experience
5. Polling is used to check for updates (with a 3-second interval)

## Future Improvements

1. Add WebSocket support for real-time updates
2. Implement template versioning and history
3. Support collaborative editing of visualizations
4. Add analytics to track template performance
5. Create a template designer UI for non-developers