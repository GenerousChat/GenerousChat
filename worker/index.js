// Supabase to Pusher Bridge Worker
require("dotenv").config({ path: "../.env" });

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const config = require("./config");
const routes = require("./routes");
const SupabaseService = require("./services/SupabaseService");
const PusherService = require("./services/PusherService");
const AIService = require("./services/AIService");
const logger = require("./config/logger");
const morganMiddleware = require("./middleware/morgan");
const errorHandler = require("./middleware/error-handler");
const logRotation = require("./utils/log-rotation");

// Initialize Services
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const aiService = new AIService(supabase);
let recentMessages = [];

// Store event handlers
async function setupSupabaseListeners() {
  logger.info("Setting up Supabase real-time listeners...");

  const channel = supabase
    .channel("db-changes")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
      },
      async (payload) => {
        logger.info("===== MESSAGE INSERTED CALLBACK TRIGGERED =====");
        const message = payload.new;

        // Add to recent messages
        recentMessages.push(message);
        if (recentMessages.length > 50) {
          recentMessages.shift();
        }

        try {
          // Send to the appropriate room channel
          await PusherService.sendEvent(`room-${message.room_id}`, "new-message", {
            id: message.id,
            content: message.content,
            created_at: message.created_at,
            user_id: message.user_id,
          });

          // Only generate AI responses for messages from human users
          if (!aiService.aiAgentIds.has(message.user_id)) {
            await handleAIResponse(message.room_id);
          }
        } catch (error) {
          logger.error("Error handling message:", error);
        }
      }
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "room_participants",
      },
      async (payload) => {
        logger.info("===== PARTICIPANT JOINED CALLBACK TRIGGERED =====");
        const participant = payload.new;

        try {
          await PusherService.sendEvent(`room-${participant.room_id}`, "user-joined", {
            user_id: participant.user_id,
            joined_at: participant.joined_at,
          });
        } catch (error) {
          logger.error("Error handling participant join:", error);
        }
      }
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "room_participants",
      },
      async (payload) => {
        logger.info("===== PARTICIPANT LEFT CALLBACK TRIGGERED =====");
        const participant = payload.old;

        try {
          await PusherService.sendEvent(`room-${participant.room_id}`, "user-left", {
            user_id: participant.user_id,
          });
        } catch (error) {
          logger.error("Error handling participant leave:", error);
        }
      }
    );

  channel.subscribe((status) => {
    logger.info(`Subscription status changed: ${status}`);
  });

  return { channel };
}

// Express setup
const app = express();

// Middleware
app.use(express.json());
app.use(morganMiddleware);

// Routes
app.use("/", routes);

// Error handling middleware must be after all routes
app.use(errorHandler);

// Initialize application
async function init() {
  try {
    logger.info("===== INITIALIZING APPLICATION =====");
    
    // Initialize log rotation
    logRotation();
    
    await Promise.all([
      fetchRecentMessages(),
      aiService.init(),
    ]);

    await setupSupabaseListeners();

    const port = config.server.port || 3001;
    app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
    });
  } catch (error) {
    logger.error("Error initializing application:", error);
    process.exit(1);
  }
}

init();
