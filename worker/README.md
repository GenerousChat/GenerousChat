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
   OPENAI_API_KEY=your_openai_api_key  # Required for AI response feature
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
   fly secrets set OPENAI_API_KEY=your_openai_api_key -a hackathon-floral-sun-886
   ```
   
   Or use the provided deployment script which will handle this for you:
   ```
   ./deploy.sh
   ```

## How It Works

This worker service acts as a bridge between Supabase and Pusher, enabling real-time messaging in the chat application. It performs the following functions:

1. **Listens to Supabase Database Changes**: The worker uses Supabase's real-time functionality to listen for changes to the `messages` and `room_participants` tables.

2. **Forwards Events to Pusher**: When a database change is detected, the worker formats the data and forwards it to the appropriate Pusher channel.

3. **Maintains Message Cache**: The worker maintains a cache of the last 50 messages received, which can be accessed via the `/recent-messages` endpoint.

4. **AI Response Generation**: The worker automatically generates AI responses to messages using OpenAI's GPT-4 model. When a new message is received, the worker waits 2 seconds and then generates a casual, friendly response based on the recent conversation history.

5. **HTML Content Generation**: Approximately 20% of the time, the worker will generate an HTML page based on the conversation content. This creative HTML summary is sent as a special message type through Pusher. When the client receives this special message type, it should render the HTML content in an iframe or other suitable container on the chat page.

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

### Test AI Response Generation

You can test the AI response generation using the test endpoint:

```bash
curl -X POST http://localhost:3001/test-ai \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "room-123"
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
