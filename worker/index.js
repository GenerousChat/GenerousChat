// Supabase to Pusher Bridge Worker
// This worker listens to Supabase database changes and forwards them to Pusher

// Load environment variables from .env file
try {
  require("dotenv").config({ path: "../.env" });
  console.log("Loaded environment variables from ../.env");
} catch (error) {
  console.log("Could not load ../.env file, will use environment variables");
}

const crypto = require("crypto");
const https = require("https");
const { createClient } = require("@supabase/supabase-js");
const { generateText } = require("ai");
const { openai } = require("@ai-sdk/openai");

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Prefer service role key when available, fall back to anon key
const supabaseKey =
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const keyType = process.env.SUPABASE_SERVICE_KEY ? "service role" : "anon";

// Initialize Supabase client
console.log(
  `Initializing Supabase client with URL: ${supabaseUrl ? "URL is set" : "URL is NOT set"} and ${keyType} key: ${supabaseKey ? "Key is set" : "Key is NOT set"}`
);
const supabase = createClient(supabaseUrl, supabaseKey);
console.log("Supabase client initialized with", keyType, "key");

// Pusher configuration
const pusherConfig = {
  appId: "1971423",
  key: "96f9360f34a831ca1901",
  secret: process.env.PUSHER_SECRET || "c508bc54a2ca619cfab8",
  cluster: "us3",
};

// Store the last 50 messages
let recentMessages = [];

// Flag to track if AI is currently generating a response
let aiResponseInProgress = false;

// Timeout to prevent AI from responding too frequently
let aiResponseTimeout = null;

// Store AI agents fetched from the database
let aiAgents = [];

// Set to store AI agent user IDs to prevent AI from responding to its own messages
let aiAgentIds = new Set();

// Fetch AI agents from the database
async function fetchAIAgents() {
  try {
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching AI agents:", error);
      return;
    }

    if (data && data.length > 0) {
      aiAgents = data;
      // Update the set of AI agent IDs
      aiAgentIds = new Set(data.map((agent) => agent.id));
      console.log(`Fetched ${aiAgents.length} AI agents`);
    } else {
      console.log("No AI agents found in the database");
    }
  } catch (error) {
    console.error("Error in fetchAIAgents:", error);
  }
}

// Fetch the last 50 messages from Supabase
async function fetchRecentMessages() {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching recent messages:", error);
      return;
    }

    recentMessages = data.reverse();
    console.log(`Fetched ${recentMessages.length} recent messages`);
    console.log("Recent messages:", JSON.stringify(recentMessages, null, 2));
  } catch (error) {
    console.error("Error in fetchRecentMessages:", error);
  }
}

// Function to calculate MD5 hash
function md5(str) {
  return crypto.createHash("md5").update(str).digest("hex");
}

// Function to generate Pusher authentication signature
function generatePusherSignature(stringToSign, secret) {
  return crypto.createHmac("sha256", secret).update(stringToSign).digest("hex");
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
        data: eventData,
      });

      const bodyMd5 = md5(body);
      const stringToSign = `POST\n/apps/${pusherConfig.appId}/events\nauth_key=${pusherConfig.key}&auth_timestamp=${timestamp}&auth_version=1.0&body_md5=${bodyMd5}`;
      const signature = generatePusherSignature(
        stringToSign,
        pusherConfig.secret
      );

      const options = {
        hostname: `api-${pusherConfig.cluster}.pusher.com`,
        port: 443,
        path: `/apps/${pusherConfig.appId}/events`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      };

      // Add query parameters
      options.path += `?auth_key=${pusherConfig.key}&auth_timestamp=${timestamp}&auth_version=1.0&body_md5=${bodyMd5}&auth_signature=${signature}`;

      const req = https.request(options, (res) => {
        let responseData = "";

        res.on("data", (chunk) => {
          responseData += chunk;
        });

        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(
              `Event sent to Pusher: ${eventName} on channel ${channel}`
            );
            resolve({ success: true, statusCode: res.statusCode });
          } else {
            console.error(
              `Failed to send event to Pusher: ${res.statusCode} - ${responseData}`
            );
            reject(
              new Error(
                `Failed to send event: ${res.statusCode} - ${responseData}`
              )
            );
          }
        });
      });

      req.on("error", (error) => {
        console.error("Error sending event to Pusher:", error);
        reject(error);
      });

      req.write(body);
      req.end();
    } catch (error) {
      console.error("Error in sendToPusher:", error);
      reject(error);
    }
  });
}

