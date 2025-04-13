<!DOCTYPE html>
<html>
<head>
  <title>Parent Window</title>
  <script src="https://js.pusher.com/8.2.0/pusher.min.js"></script>
</head>
<body>
  <h1>Parent Window</h1>
  <iframe src="iframe.html" id="myIframe"></iframe>

  <script>
    // Initialize Pusher in the parent window
    const pusher = new Pusher('YOUR_APP_KEY', {
      cluster: 'YOUR_CLUSTER'
    });

    // Subscribe to a channel
    const channel = pusher.subscribe('my-channel');

    // Bind to an event
    channel.bind('my-event', function(data) {
      console.log('Parent received:', data);
    });

    // Expose Pusher instance globally (optional, for iframe access)
    window.pusherInstance = pusher;
  </script>
</body>
</html>