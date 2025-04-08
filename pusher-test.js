// Test script to send messages directly to Pusher
const crypto = require('crypto');
const https = require('https');

// Pusher configuration - same as in your worker
const pusherConfig = {
  appId: '1971423',
  key: '96f9360f34a831ca1901',
  secret: process.env.PUSHER_SECRET || 'YOUR_PUSHER_SECRET', // Replace with your actual secret
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

      console.log('Sending request to Pusher:', options.path);

      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`Event sent to Pusher: ${eventName} on channel ${channel}`);
            console.log('Response:', responseData);
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

// Send a test message
async function sendTestMessage() {
  try {
    console.log('Sending test message to Pusher...');
    await sendToPusher(
      'room-test-123',
      'new-message',
      {
        id: 'test-' + Date.now(),
        content: 'Test message from Node.js script',
        created_at: new Date().toISOString(),
        user_id: 'test-user'
      }
    );
    console.log('Test message sent successfully!');
  } catch (error) {
    console.error('Failed to send test message:', error);
  }
}

// Run the test
sendTestMessage();