// Set up Supabase real-time listeners
async function setupSupabaseListeners() {
  console.log("Setting up Supabase real-time listeners...");
  console.log(
    "Supabase client status:",
    supabase ? "initialized" : "not initialized"
  );

  // Create a single channel for all events
  console.log("Setting up combined channel subscription...");
  const channel = supabase
    .channel("db-changes")
    // .on(
    //   "postgres_changes",
    //   {
    //     event: "*",
    //     schema: "public",
    //     table: "agents",
    //   },
    //   async (payload) => {
    //     console.log("===== AGENT CHANGE DETECTED =====");
    //     console.log("Agent change:", JSON.stringify(payload));

    //     // Refresh the agents list
    //     await fetchAIAgents();
    //   }
    // )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
      },
      async (payload) => {
        console.log("===== MESSAGE INSERTED CALLBACK TRIGGERED =====");
        console.log("New message received:", JSON.stringify(payload));
        const message = payload.new;

        // Add to recent messages
        recentMessages.push(message);
        if (recentMessages.length > 50) {
          recentMessages.shift(); // Remove oldest message if we exceed 50
        }

        try {
          // Send to the appropriate room channel
          await sendToPusher(`room-${message.room_id}`, "new-message", {
            id: message.id,
            content: message.content,
            created_at: message.created_at,
            user_id: message.user_id,
          });
          console.log(
            `Message successfully forwarded to Pusher channel room-${message.room_id}`
          );

          // Only generate AI responses for messages from human users
          if (!aiAgentIds.has(message.user_id)) {
            console.log(
              "Message is from a human user, generating AI response..."
            );

            // Generate AI response after a short delay
            // Clear any existing timeout to prevent multiple responses
            if (aiResponseTimeout) {
              clearTimeout(aiResponseTimeout);
            }

            // Set a new timeout to generate a response after 2 seconds
            aiResponseTimeout = setTimeout(() => {
              generateAIResponse(message.room_id);
            }, 2000);
          } else {
            console.log(
              "Message is from an AI agent, skipping AI response generation"
            );
          }
        } catch (error) {
          console.error("Error forwarding message to Pusher:", error);
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
        console.log("===== PARTICIPANT JOINED CALLBACK TRIGGERED =====");
        console.log("User joined room:", JSON.stringify(payload));
        const participant = payload.new;

        try {
          // Send user joined event
          await sendToPusher(`room-${participant.room_id}`, "user-joined", {
            user_id: participant.user_id,
            joined_at: participant.joined_at,
          });
          console.log(
            `User join event forwarded to Pusher channel room-${participant.room_id}`
          );
        } catch (error) {
          console.error("Error forwarding user join event to Pusher:", error);
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
        console.log("===== PARTICIPANT LEFT CALLBACK TRIGGERED =====");
        console.log("User left room:", JSON.stringify(payload));
        const participant = payload.old;

        try {
          // Send user left event
          await sendToPusher(`room-${participant.room_id}`, "user-left", {
            user_id: participant.user_id,
          });
          console.log(
            `User left event forwarded to Pusher channel room-${participant.room_id}`
          );
        } catch (error) {
          console.error("Error forwarding user left event to Pusher:", error);
        }
      }
    );

  // Subscribe to the channel
  console.log("Subscribing to channel...");
  const subscription = channel.subscribe((status) => {
    console.log(`Subscription status changed: ${status}`);
    if (status === "SUBSCRIBED") {
      console.log("Successfully subscribed to database changes!");
    }
    if (status === "CHANNEL_ERROR") {
      console.error("Failed to subscribe to database changes");
    }
  });

  console.log("Supabase real-time listeners set up successfully");
  console.log("Channel subscription state:", channel.state);

  return { channel };
}

// Express server setup
const express = require("express");
const app = express();
app.use(express.json());

