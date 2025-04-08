#!/bin/bash
# Deployment script for the Supabase to Pusher Bridge Worker

# Load environment variables from parent .env file
if [ -f "../.env" ]; then
  echo "Loading environment variables from ../.env"
  export $(grep -v '^#' ../.env | xargs)
else
  echo "No ../.env file found. Make sure environment variables are set manually."
fi

# Check if required environment variables are set
if [ -z "$PUSHER_SECRET" ] || [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo "Error: Required environment variables are not set."
  echo "Please make sure PUSHER_SECRET, NEXT_PUBLIC_SUPABASE_URL, and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
  exit 1
fi

# Set Fly.io app name
APP_NAME="hackathon-floral-sun-886"

# Set secrets in Fly.io
echo "Setting secrets in Fly.io..."
fly secrets set PUSHER_SECRET="$PUSHER_SECRET" -a $APP_NAME
fly secrets set NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" -a $APP_NAME
fly secrets set NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" -a $APP_NAME

# Deploy the application
echo "Deploying the application to Fly.io..."
fly deploy

echo "Deployment completed!"
echo "Your worker is now running at: https://$APP_NAME.fly.dev"
echo ""
echo "Test endpoints:"
echo "- Health check: https://$APP_NAME.fly.dev/health"
echo "- Recent messages: https://$APP_NAME.fly.dev/recent-messages"
