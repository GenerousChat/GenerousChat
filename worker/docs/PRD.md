# Product Requirements Document: Worker Service

## Overview
The Worker Service is a bridge application that connects Supabase database events to Pusher real-time channels. It also manages AI agent responses to user messages in chat rooms. This document outlines the requirements for refactoring the Worker Service while maintaining all existing functionality.

## Core Functionality

### 1. Supabase to Pusher Bridge

#### 1.1 Supabase Realtime Listener
- Listen to Supabase database changes on the following events:
  - `INSERT` on `messages` table
  - `INSERT` on `room_participants` table (user joining a room)
  - `DELETE` on `room_participants` table (user leaving a room)
- Forward these events to the corresponding Pusher channels

#### 1.2 Message Forwarding
- When a new message is inserted into the Supabase `messages` table:
  - Add it to the recent messages cache
  - Forward it to the appropriate room channel in Pusher (`room-{roomId}`)
  - For messages from human users, trigger AI response generation after a delay (2 seconds)
  - For messages from AI agents, skip AI response generation

#### 1.3 Participant Tracking
- When a user joins a room:
  - Forward the join event to the appropriate Pusher channel
- When a user leaves a room:
  - Forward the leave event to the appropriate Pusher channel

### 2. AI Response Generation

#### 2.1 Agent Selection
- Fetch AI agents from the database
- For each message from a human user, select an appropriate AI agent based on:
  - Confidence scoring for each agent
  - Context of the conversation
  - Personality match
  - The specific content of the most recent message

#### 2.2 Message Analysis
- Analyze messages to determine if they request visualization
- Use both keyword matching and AI-based analysis
- Calculate confidence score for visualization intent

#### 2.3 Response Generation
- Generate AI text responses using OpenAI models
- Use agent-specific personality prompts
- Include conversation history for context
- Focus on addressing the most recent message

#### 2.4 HTML Visualization Generation
- Conditionally generate HTML visualizations based on:
  - Visualization intent analysis
  - Confidence thresholds
- Use OpenAI to generate complete HTML/CSS/JS content
- Store the generated visualization in the database
- Notify clients via Pusher about the new generation

### 3. API Endpoints

#### 3.1 Test Endpoints
- `/test-pusher`: Test Pusher integration with both text and HTML content
- `/test-ai`: Test AI response generation with optional HTML forcing
- `/recent-messages`: Get recent cached messages
- `/health`: Simple health check endpoint

### 4. Data Management

#### 4.1 Cache Management
- Maintain cache of recent messages (limited to last 50)
- Track processed messages to prevent duplicate responses
- Store collection of active AI agents and their IDs

#### 4.2 Conflict Prevention
- Track in-progress AI responses to prevent overlapping generation
- Use timeouts to delay AI responses appropriately
- Implement safety checks before sending responses

## Non-functional Requirements

### 1. Performance
- Optimize HTML generation for complex visualizations
- Properly manage memory usage for message caching
- Use appropriate timeouts for API requests

### 2. Error Handling
- Log all errors with appropriate context
- Implement fallbacks for failed AI generations
- Handle database connection issues gracefully

### 3. Security
- Use proper authentication for Supabase and Pusher integrations
- Protect API endpoints from unauthorized access
- Follow secure practices for credential management

### 4. Logging
- Log key events and state changes
- Track message flow through the system
- Monitor AI response generation events and decisions

## Technical Requirements

### 1. Environment Configuration
- Load environment variables from `.env` file when available
- Support the following environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_KEY`
  - `PUSHER_SECRET`
  - `OPENAI_API_KEY`
  - `HTML_CONTENT_CHANCE` (default: 90)
  - `PORT` (default: 3001)

### 2. Service Architecture
- Follow a modular approach using service classes
- Implement proper separation of concerns
- Utilize the existing service files in the codebase:
  - AIService.js
  - MessageTracker.js
  - PusherService.js
  - RoomService.js
  - SupabaseService.js

### 3. Third-party Integrations
- Supabase: For database operations and real-time events
- Pusher: For real-time client communication
- OpenAI: For generating text responses and HTML visualizations
- Google AI (optional): For alternative AI model options

## Implementation Guidelines

### 1. Refactoring Approach
- Move functionality into appropriate service classes
- Maintain all existing functionality and checks
- Implement proper error handling and logging
- Use ES6 class structures for organization

### 2. Initialization Process
1. Load environment variables
2. Initialize services (Supabase, Pusher, Express)
3. Fetch recent messages and AI agents
4. Set up Supabase real-time listeners
5. Start the Express server

### 3. Testing Strategy
- Use the existing test endpoints to verify functionality
- Test all event types (message, join, leave)
- Verify AI response generation and visualization
- Check error handling and recovery

## Appendix

### Schema Reference

#### Messages Table
- `id`: UUID
- `room_id`: String
- `user_id`: UUID
- `content`: String
- `created_at`: Timestamp

#### Room Participants Table
- `room_id`: String
- `user_id`: UUID
- `joined_at`: Timestamp

#### Agents Table
- `id`: UUID
- `name`: String
- `personality_prompt`: Text

#### Chat Room Generations Table
- `id`: UUID
- `room_id`: String
- `html`: Text
- `summary`: String
- `created_by`: UUID
- `type`: String
- `metadata`: JSON
- `created_at`: Timestamp

#### Profiles Table
- `id`: UUID
- `name`: String