// Test endpoint for Pusher
app.post("/test-pusher", async (req, res) => {
  try {
    console.log("Testing Pusher integration");
    const roomId = req.body.roomId || "test-room";
    const message = req.body.message || "Test message";

    await sendToPusher(`room-${roomId}`, "new-message", {
      id: "test-" + Date.now(),
      content: message,
      created_at: new Date().toISOString(),
      user_id: "test-user",
    });

    res
      .status(200)
      .json({ success: true, message: "Test message sent to Pusher" });
  } catch (error) {
    console.error("Error testing Pusher:", error);
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
    console.log("Testing AI response generation");
    const roomId = req.body.roomId || "test-room";

    // Generate and send AI response
    await generateAIResponse(roomId);

    res.status(200).json({
      success: true,
      message: "AI response generated and sent to Pusher",
    });
  } catch (error) {
    console.error("Error testing AI response:", error);
    res.status(500).json({ error: "Failed to generate AI response" });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Generate AI response based on recent messages
async function generateAIResponse(roomId) {
  // Prevent multiple AI responses at the same time
  if (aiResponseInProgress) {
    console.log("AI response already in progress, skipping");
    return;
  }

  try {
    aiResponseInProgress = true;
    console.log("Generating AI response based on recent messages...");

    // Filter messages for the specific room
    const roomMessages = recentMessages.filter((msg) => msg.room_id === roomId);

    // If no messages in this room, skip
    if (roomMessages.length === 0) {
      console.log("No messages in room, skipping AI response");
      aiResponseInProgress = false;
      return;
    }

    // Check if the last message is from an AI agent
    const lastMessage = roomMessages[roomMessages.length - 1];
    if (aiAgentIds.has(lastMessage.user_id)) {
      console.log("Last message was from an AI agent, skipping response");
      aiResponseInProgress = false;
      return;
    }

    // Get the last 5 messages or fewer if not available
    const lastMessages = roomMessages.slice(-5);

    // Format messages for the prompt
    const messageHistory = lastMessages
      .map((msg) => `User: ${msg.content}`)
      .join("\n");

    // Select a random agent or use the default prompt if no agents are available
    let agentPrompt =
      "IMPORTANT: Your response MUST be 1-2 sentences ONLY, maximum 200 characters total. Respond with a single casual, friendly sentence as if you're part of the conversation. Be brief and natural. Don't introduce yourself or explain that you're an AI. Don't ever use emojis.";
    let selectedAgent = null;

    if (aiAgents.length > 0) {
      // Select a random agent
      selectedAgent = aiAgents[Math.floor(Math.random() * aiAgents.length)];
      agentPrompt = selectedAgent.personality_prompt;
      console.log(`Selected agent: ${selectedAgent.name}`);
    }

    // log the message history
    console.log("Message history:", messageHistory);

    // Create the prompt with stronger constraints
    const prompt = `The following is a chat conversation:\n\n${messageHistory}\n\n${agentPrompt}\n\nREMEMBER: Your entire response must be 1-2 sentences only and no more than 200 characters total. Extremely concise responses are required.`;

    console.log("Sending prompt to OpenAI:", prompt);

    // Generate text using OpenAI with stricter constraints
    const { text } = await generateText({
      model: openai.responses("gpt-4o-mini"),
      prompt: prompt,
      apiKey: process.env.OPENAI_API_KEY,
      maxTokens: 75, // Reduced to enforce shorter responses
      temperature: 0.7, // Add some randomness but not too much
    });

    console.log("AI generated response:", text);

    // Save the AI response to the Supabase database
    // The worker will automatically pick up this insert via real-time subscription
    // and forward it to Pusher

    // Use the selected agent's ID or the first agent ID in our list
    const aiAssistantId = selectedAgent ? selectedAgent.id : aiAgentIds[0];

    const { data, error } = await supabase.from("messages").insert({
      room_id: roomId,
      user_id: aiAssistantId,
      content: text,
    });

    if (error) {
      console.error("Error saving AI response to database:", error);
      return;
    }

    console.log("AI response saved to database for room:", roomId);
  } catch (error) {
    console.error("Error generating AI response:", error);
  } finally {
    aiResponseInProgress = false;
  }
}

// Initialize the application
async function init() {
  try {
    console.log("===== INITIALIZING APPLICATION =====");
    console.log("Environment variables:");
    console.log(
      "- PUSHER_SECRET:",
      process.env.PUSHER_SECRET ? "is set" : "is NOT set"
    );
    console.log(
      "- NEXT_PUBLIC_SUPABASE_URL:",
      process.env.NEXT_PUBLIC_SUPABASE_URL ? "is set" : "is NOT set"
    );
    console.log(
      "- NEXT_PUBLIC_SUPABASE_ANON_KEY:",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "is set" : "is NOT set"
    );
    console.log(
      "- SUPABASE_SERVICE_KEY:",
      process.env.SUPABASE_SERVICE_KEY ? "is set" : "is NOT set"
    );
    console.log(
      "- OPENAI_API_KEY:",
      process.env.OPENAI_API_KEY ? "is set" : "is NOT set"
    );
    console.log(
      "- Using Supabase key type:",
      process.env.SUPABASE_SERVICE_KEY
        ? "SERVICE ROLE (privileged)"
        : "ANON (limited)"
    );
    // Fetch recent messages first
    await fetchRecentMessages();

    // Fetch AI agents
    await fetchAIAgents();

    // Set up Supabase listeners
    await setupSupabaseListeners();

    // Start the server
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`Supabase to Pusher bridge worker running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error initializing the application:", error);
    process.exit(1);
  }
}

// Start the application
init();
