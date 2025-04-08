# Chat Application Migration: Supabase to Pusher

## Product Requirements Document

### Overview
This document outlines the requirements for migrating our chat application from Supabase real-time subscriptions to Pusher for real-time messaging capabilities. The migration aims to improve reliability, scalability, and performance of our real-time messaging system.

### Goals
- Replace Supabase real-time subscriptions with Pusher for message delivery
- Maintain all existing chat functionality
- Implement a worker service to bridge Supabase database events to Pusher
- Ensure seamless user experience during and after the migration

### Technical Requirements

#### 1. Client-Side Integration
- Integrate Pusher JavaScript SDK into the chat application
- Subscribe to appropriate Pusher channels for each chat room
- Update the message handling logic to process events from Pusher
- Maintain backward compatibility during the transition period

#### 2. Worker Service
- Create a worker service to be deployed on Fly.io
- Connect to Supabase database change events via webhooks or listeners
- Process database events and forward them to Pusher
- Implement proper error handling and retry mechanisms
- Add logging for monitoring and debugging

#### 3. Pusher Configuration
- Set up a Pusher account and application
- Configure the following Pusher channels:
  - `room-{roomId}`: For messages in a specific room
- Configure the following Pusher events:
  - `new-message`: When a new message is added
  - `user-joined`: When a user joins a room
  - `user-left`: When a user leaves a room

#### 4. Security
- Implement proper authentication for Pusher channels
- Ensure only authorized users can subscribe to room channels
- Secure the worker service with appropriate authentication

### Implementation Details

#### Pusher Client Integration
```javascript
// Initialize Pusher
const pusher = new Pusher('96f9360f34a831ca1901', {
  cluster: 'us3'
});

// Subscribe to a room channel
const channel = pusher.subscribe(`room-${roomId}`);

// Listen for new messages
channel.bind('new-message', function(data) {
  // Process and display the new message
});
```

#### Worker Service
The worker service will:
1. Listen to Supabase database changes via webhooks
2. Process the events and format them for Pusher
3. Send the events to Pusher using the Pusher API

Example Pusher API call:
```bash
curl -H 'Content-Type: application/json' \
  -d '{"data":"{\"message\":\"hello world\"}","name":"new-message","channel":"room-123"}' \
  "https://api-us3.pusher.com/apps/1971423/events?" \
  "body_md5=CALCULATED_MD5&" \
  "auth_version=1.0&" \
  "auth_key=96f9360f34a831ca1901&" \
  "auth_timestamp=TIMESTAMP&" \
  "auth_signature=CALCULATED_SIGNATURE&"
```

### Migration Plan
1. Develop and test the worker service
2. Update the client-side code to support Pusher
3. Deploy the worker service to Fly.io
4. Run both systems in parallel for a transition period
5. Monitor for any issues
6. Once stable, remove the Supabase real-time subscription code

### Success Metrics
- Zero message loss during transition
- Equal or better message delivery latency
- Improved reliability for high-volume chat rooms
- Positive user feedback on chat performance

### Timeline
- Development: 1 week
- Testing: 3 days
- Deployment: 1 day
- Parallel run: 1 week
- Final cutover: 1 day
