// Supabase to Pusher Bridge Worker
// This worker listens to Supabase database changes and forwards them to Pusher

// Load environment variables from .env file
try {
  require('dotenv').config({ path: '../.env' });
  console.log('Loaded environment variables from ../.env');
} catch (error) {
  console.log('Could not load ../.env file, will use environment variables');
}

const crypto = require('crypto');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Pusher configuration
const pusherConfig = {
  appId: '1971423',
  key: '96f9360f34a831ca1901',
  secret: process.env.PUSHER_SECRET || 'c508bc54a2ca619cfab8',
  cluster: 'us3'
};

// Store the last 50 messages
let recentMessages = [];

// Fetch the last 50 messages from Supabase
async function fetchRecentMessages() {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('Error fetching recent messages:', error);
      return;
    }
    
    recentMessages = data.reverse();
    console.log(`Fetched ${recentMessages.length} recent messages`);
    console.log('Recent messages:', JSON.stringify(recentMessages, null, 2));
  } catch (error) {
    console.error('Error in fetchRecentMessages:', error);
  }
}

// Function to calculate MD5 hash
function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

// Function to generate Pusher authentication signature
function generatePusherSignature(stringToSign, secret) {
  return crypto.createHmac('sha256', secret)
    .update(stringToSign)
    .digest('hex');
}

// Function to send event to Pusher
async function sendToPusher(channel, eventName, data) {
  return new Promise((resolve, reject) => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const eventData = JSON.stringify(data);
      const body = JSON.stringify({
        name: eventName,
        channel: channel,
        data: eventData
      });

      const bodyMd5 = md5(body);
      const stringToSign = `POST\n/apps/${pusherConfig.appId}/events\nauth_key=${pusherConfig.key}&auth_timestamp=${timestamp}&auth_version=1.0&body_md5=${bodyMd5}`;
      const signature = generatePusherSignature(stringToSign, pusherConfig.secret);

      const options = {
        hostname: `api-${pusherConfig.cluster}.pusher.com`,
        port: 443,
        path: `/apps/${pusherConfig.appId}/events`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      };

      // Add query parameters
      options.path += `?auth_key=${pusherConfig.key}&auth_timestamp=${timestamp}&auth_version=1.0&body_md5=${bodyMd5}&auth_signature=${signature}`;

      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`Event sent to Pusher: ${eventName} on channel ${channel}`);
            resolve({ success: true, statusCode: res.statusCode });
          } else {
            console.error(`Failed to send event to Pusher: ${res.statusCode} - ${responseData}`);
            reject(new Error(`Failed to send event: ${res.statusCode} - ${responseData}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error('Error sending event to Pusher:', error);
        reject(error);
      });

      req.write(body);
      req.end();
    } catch (error) {
      console.error('Error in sendToPusher:', error);
      reject(error);
    }
  });
}

// Set up Supabase real-time listeners
async function setupSupabaseListeners() {
  console.log('Setting up Supabase real-time listeners...');
  
  // Listen for new messages
  const messagesChannel = supabase
    .channel('messages-channel')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages'
    }, async (payload) => {
      console.log('New message received:', JSON.stringify(payload));
      const message = payload.new;
      
      // Add to recent messages
      recentMessages.push(message);
      if (recentMessages.length > 50) {
        recentMessages.shift(); // Remove oldest message if we exceed 50
      }
      
      // Send to the appropriate room channel
      await sendToPusher(
        `room-${message.room_id}`,
        'new-message',
        {
          id: message.id,
          content: message.content,
          created_at: message.created_at,
          user_id: message.user_id
        }
      );
    })
    .subscribe();
  
  // Listen for new room participants
  const participantsChannel = supabase
    .channel('participants-channel')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'room_participants'
    }, async (payload) => {
      console.log('User joined room:', JSON.stringify(payload));
      const participant = payload.new;
      
      // Send user joined event
      await sendToPusher(
        `room-${participant.room_id}`,
        'user-joined',
        {
          user_id: participant.user_id,
          joined_at: participant.joined_at
        }
      );
    })
    .subscribe();
  
  // Listen for deleted room participants
  const leavingChannel = supabase
    .channel('leaving-channel')
    .on('postgres_changes', {
      event: 'DELETE',
      schema: 'public',
      table: 'room_participants'
    }, async (payload) => {
      console.log('User left room:', JSON.stringify(payload));
      const participant = payload.old;
      
      // Send user left event
      await sendToPusher(
        `room-${participant.room_id}`,
        'user-left',
        {
          user_id: participant.user_id
        }
      );
    })
    .subscribe();
  
  console.log('Supabase real-time listeners set up successfully');
  
  return { messagesChannel, participantsChannel, leavingChannel };
}

// Express server setup
const express = require('express');
const app = express();
app.use(express.json());

// Test endpoint for Pusher
app.post('/test-pusher', async (req, res) => {
  try {
    console.log('Testing Pusher integration');
    const roomId = req.body.roomId || 'test-room';
    const message = req.body.message || 'Test message';
    
    await sendToPusher(
      `room-${roomId}`,
      'new-message',
      {
        id: 'test-' + Date.now(),
        content: message,
        created_at: new Date().toISOString(),
        user_id: 'test-user'
      }
    );
    
    res.status(200).json({ success: true, message: 'Test message sent to Pusher' });
  } catch (error) {
    console.error('Error testing Pusher:', error);
    res.status(500).json({ error: 'Failed to send test message to Pusher' });
  }
});

// Get recent messages endpoint
app.get('/recent-messages', (req, res) => {
  res.status(200).json({ messages: recentMessages });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Initialize the application
async function init() {
  try {
    // Fetch recent messages first
    await fetchRecentMessages();
    
    // Set up Supabase listeners
    await setupSupabaseListeners();
    
    // Start the server
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`Supabase to Pusher bridge worker running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error initializing the application:', error);
    process.exit(1);
  }
}

// Start the application
init();
