# Product Requirements Document

The chat room should listen to pusher app for events instead of supabase.

e.g. <!DOCTYPE html>

<head>
  <title>Pusher Test</title>
  <script src="https://js.pusher.com/8.4.0/pusher.min.js"></script>
  <script>

    // Enable pusher logging - don't include this in production
    Pusher.logToConsole = true;

    var pusher = new Pusher('96f9360f34a831ca1901', {
      cluster: 'us3'
    });

    var channel = pusher.subscribe('my-channel');
    channel.bind('my-event', function(data) {
      alert(JSON.stringify(data));
    });

  </script>
</head>
<body>
  <h1>Pusher Test</h1>
  <p>
    Try publishing an event to channel <code>my-channel</code>
    with event name <code>my-event</code>.
  </p>
</body>

---

There should be a worker which will be deployed to fly.io. It should listen to the supabase events and forward them onto the pusherapp

example code

curl -H 'Content-Type: application/json' -d '{"data":"{\"message\":\"hello world\"}","name":"my-event","channel":"my-channel"}' \
"https://api-us3.pusher.com/apps/1971423/events?"\
"body_md5=2c99321eeba901356c4c7998da9be9e0&"\
"auth_version=1.0&"\
"auth_key=96f9360f34a831ca1901&"\
"auth_timestamp=1744106925&"\
"auth_signature=3f9bbaaff82cb0f2cc64cec379ab3a374c742669fceb41deaed7c842159147c1&"
