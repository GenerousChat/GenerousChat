// Supabase to Pusher Bridge Worker
// This worker listens to Supabase database changes and forwards them to Pusher

// Import required modules
const express = require("express");
const { generateText, generateObject } = require("ai");
const { openai } = require("@ai-sdk/openai");
const { google } = require("@ai-sdk/google");
const { z } = require("zod");

// Import services
const config = require("./config");
const logger = require("./config/logger");
const supabaseService = require("./services/SupabaseService");
const pusherService = require("./services/PusherService");
const messageTracker = require("./services/MessageTracker");
const RoomService = require("./services/RoomService");
const AIService = require("./services/AIService");

// Initialize services
const roomService = new RoomService(supabaseService.supabase);
const aiService = new AIService(supabaseService.supabase);

// Initialize AI service immediately to load AI agents
(async () => {
  try {
    await aiService.init();
    logger.info(`AI service initialized with ${aiService.aiAgentIds.size} agents`);
  } catch (error) {
    logger.error("Error initializing AI service:", error);
  }
})();

// Store the last 50 messages (will be loaded from Supabase)
let recentMessages = [];

// Initialize Express app
const app = express();
app.use(express.json());

/**
 * Event handlers for Supabase real-time events
 */

// Handle new message event from Supabase
async function handleNewMessage(payload) {
  try {
    const newMessage = payload.new;
    logger.info(`New message received: ${newMessage.id} in room ${newMessage.room_id}`);
    
    // Add to recent messages cache
    recentMessages.push(newMessage);
    if (recentMessages.length > 50) {
      recentMessages.shift(); // Keep only the last 50 messages
    }
    
    // Forward the message to Pusher
    await pusherService.sendEvent(
      `room-${newMessage.room_id}`,
      "new-message",
      {
        id: newMessage.id,
        content: newMessage.content,
        created_at: newMessage.created_at,
        user_id: newMessage.user_id,
      }
    );
    
    // If the message is from a human user (not an AI agent), trigger AI response after a delay
    // Skip messages with null user_id or messages from AI agents
    if (!newMessage.user_id) {
      logger.info(`Skipping message with null user_id: ${newMessage.id}`);
      return;
    }
    
    // Check if the user_id is in the aiAgentIds set maintained by AIService
    const isFromAIAgent = aiService.aiAgentIds.has(newMessage.user_id);
    logger.info(`Message from user ${newMessage.user_id} - Is AI agent: ${isFromAIAgent}`);
    
    // Only proceed if the message is from a human user
    if (!isFromAIAgent) {
      // Delay AI response by 2 seconds to allow for multiple messages
      setTimeout(() => {
        // Get recent messages for this room to provide context
        const roomMessages = recentMessages.filter(msg => msg.room_id === newMessage.room_id);
        aiService.handleAIResponse(newMessage.room_id, roomMessages, newMessage);
      }, 2000);
    }
  } catch (error) {
    logger.error("Error handling new message:", error);
  }
}

// Handle participant joined event from Supabase
async function handleParticipantJoined(payload) {
  try {
    const participant = payload.new;
    logger.info(`User ${participant.user_id} joined room ${participant.room_id}`);
    
    // Forward the join event to Pusher
    await pusherService.sendEvent(
      `room-${participant.room_id}`,
      "user-joined",
      {
        user_id: participant.user_id,
        joined_at: participant.joined_at,
      }
    );
  } catch (error) {
    logger.error("Error handling participant joined:", error);
  }
}

// Handle participant left event from Supabase
async function handleParticipantLeft(payload) {
  try {
    const participant = payload.old;
    logger.info(`User ${participant.user_id} left room ${participant.room_id}`);
    
    // Forward the leave event to Pusher
    await pusherService.sendEvent(
      `room-${participant.room_id}`,
      "user-left",
      {
        user_id: participant.user_id,
      }
    );
  } catch (error) {
    logger.error("Error handling participant left:", error);
  }
}

// Set up Supabase real-time listeners
function setupSupabaseListeners() {
  const channel = supabaseService.setupRealtimeListeners({
    onMessageInsert: handleNewMessage,
    onParticipantJoined: handleParticipantJoined,
    onParticipantLeft: handleParticipantLeft
  });
  
  channel.subscribe((status) => {
    logger.info(`Supabase realtime status: ${status}`);
  });
  
  return channel;
}

/**
 * API Endpoints
 */

