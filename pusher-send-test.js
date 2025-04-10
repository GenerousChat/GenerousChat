// Script to send test messages to a specific room channel
const Pusher = require('pusher');

// Initialize Pusher with your credentials
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

// Get room ID from command line or use default
const roomId = process.argv[2] || 'test-123';
const message = process.argv[3] || 'Test message from Node.js script';

// Function to send a test message to a specific room
async function sendTestMessage() {
  try {
    console.log(`Sending test message to room-${roomId}...`);
    
    const result = await pusher.trigger(`room-${roomId}`, 'new-message', {
      id: 'test-' + Date.now(),
      content: message,
      created_at: new Date().toISOString(),
      user_id: 'test-user'
    });
    
    console.log('Test message sent successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('\nTo send another test message, run:');
    console.log(`node pusher-send-test.js ${roomId} "Your message here"`);
  } catch (error) {
    console.error('Failed to send test message:', error);
  }
}

// Run the test
sendTestMessage();
