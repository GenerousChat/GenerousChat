# Supabase to Pusher Bridge Worker

This worker service listens to Supabase database changes via real-time subscriptions and forwards them to Pusher for real-time messaging. It also maintains a cache of the 50 most recent messages.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the parent directory with the following variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_supabase_service_role_key  # Recommended for bypassing RLS
   PUSHER_SECRET=your_pusher_secret
   ```
   
   **Important**: Using the `SUPABASE_SERVICE_KEY` (service role key) is highly recommended for the worker service as it bypasses Row Level Security (RLS) policies, allowing the worker to listen to all database changes. You can find this key in your Supabase dashboard under Project Settings > API > Project API keys.

3. Run the service locally:
   ```
   npm start
   ```

## Deployment to Fly.io

1. Install the Fly CLI:
   ```
   curl -L https://fly.io/install.sh | sh
   ```

2. Log in to Fly:
   ```
   fly auth login
   ```

3. Deploy the application:
   ```
   fly launch
   ```

4. Set the required secrets in Fly:
   ```
   fly secrets set PUSHER_SECRET=your_pusher_secret -a hackathon-floral-sun-886
   fly secrets set NEXT_PUBLIC_SUPABASE_URL=your_supabase_url -a hackathon-floral-sun-886
   fly secrets set NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key -a hackathon-floral-sun-886
   fly secrets set SUPABASE_SERVICE_KEY=your_supabase_service_role_key -a hackathon-floral-sun-886
   ```
   
   Or use the provided deployment script which will handle this for you:
   ```
   ./deploy.sh
   ```

## How It Works

1. **Supabase Real-time Subscriptions**: The worker uses Supabase's real-time capabilities to listen for database changes directly:
   - New messages (INSERT on the messages table)
   - User joins (INSERT on the room_participants table)
   - User leaves (DELETE on the room_participants table)

2. **Message Caching**: The worker fetches and maintains a cache of the 50 most recent messages.

3. **Pusher Integration**: When events are detected, they are forwarded to the appropriate Pusher channels:
   - `room-{roomId}` channels for each chat room
   - Events: `new-message`, `user-joined`, `user-left`

## API Endpoints

### Test Pusher Integration

You can test the Pusher integration using the test endpoint:

```bash
curl -X POST http://localhost:3001/test-pusher \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "room-123",
    "message": "Test message"
  }'
```

### Get Recent Messages

Retrieve the cached recent messages:

```bash
curl http://localhost:3001/recent-messages
```

### Health Check

Verify the service is running:

```bash
curl http://localhost:3001/health
```

## Testing with Node.js Scripts

You can also use the provided Node.js scripts to test the Pusher integration:

```bash
# Send a test message to a specific room
node pusher-send-test.js room-123 "Your test message"
```
