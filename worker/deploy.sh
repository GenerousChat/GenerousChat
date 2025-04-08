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

# Check if OpenAI API key is set
if [ -z "$OPENAI_API_KEY" ]; then
  echo "Warning: OPENAI_API_KEY is not set."
  echo "The AI response feature will not work without an OpenAI API key."
  read -p "Do you want to continue without the OpenAI API key? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Check if service role key is set
if [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "Warning: SUPABASE_SERVICE_KEY is not set."
  echo "The worker will use the anon key, which may have limited permissions due to Row Level Security (RLS)."
  echo "For full access to database events, it's recommended to set the service role key."
  echo "You can get this from your Supabase dashboard: https://app.supabase.com/project/_/settings/api"
  read -p "Do you want to continue without the service role key? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Set Fly.io app name
APP_NAME="hackathon-floral-sun-886"

# Set secrets in Fly.io
echo "Setting secrets in Fly.io..."
fly secrets set PUSHER_SECRET="$PUSHER_SECRET" -a $APP_NAME
fly secrets set NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" -a $APP_NAME
fly secrets set NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" -a $APP_NAME

# Set service role key if available
if [ ! -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "Setting SUPABASE_SERVICE_KEY in Fly.io..."
  fly secrets set SUPABASE_SERVICE_KEY="$SUPABASE_SERVICE_KEY" -a $APP_NAME
fi

# Set OpenAI API key if available
if [ ! -z "$OPENAI_API_KEY" ]; then
  echo "Setting OPENAI_API_KEY in Fly.io..."
  fly secrets set OPENAI_API_KEY="$OPENAI_API_KEY" -a $APP_NAME
fi

# Deploy the application
echo "Deploying the application to Fly.io..."
fly deploy

echo "Deployment completed!"
echo "Your worker is now running at: https://$APP_NAME.fly.dev"
echo ""
echo "Test endpoints:"
echo "- Health check: https://$APP_NAME.fly.dev/health"
echo "- Recent messages: https://$APP_NAME.fly.dev/recent-messages"
