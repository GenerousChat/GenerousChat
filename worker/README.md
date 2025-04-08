# Supabase to Pusher Bridge Worker

This worker service listens to Supabase database changes via webhooks and forwards them to Pusher for real-time messaging.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Set the Pusher secret key as an environment variable:
   ```
   export PUSHER_SECRET=your_pusher_secret
   ```

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

4. Set the Pusher secret as a secret in Fly:
   ```
   fly secrets set PUSHER_SECRET=your_pusher_secret
   ```

## Supabase Webhook Setup

1. In your Supabase dashboard, go to Database → Webhooks
2. Create a new webhook with the following settings:
   - Name: PusherBridge
   - Table: messages, room_participants
   - Events: INSERT, DELETE
   - URL: https://your-fly-app.fly.dev/webhook
   - HTTP Method: POST

## Testing

You can test the webhook endpoint locally using curl:

```bash
curl -X POST http://localhost:3001/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "INSERT",
    "table": "messages",
    "record": {
      "id": "123",
      "room_id": "room-123",
      "user_id": "user-123",
      "content": "Test message",
      "created_at": "2025-04-08T10:00:00Z"
    }
  }'
```
