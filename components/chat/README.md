# Chat Component with Pusher Integration

## Overview

This chat component provides real-time messaging capabilities using Pusher. It was migrated from Supabase real-time to improve reliability, scalability, and performance.

## Features

- Real-time messaging using Pusher
- Message history persistence in Supabase
- User presence indicators
- Typing indicators (coming soon)
- Message read receipts (coming soon)

## Architecture

The chat system consists of three main components:

1. **Chat UI Components**: React components for the chat interface
2. **Supabase Backend**: Database for message persistence
3. **Pusher Integration**: Real-time message delivery
4. **Worker Service**: Bridge between Supabase and Pusher

## Setup and Usage

### Prerequisites

- Supabase project with tables for `chat_rooms`, `messages`, and `room_participants`
- Pusher account with app credentials
- Worker service deployed to Fly.io (or similar)

### Component Usage

```tsx
<ChatRoom
  roomId="room-123"
  initialMessages={messages}
  currentUser={user}
  participants={participants}
/>
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `roomId` | string | Unique identifier for the chat room |
| `initialMessages` | Message[] | Initial messages to display |
| `currentUser` | User | The current authenticated user |
| `participants` | Participant[] | List of participants in the room |

## Worker Service

The worker service bridges Supabase database events to Pusher. It listens for changes in the Supabase database and forwards them to Pusher channels.

### Deployment

The worker service is deployed to Fly.io. See the [worker README](/worker/README.md) for deployment instructions.

### Event Flow

1. User sends a message (stored in Supabase)
2. Supabase triggers a webhook to the worker service
3. Worker processes the event and forwards it to Pusher
4. Pusher delivers the event to all subscribed clients
5. Clients receive and display the message

## Pusher Channel Structure

- `room-{roomId}`: Channel for messages in a specific room

## Pusher Events

- `new-message`: When a new message is added
- `user-joined`: When a user joins a room
- `user-left`: When a user leaves a room

## Migration from Supabase Real-time

This component was migrated from Supabase real-time to Pusher for improved reliability and scalability. The migration involved:

1. Adding Pusher client library
2. Replacing Supabase subscription code with Pusher subscription
3. Creating a worker service to bridge Supabase events to Pusher
4. Updating message handling logic

## Troubleshooting

### Common Issues

- **Messages not appearing in real-time**: Check Pusher connection status and ensure the worker service is running
- **Error connecting to Pusher**: Verify Pusher credentials and network connectivity
- **Missing messages**: Check Supabase database and webhook configuration

## Development

### Local Development

1. Start the Next.js development server:
   ```
   npm run dev
   ```

2. Run the worker service locally:
   ```
   cd worker
   npm install
   npm run dev
   ```

3. Use a tool like ngrok to expose your local worker service:
   ```
   ngrok http 3001
   ```

4. Update the Supabase webhook URL to point to your ngrok URL

### Testing

Test the chat functionality by opening multiple browser windows and sending messages between them.
