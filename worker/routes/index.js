const express = require("express");
const router = express.Router();
const PusherService = require("../services/PusherService");
const AIService = require("../services/AIService");

router.post("/test-pusher", async (req, res) => {
  try {
    const { roomId = "test-room", message = "Test message", messageType = "text" } = req.body;
    
    if (messageType === "html") {
      // Handle HTML content
      const visualizationData = {
        id: "test-viz-" + Date.now(),
        html: req.body.htmlContent || getDefaultHtmlContent(),
        summary: "Test HTML Visualization",
        created_at: new Date().toISOString(),
        user_id: "test-user",
      };

      await PusherService.sendEvent(`room-${roomId}`, "html-visualization", visualizationData);
      res.json({ success: true, message: "Test HTML visualization sent to Pusher" });
    } else {
      // Handle regular message
      await PusherService.sendEvent(`room-${roomId}`, "new-message", {
        id: "test-" + Date.now(),
        content: message,
        created_at: new Date().toISOString(),
        user_id: "test-user",
      });
      res.json({ success: true, message: "Test message sent to Pusher" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to send test message to Pusher" });
  }
});

// Add other routes...

module.exports = router;