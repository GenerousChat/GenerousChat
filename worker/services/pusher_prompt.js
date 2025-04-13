`## Multiplayer — Pusher Integration Protocol

You are building a **collaborative, real-time multiplayer visualization**. Multiple users in a chat are viewing the same canvas and interacting with it. To sync their views and actions, use **Pusher**.

process.env.PUSHER_SECRET
process.env.PUSHER_APP_ID
process.env.PUSHER_CLUSTER
process.env.PUSHER_KEY

<!DOCTYPE html>
<html>
<head>
  <title>Pusher Client Example</title>
  <script src="https://js.pusher.com/7.2/pusher.min.js"></script>
</head>
<body>
  <h2>Pusher Client Example</h2>
  <p>Check your browser console for events.</p>

  <script>
    // Enable Pusher logging (optional)
    Pusher.logToConsole = true;

    // Create a Pusher instance
    const pusher = new Pusher('96f9360f34a831ca1901', {
      cluster: 'us3'
    });

    // Subscribe to a channel
    const channel = pusher.subscribe('my-channel');

    // Bind to an event within the channel
    channel.bind('my-event', function(data) {
      console.log('Received event data:', data);
    });
  </script>
</body>
</html>`