// Test endpoint for Pusher
app.post("/test-pusher", async (req, res) => {
  try {
    logger.info("Testing Pusher integration");
    const roomId = req.body.roomId || "test-room";
    const message = req.body.message || "Test message";
    const messageType = req.body.messageType || "text";
    
    if (messageType === "html") {
      // Test sending HTML content
      const htmlContent =
        req.body.htmlContent ||
        `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .container { max-width: 800px; margin: 0 auto; background: #f5f5f5; padding: 20px; border-radius: 8px; }
            h1 { color: #333; }
            .chart { background: #fff; padding: 15px; border-radius: 4px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Test HTML Visualization</h1>
            <p>This is a test HTML visualization sent from the worker service.</p>
            <div class="chart">
              <h2>Sample Chart</h2>
              <p>Imagine a beautiful chart here!</p>
            </div>
          </div>
        </body>
        </html>
        `;

      const visualizationData = {
        id: "test-viz-" + Date.now(),
        html: htmlContent,
        summary: "Test HTML Visualization",
        created_at: new Date().toISOString(),
        user_id: "test-user",
      };
      
      try {
        await pusherService.sendEvent(
          `room-${roomId}`,
          "html-visualization",
          visualizationData
        );
        logger.info("Test HTML visualization successfully sent to Pusher");
        res.status(200).json({
          success: true,
          message: "Test HTML visualization sent to Pusher",
        });
      } catch (error) {
        logger.error("Error sending test HTML visualization to Pusher:", error);
        res.status(500).json({ error: "Failed to send HTML visualization to Pusher" });
      }
    } else {
      // Regular text message
      await pusherService.sendEvent(`room-${roomId}`, "new-message", {
        id: "test-" + Date.now(),
        content: message,
        created_at: new Date().toISOString(),
        user_id: "test-user",
      });

      res.status(200).json({ success: true, message: "Test message sent to Pusher" });
    }
  } catch (error) {
    logger.error("Error testing Pusher:", error);
    res.status(500).json({ error: "Failed to send test message to Pusher" });
  }
});

// Get recent messages endpoint
app.get("/recent-messages", (req, res) => {
  res.status(200).json({ messages: recentMessages });
});

// Test endpoint for AI response
app.post("/test-ai", async (req, res) => {
  try {
    const roomId = req.body.roomId || "test-room";
    const message = req.body.message || "Can you show me a visualization of the data?";
    const forceHtml = req.body.forceHtml === true;

    // Create a test message
    const testMessage = {
      id: "test-" + Date.now(),
      room_id: roomId,
      content: message,
      created_at: new Date().toISOString(),
      user_id: "test-user",
    };

    // Get room messages for context
    const roomMessages = recentMessages.filter(msg => msg.room_id === roomId);
    
    // If forceHtml is true, we'll override the AI service's decision making
    if (forceHtml) {
      // This is a bit of a hack, but for testing we'll directly call the visualization generation
      const htmlContent = await aiService.generateVisualization(
        roomId,
        roomMessages,
        testMessage,
        "This is a test visualization"
      );
      
      if (htmlContent) {
        res.status(200).json({
          success: true,
          message: "Test AI visualization generated",
          html: htmlContent.substring(0, 200) + "..." // Show a preview
        });
      } else {
        res.status(500).json({ error: "Failed to generate visualization" });
      }
    } else {
      // Normal AI response flow
      await aiService.handleAIResponse(roomId, roomMessages, testMessage);
      res.status(200).json({
        success: true,
        message: "Test AI response triggered",
      });
    }
  } catch (error) {
    logger.error("Error testing AI response:", error);
    res.status(500).json({ error: "Failed to generate AI response" });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

/**
 * Application Initialization
 */

// Log environment variables
function logEnvironmentVariables() {
  logger.info("===== INITIALIZING APPLICATION =====");
  logger.info("Environment variables:");
  logger.info(`- PUSHER_SECRET: ${process.env.PUSHER_SECRET ? "is set" : "is NOT set"}`);
  logger.info(`- NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? "is set" : "is NOT set"}`);
  logger.info(`- NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "is set" : "is NOT set"}`);
  logger.info(`- SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? "is set" : "is NOT set"}`);
  logger.info(`- OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? "is set" : "is NOT set"}`);
  logger.info(`- HTML_CONTENT_CHANCE: ${process.env.HTML_CONTENT_CHANCE ? process.env.HTML_CONTENT_CHANCE + "%" : "90% (default)"}`);
  logger.info(`- Using Supabase key type: ${process.env.SUPABASE_SERVICE_KEY ? "SERVICE ROLE (privileged)" : "ANON (limited)"}`);
}

// Initialize the application
async function init() {
  try {
    logEnvironmentVariables();
    
    // Fetch recent messages
    const messages = await supabaseService.fetchRecentMessages();
    recentMessages = messages;
    logger.info(`Loaded ${recentMessages.length} recent messages from Supabase`);
    
    // Set up Supabase real-time listeners
    const channel = setupSupabaseListeners();
    logger.info("Supabase real-time listeners initialized");
    
    // Start the server
    const PORT = config.server.port;
    app.listen(PORT, () => {
      logger.info(`Supabase to Pusher bridge worker running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Error initializing the application:", error);
    process.exit(1);
  }
}

// Start the application
init();
