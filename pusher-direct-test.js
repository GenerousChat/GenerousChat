// Direct Pusher test using the official Pusher Node.js library
const Pusher = require('pusher');

// Replace with your actual Pusher credentials
const pusher = new Pusher({
  appId: '1971423',
  key: '96f9360f34a831ca1901',
  secret: process.env.PUSHER_SECRET || 'YOUR_PUSHER_SECRET', // Set this via environment variable
  cluster: 'us3',
  useTLS: true
});

// Function to send a test message
async function sendTestMessage() {
  try {
    console.log('Sending test message to Pusher...');
    
    const result = await pusher.trigger('room-test-123', 'new-message', {
      id: 'test-' + Date.now(),
      content: 'Test message from Node.js script using official Pusher library',
      created_at: new Date().toISOString(),
      user_id: 'test-user'
    });
    
    console.log('Test message sent successfully!');
    console.log('Result:', result);
  } catch (error) {
    console.error('Failed to send test message:', error);
  }
}

// Run the test
sendTestMessage();
