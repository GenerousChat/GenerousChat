<!DOCTYPE html>
<html>
<head>
  <title>Generous</title>
  <script src="https://js.pusher.com/8.2.0/pusher.min.js"></script>
</head>
<body>
  <h1>Generation</h1>
  <iframe src="iframe.html" id="Canvas"></iframe>

  <script>
    // Initialize Pusher in the parent window
    const pusher = new Pusher('96f9360f34a831ca1901', {
      cluster: 'us3'
    });

    // Subscribe to a channel
    const channel = pusher.subscribe('roomId');

    // Bind to an event
    channel.bind('eventName', function(data) {
      console.log('Parent received:', data);
    });

    // Expose Pusher instance globally (optional, for iframe access)
    window.pusherInstance = pusher;
  </script>
</body>
</html>