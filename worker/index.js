// Supabase to Pusher Bridge Worker
// This worker listens to Supabase database changes and forwards them to Pusher

const crypto = require('crypto');
const https = require('https');

// Pusher configuration
const pusherConfig = {
  appId: '1971423',
  key: '96f9360f34a831ca1901',
  secret: process.env.PUSHER_SECRET || 'c508bc54a2ca619cfab8', // Using the secret from .env
  cluster: 'us3'
};

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

// Handle Supabase webhook event
async function handleSupabaseWebhook(req, res) {
  try {
    console.log('Received webhook:', JSON.stringify(req.body));
    
    const payload = req.body;
    
    // Validate the payload
    if (!payload || !payload.type || !payload.table || !payload.record) {
      console.error('Invalid payload received:', JSON.stringify(payload));
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Process different event types
    if (payload.table === 'messages' && payload.type === 'INSERT') {
      const message = payload.record;
      
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
    } else if (payload.table === 'room_participants' && payload.type === 'INSERT') {
      const participant = payload.record;
      
      // Send user joined event
      await sendToPusher(
        `room-${participant.room_id}`,
        'user-joined',
        {
          user_id: participant.user_id,
          joined_at: participant.joined_at
        }
      );
    } else if (payload.table === 'room_participants' && payload.type === 'DELETE') {
      const participant = payload.record;
      
      // Send user left event
      await sendToPusher(
        `room-${participant.room_id}`,
        'user-left',
        {
          user_id: participant.user_id
        }
      );
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Express server setup
const express = require('express');
const app = express();
app.use(express.json());

// Webhook endpoint
app.post('/webhook', handleSupabaseWebhook);

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Supabase to Pusher bridge worker running on port ${PORT}`);
});
