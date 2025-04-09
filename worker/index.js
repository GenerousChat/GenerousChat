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
const { generateText, generateObject } = require("ai");
const { openai } = require("@ai-sdk/openai");
const { google } = require("@ai-sdk/google");
const { z } = require("zod");

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

// Configuration for HTML content generation
const config = {
  // Percentage chance (0-100) to generate HTML content instead of a text response
  htmlContentChance: process.env.HTML_CONTENT_CHANCE || 90,
};

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
      console.log(
        `Preparing to send Pusher event: ${eventName} to channel: ${channel}`
      );
      console.log(
        `Event data type: ${typeof data}, stringified length: ${eventData.length}`
      );

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
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            h1 { color: #4a6fa5; }
            p { line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Test HTML Content</h1>
            <p>This is a test HTML page generated by the worker. In a real scenario, this would contain a creative summary or visualization of the conversation.</p>
            <p>The actual content would be much more detailed and relevant to the conversation topics.</p>
          </div>
        </body>
        </html>
      `;

      // Send HTML content as a special event type
      console.log("Sending test HTML visualization to Pusher");

      const visualizationData = {
        id: "test-viz-" + Date.now(),
        html: htmlContent,
        summary: "Test HTML Visualization",
        created_at: new Date().toISOString(),
        user_id: "test-user",
      };

      try {
        await sendToPusher(
          `room-${roomId}`,
          "html-visualization",
          visualizationData
        );
        console.log("Test HTML visualization successfully sent to Pusher");
        res.status(200).json({
          success: true,
          message: "Test HTML visualization sent to Pusher",
        });
      } catch (error) {
        console.error(
          "Error sending test HTML visualization to Pusher:",
          error
        );
        res
          .status(500)
          .json({ error: "Failed to send HTML visualization to Pusher" });
      }
    } else {
      // Regular text message
      await sendToPusher(`room-${roomId}`, "new-message", {
        id: "test-" + Date.now(),
        content: message,
        created_at: new Date().toISOString(),
        user_id: "test-user",
      });

      res
        .status(200)
        .json({ success: true, message: "Test message sent to Pusher" });
    }
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
    const forceHtml = req.body.forceHtml === true;

    // Override the random selection if forceHtml is true
    if (forceHtml) {
      // Temporarily modify Math.random to always return 0.1 (which is < 0.2)
      const originalRandom = Math.random;
      Math.random = () => 0.1;

      // Generate and send AI response with HTML
      await generateAIResponse(roomId);

      // Restore original Math.random
      Math.random = originalRandom;

      res.status(200).json({
        success: true,
        message: "HTML content generated and sent to Pusher",
      });
    } else {
      // Generate and send regular AI response
      await generateAIResponse(roomId);

      res.status(200).json({
        success: true,
        message: "AI response generated and sent to Pusher",
      });
    }
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
      console.log("No messages found for room:", roomId);
      aiResponseInProgress = false;
      return;
    }

    // Get the last message to analyze for visualization intent
    const lastUserMessage = roomMessages[roomMessages.length - 1];

    // Analyze the last message to determine if it's requesting a visualization
    async function analyzeMessageForVisualizationIntent(message) {
      // Keywords that suggest a visualization request
      const visualizationKeywords = [
        "build",
        "create",
        "generate",
        "make",
        "show",
        "visualize",
        "display",
        "draw",
        "chart",
        "graph",
        "diagram",
        "map",
        "plot",
        "visualisation",
        "visualization",
        "dashboard",
        "ui",
        "interface",
        "design",
        "mockup",
        "prototype",
        "render",
        "play",
        "animate",
        "simulate",
        "illustrate",
        "depict",
      ];

      // Simple keyword-based analysis
      const messageText = message.content.toLowerCase();
      const keywordMatch = visualizationKeywords.some((keyword) =>
        messageText.includes(keyword)
      );

      // Initial confidence based on keyword matching
      let confidence = keywordMatch ? 0.5 : 0.1;

      // For more accurate analysis, use the AI to evaluate
      if (keywordMatch) {
        try {
          // Use generateObject with Zod schema as per the latest docs
          const result = await generateObject({
            model: openai.responses("gpt-4o"),
            schema: z.object({
              score: z
                .number()
                .describe(
                  "A score from 0 to 100 indicating the likelihood that the user is requesting a visualization"
                ),
              reason: z
                .string()
                .describe("A brief explanation of why this score was given"),
            }),
            prompt: `Analyze this message and determine if it's explicitly requesting something to be built, created, visualized, or generated.

Message: "${message.content}"

Return a score from 0 to 100 indicating the likelihood that the user is requesting a visualization, and a brief reason explaining why.`,
            temperature: 0.1,
          });

          // Debug the result structure
          console.log(
            "AI analysis result structure:",
            JSON.stringify(result, null, 2)
          );

          // Safely access properties with fallbacks
          if (result && typeof result === "object") {
            // Try to find score and reason properties at any level based on the actual structure
            let score, reason;

            // Check for direct properties
            if ("score" in result) {
              score = result.score;
              reason = result.reason;
            }
            // Check for object.score structure (this is the actual structure based on the debug output)
            else if (result.object && typeof result.object === "object") {
              score = result.object.score;
              reason = result.object.reason;
            }
            // Check for analysis structure
            else if (result.analysis && typeof result.analysis === "object") {
              score = result.analysis.score;
              reason = result.analysis.reason;
            }

            if (typeof score === "number") {
              confidence = score / 100;
              console.log(
                `AI analysis of visualization intent: ${confidence * 100}% confidence. Reason: ${reason || "No reason provided"}`
              );
            } else {
              console.log(
                "Could not find valid score in AI response, using keyword-based confidence"
              );
            }
          } else {
            console.log(
              "AI analysis returned invalid result, using keyword-based confidence"
            );
          }
        } catch (aiError) {
          console.error("Error getting AI analysis of message:", aiError);
        }
      }

      return confidence;
    }

    // Analyze the message for visualization intent
    const visualizationConfidence =
      await analyzeMessageForVisualizationIntent(lastUserMessage);

    // Determine if we should generate HTML based on confidence score
    // If confidence is high (>0.7), always generate
    // If confidence is medium (0.3-0.7), use it as the probability
    // If confidence is low (<0.3), use a reduced probability
    const shouldGenerateHtml =
      visualizationConfidence > 0.7
        ? true
        : visualizationConfidence > 0.3
          ? Math.random() < visualizationConfidence
          : Math.random() < 0.1; // Very low chance for low confidence messages

    console.log(
      `HTML generation: Visualization confidence: ${visualizationConfidence * 100}%, Final decision: ${shouldGenerateHtml}`
    );

    // Check if the last message is from an AI agent
    const lastMessage = roomMessages[roomMessages.length - 1];
    if (aiAgentIds.has(lastMessage.user_id)) {
      console.log("Last message was from an AI agent, skipping response");
      aiResponseInProgress = false;
      return;
    }

    // Get the last 50 messages or fewer if not available
    const lastMessages = roomMessages.slice(-50);

    // Get user IDs from messages to fetch their names
    const userIds = [...new Set(lastMessages.map((msg) => msg.user_id))];
    console.log("User IDs to fetch:", userIds);

    // Fetch user profiles for all users in the conversation
    const { data: userProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", userIds);

    if (profilesError) {
      console.error("Error fetching user profiles:", profilesError);
    }

    console.log("Fetched user profiles:", userProfiles);

    // Create a map of user IDs to names
    const userNames = {};
    if (userProfiles && userProfiles.length > 0) {
      userProfiles.forEach((profile) => {
        userNames[profile.id] = profile.name;
      });
      console.log("User names map from profiles:", userNames);
    } else {
      console.log("No user profiles found or empty array returned");
    }

    // For any user IDs not found in profiles, check if they're agents
    const missingUserIds = userIds.filter(
      (id) => !userNames[id] && aiAgentIds.has(id)
    );

    if (missingUserIds.length > 0) {
      console.log("Looking up agent names for:", missingUserIds);

      // Fetch agent names
      const { data: agentData, error: agentError } = await supabase
        .from("agents")
        .select("id, name")
        .in("id", missingUserIds);

      if (agentError) {
        console.error("Error fetching agent data:", agentError);
      } else if (agentData && agentData.length > 0) {
        agentData.forEach((agent) => {
          userNames[agent.id] = agent.name;
        });
        console.log("Updated user names map with agents:", userNames);
      }
    }

    // Format messages for the prompt with user names
    const messageHistory = lastMessages
      .map((msg) => {
        let userName = userNames[msg.user_id];

        // If still no name found and it's an AI agent, use a generic agent name
        if (!userName && aiAgentIds.has(msg.user_id)) {
          userName = "AI Assistant";
        }

        // Final fallback
        userName = userName || "Unknown User";

        console.log(
          `Message from user ${msg.user_id}, mapped name: ${userName}`
        );
        return `${userName}: ${msg.content}`;
      })
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

    // We already have the last message from earlier analysis

    // Create the prompt with stronger constraints and focus on responding to the last message
    const prompt = `The following is a chat conversation:\n\n${messageHistory}\n\n${agentPrompt}\n\nFocus on responding directly to the last message in the conversation. Your response should reflect the topic and tone of the conversation, especially addressing what "${lastUserMessage.content}" is about.\n\nREMEMBER: Your entire response must be 1-2 sentences only and no more than 200 characters total. Also be witty, regardless of your personality. Don't say what everybody always says. Extremely concise responses are required.`;

    console.log("Sending prompt to OpenAI:", prompt);

    // Generate text using OpenAI with stricter constraints
    const { text } = await generateText({
      model: openai.responses("gpt-4o"),
      prompt: prompt,
      maxTokens: 75, // Reduced to enforce shorter responses
      temperature: 0.7, // Add some randomness but not too much
    });

    console.log("AI generated response:", text);

    // Always send a regular text message first
    const aiAssistantId = selectedAgent ? selectedAgent.id : aiAgentIds[0];

    // Save the regular AI response to the Supabase database
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

    // If we should generate HTML, create and send a special HTML visualization message
    if (shouldGenerateHtml) {
      console.log("Generating HTML content based on conversation...");

      // Create a prompt for generating HTML content that responds to conversation intent
      const htmlPrompt = `# Conversation-Driven UI Generation

## PRIORITY: Focus on BUILD/CREATE/GENERATE Requests
Analyze the conversation for the most recent message that explicitly asks for something to be built, created, generated, or visualized. Ignore casual conversation or messages that don't request creation of something. Look for phrases like "build", "create", "generate", "make", "show me", "visualize", etc.

## Context Analysis Guidelines:
- Find the most recent message containing an EXPLICIT request to build/create something
- Look for clear directives like "build X", "create Y", "generate Z", "make a...", "show me..."
- Skip over casual messages, questions, or discussion that don't request creation
- Once found, implement exactly what that message requested
- Use conversation history only as supporting context for implementing the request

## Technology Selection - Match the right tool to the conversation:

- Data/statistics → Use D3.js or Chart.js (but only if actual data is present)
- Timelines/processes → Use TimelineJS or custom animations
- 3D objects/spaces → Use Three.js (only when truly beneficial)
- Creative explanations → Use SVG/Canvas/p5.js for illustrations
- Interactive tools → Use appropriate JS framework for the specific tool
- Math concepts → use MathJax or KaTeX for math, or custom SVG
- Games/simulations → Use Phaser or p5.js, 
- Maps/locations → Use Leaflet.js or Mapbox GL JS
- Physics simulations → Use Matter.js
- Simple animations → Use CSS animations or GSAP
- Scientific visualizations → Use Plotly.js or Vega-Lite
- Youtube videos → Use lite YouTube embed
- Simple text/concepts → Use elegant typography 

IMPORTANT: Use complex libraries when simpler approaches are less visually appealing. Choose technology based on conversation needs, and always prioritize user experience and aesthetics.

## Conversation:
${messageHistory}

## Your Creation Requirements:
1. Ensure responsive design that works well in the sidebar panel
2. Create a visualization that directly fulfills the most recent build/create request
3. DO NOT INCLUDE markdown code comment blocks in the output as it will be rendered directly
4. Optimize performance (lazy load libraries, efficient code) 
5. Balance aesthetics with functionality - beautiful but purposeful
6. Use libraries and technologies that fit the conversation needs
7. Add thoughtful interactivity that improves understanding
8. Provide clear visual cues for how to interact with your creation
9. Include helpful annotations where appropriate
10. Handle edge cases gracefully with fallbacks

## Implementation Details:
- You may use external libraries from trusted CDNs (cdnjs, unpkg, jsdelivr)
- The visualization must work immediately without setup steps
- Use appropriate semantic HTML and accessibility features
- Include fallback content if libraries fail to load
- Create smooth loading experience with transitions
- Make appropriate use of viewport dimensions

MAKE SURE YOUR SOLUTION INVOLVES EVERYTHING, DON"T WORRY ABOUT HOW BIG THE FILE IS

IF YOU LOAD JAVASCRIPT OR CSS FROM A CDN, NEVER USE THE INTEGRITY ATTRIBUTE, KEEP THE SCRIPT OR LINK TAG AS SIMPLE AS POSSIBLE, JUST LOAD THE ASSET

## RETURN FORMAT: VALID HTML WITH NO COMMENTARY OR MARKDOWN - JUST RAW HTML/CSS/JS DOCUMENT

Create something that directly fulfills the most recent build/create request and makes users say "This is exactly what I asked for!"`;

      console.log("Sending HTML generation prompt to OpenAI");

      // Generate HTML content using OpenAI
      const { text: htmlContent } = await generateText({
        // model: google("gemini-2.5-pro-exp-03-25"),
        model: openai.responses("o3-mini"),
        // model: openai.responses("o1"),
        prompt: htmlPrompt,
        maxTokens: 35500, // Allow more tokens for HTML content
        temperature: 0.8, // More creativity for HTML generation
      });

      console.log("HTML content generated, length:", htmlContent.length);

      try {
        // Store the generation in the database
        const { data: generation, error: insertError } = await supabase
          .from("chat_room_generations")
          .insert({
            room_id: roomId,
            html: htmlContent,
            summary: "Generated a visual summary of this conversation",
            created_by: aiAssistantId,
            type: "visualization",
            metadata: {
              model: "o3-mini",
              messageCount: recentMessages.length,
            },
          })
          .select()
          .single();

        if (insertError) {
          throw new Error(`Error storing generation: ${insertError.message}`);
        }

        console.log("Generation stored in database with ID:", generation.id);

        // Send a notification to clients about the new generation
        await sendToPusher(`room-${roomId}`, "new-generation", {
          generation_id: generation.id,
          type: "visualization",
          created_at: generation.created_at,
        });

        console.log(
          "Notification sent to clients about new generation:",
          generation.id
        );
      } catch (error) {
        console.error("Error handling generation:", error);
      }
    }
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
      "- HTML_CONTENT_CHANCE:",
      process.env.HTML_CONTENT_CHANCE
        ? process.env.HTML_CONTENT_CHANCE + "%"
        : "90% (default)"
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
