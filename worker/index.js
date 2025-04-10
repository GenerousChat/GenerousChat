// Supabase to Pusher Bridge Worker
// This worker listens to Supabase database changes and forwards them to Pusher

// Load environment variables from .env file
try {
  require("dotenv").config({ path: "../.env" });
  console.log("Loaded environment variables from ../.env");
} catch (error) {
  console.log("Could not load ../.env file, will use environment variables");
}

// Import required services and dependencies
const express = require("express");
const config = require("./config");
const SupabaseService = require("./services/SupabaseService");
const PusherService = require("./services/PusherService");
const AIService = require("./services/AIService");
const MessageTracker = require("./services/MessageTracker");

// Apply logger if available
let logger = console;
try {
  logger = require("./config/logger");
} catch (error) {
  console.log("Using default console logger");
}

// Apply middleware if available
let errorHandler = (err, req, res, next) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
};

try {
  errorHandler = require("./middleware/error-handler");
} catch (error) {
  console.log("Using default error handler");
}

// Configuration for the application
const appConfig = {
  // Percentage chance (0-100) to generate HTML content instead of a text response
  htmlContentChance: process.env.HTML_CONTENT_CHANCE || 90,
  port: process.env.PORT || 3001
};

// Set up Supabase real-time listeners
async function setupSupabaseListeners() {
  logger.info("Setting up Supabase real-time listeners...");
  
  // Create callbacks for Supabase real-time events
  const callbacks = {
    onMessageInsert: async (payload) => {
      logger.info("===== MESSAGE INSERTED CALLBACK TRIGGERED =====");
      logger.debug("New message received:", JSON.stringify(payload));
      const message = payload.new;

      // Add to recent messages cache
      MessageTracker.addMessage(message);

      try {
        // Send message to the appropriate room channel
        await PusherService.sendEvent(`room-${message.room_id}`, "new-message", {
          id: message.id,
          content: message.content,
          created_at: message.created_at,
          user_id: message.user_id,
        });
        logger.info(`Message successfully forwarded to Pusher channel room-${message.room_id}`);

        // Generate AI response if the message is from a human user
        if (!AIService.isMessageFromAI(message.user_id)) {
          logger.info("Message is from a human user, scheduling AI response...");
          AIService.scheduleResponse(message.room_id);
        } else {
          logger.info("Message is from an AI agent, skipping AI response generation");
        }
      } catch (error) {
        logger.error("Error forwarding message to Pusher:", error);
      }
    },
    
    onParticipantJoined: async (payload) => {
      logger.info("===== PARTICIPANT JOINED CALLBACK TRIGGERED =====");
      logger.debug("User joined room:", JSON.stringify(payload));
      const participant = payload.new;

      try {
        // Send user joined event
        await PusherService.sendEvent(`room-${participant.room_id}`, "user-joined", {
          user_id: participant.user_id,
          joined_at: participant.joined_at,
        });
        logger.info(`User join event forwarded to Pusher channel room-${participant.room_id}`);
      } catch (error) {
        logger.error("Error forwarding user join event to Pusher:", error);
      }
    },
    
    onParticipantLeft: async (payload) => {
      logger.info("===== PARTICIPANT LEFT CALLBACK TRIGGERED =====");
      logger.debug("User left room:", JSON.stringify(payload));
      const participant = payload.old;

      try {
        // Send user left event
        await PusherService.sendEvent(`room-${participant.room_id}`, "user-left", {
          user_id: participant.user_id,
        });
        logger.info(`User left event forwarded to Pusher channel room-${participant.room_id}`);
      } catch (error) {
        logger.error("Error forwarding user left event to Pusher:", error);
      }
    }
  };

  const channel = await SupabaseService.setupRealtimeListeners(callbacks);
  
  return { channel };
}

// Set up Express app routes
function setupExpressApp(app) {
  // Apply middleware
  app.use(express.json());
  
  // Apply morgan middleware if available
  try {
    const morgan = require('./middleware/morgan');
    app.use(morgan);
  } catch (error) {
    logger.info("Morgan middleware not available, skipping");
  }

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
        logger.info("Sending test HTML visualization to Pusher");

        const visualizationData = {
          id: "test-viz-" + Date.now(),
          html: htmlContent,
          summary: "Test HTML Visualization",
          created_at: new Date().toISOString(),
          user_id: "test-user",
        };

        try {
          await PusherService.sendEvent(
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
          logger.error(
            "Error sending test HTML visualization to Pusher:",
            error
          );
          res
            .status(500)
            .json({ error: "Failed to send HTML visualization to Pusher" });
        }
      } else {
        // Regular text message
        await PusherService.sendEvent(`room-${roomId}`, "new-message", {
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
      logger.error("Error testing Pusher:", error);
      res.status(500).json({ error: "Failed to send test message to Pusher" });
    }
  });

  // Get recent messages endpoint
  app.get("/recent-messages", (req, res) => {
    res.status(200).json({ messages: MessageTracker.getRecentMessages() });
  });

  // Test endpoint for AI response
  app.post("/test-ai", async (req, res) => {
    try {
      logger.info("Testing AI response generation");
      const roomId = req.body.roomId || "test-room";
      const forceHtml = req.body.forceHtml === true;

      // Generate and send AI response
      await AIService.generateResponse(roomId, { forceHtml });

      res.status(200).json({
        success: true,
        message: forceHtml 
          ? "HTML content generated and sent to Pusher" 
          : "AI response generated and sent to Pusher",
      });
    } catch (error) {
      logger.error("Error testing AI response:", error);
      res.status(500).json({ error: "Failed to generate AI response" });
    }
  });

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Apply error handler middleware
  app.use(errorHandler);
}

// Initialize the application
async function init() {
  try {
    logger.info("===== INITIALIZING APPLICATION =====");
    logger.info("Environment variables:");
    logger.info(`- PUSHER_SECRET: ${process.env.PUSHER_SECRET ? "is set" : "is NOT set"}`);
    logger.info(`- NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? "is set" : "is NOT set"}`);
    logger.info(`- NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "is set" : "is NOT set"}`);
    logger.info(`- SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? "is set" : "is NOT set"}`);
    logger.info(`- OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? "is set" : "is NOT set"}`);
    logger.info(`- HTML_CONTENT_CHANCE: ${appConfig.htmlContentChance}%`);
    logger.info(`- PORT: ${appConfig.port}`);

    // Initialize Supabase service
    await SupabaseService.init();
    
    // Initialize message tracker with recent messages
    const messages = await SupabaseService.fetchRecentMessages();
    MessageTracker.initialize(messages);
    
    // Initialize AI service with agents from database
    const agents = await SupabaseService.fetchAIAgents();
    await AIService.init(SupabaseService, agents, MessageTracker, PusherService, {
      htmlContentChance: appConfig.htmlContentChance
    });
    
    // Set up real-time listeners
    const { channel } = await setupSupabaseListeners();

    // Create and set up Express app
    const app = express();
    setupExpressApp(app);
    
    // Start the server
    app.listen(appConfig.port, () => {
      logger.info(`Worker server is running on port ${appConfig.port}`);
    });
  } catch (error) {
    logger.error("Error during initialization:", error);
    process.exit(1);
  }
}

// Start the application
init();

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
        "add",
        "update",
        "change",
        "modify",
        "improve",
        "enhance",
        "optimize",
        "refine",
        "revise",
        "customize",
        "personalize",
        "tailor",
        "adjust",
        "transform",
        "evolve",
        "rework",
        "rebuild",
        "recreate",
        "remake",
        "reproduce",
        "reimagine",
        "rethink",
        "reconceptualize",
        "reengineer",
        "restructure",
        "reconfigure",
        "reorganize",
        "rearrange",
        "recompose",
        "reconstruct",
        "refactor",
        "can you",
        "could you",
        "suggest",
        "recommend",
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
    let agentPrompt = null;
    let selectedAgent = null;
    console.log("HASLALSDALSDLASDLASLDALSDALSD");
    console.log("HASLALSDALSDLASDLASLDALSDALSD");
    console.log("HASLALSDALSDLASDLASLDALSDALSD");
    console.log("HASLALSDALSDLASDLASLDALSDALSD");
    console.log("HASLALSDALSDLASDLASLDALSDALSD");
    console.log("HASLALSDALSDLASDLASLDALSDALSD");
    if (aiAgents.length > 0) {
      // Select agents that have a high confidence for a meaningful reply

      const { data: lastGeneration, error: lastGenerationError } =
        await supabase
          .from("chat_room_generations")
          .select()
          .eq("room_id", roomId)
          .order("created_at", { ascending: false })
          .limit(1);

      // save it the html column to a variable
      const lastGenerationHtml = lastGeneration[0]?.html;

      const prompt = `
        Analyze this message and determine the confidence of each agent in providing a meaningful response.
        
        Agents:
        ${aiAgents
          .map(
            (agent) => `
          Agent Name:
          ${agent.name}: 
          Agent Id: 
          ${agent.id}
          Agent Personality:
          ${agent.personality_prompt}
        `
          )
          .join("\n\n\n")}

        Last Generation HTML:
        ${lastGenerationHtml}

        Message History:
        ${messageHistory}

        Last Message: 
        ${lastUserMessage.content}

        All things considered, should an agent chime in on the conversation given it's personality and the context of the conversation?
        
        Return an array of objects containing agent IDs and their confidence scores for a meaningful response.
        `;

      const result = await generateObject({
        model: openai.responses("gpt-4o"),
        temperature: 0.1,
        schema: z.object({
          agents_confidence: z
            .array(
              z.object({
                agent_id: z.string(),
                confidence: z.number(),
              })
            )
            .describe(
              "An array of objects containing agent IDs and their confidence scores for a meaningful response"
            ),
        }),
        prompt,
      });

      // log out the result
      console.log("AI agent selection result:", { result });

      let selectedAgents = result.response.body.output[0].content;

      console.log("Selected agents:", selectedAgents);

      /*
      Selected agents: [
  {
    type: 'output_text',
    text: '{"agents_confidence":[{"agent_id":"cce2f8b4-918f-4e86-97bb-fd9d57aa7462","confidence":0.8},{"agent_id":"3f0b6122-a429-4450-bf0e-1a9470a93c23","confidence":0.6},{"agent_id":"4d87dcd3-f3b5-4e90-b328-9a7a4a7f6ed0","confidence":0.9},{"agent_id":"72a8dbcf-9ae6-45f2-b832-24bb6b5d8390","confidence":0.5},{"agent_id":"64b9c912-579e-420f-9a67-d20aef71c34e","confidence":0.7}]}',
    annotations: []
  }
]
      */

      selectedAgents = JSON.parse(selectedAgents[0].text).agents_confidence;

      // log out the name of the agent by mapping it to aiAgents var
      const agentNamesAndConfidence = selectedAgents.map((agent) => {
        const agent2 = aiAgents.find((a) => a.id === agent.agent_id);
        return { name: agent2.name, confidence: agent.confidence };
      });
      console.log(
        "Selected agent names and confidence:",
        agentNamesAndConfidence
      );

      // find the agent with the highest confidence
      const highestConfidenceAgent = agentNamesAndConfidence.reduce(
        (prev, current) => {
          return prev.confidence > current.confidence ? prev : current;
        }
      );
      console.log(
        "Selected agent with highest confidence:",
        highestConfidenceAgent
      );

      selectedAgent = aiAgents.find(
        (a) => a.name === highestConfidenceAgent.name
      );
      agentPrompt = selectedAgent.personality_prompt;
      console.log(`Selected agent: ${selectedAgent.name}`);
    }

    if (!agentPrompt) {
      console.log("No agent prompt found");
      return false;
    }

    // fetch the last generation for this room id
    const { data: lastGeneration, error: lastGenerationError } = await supabase
      .from("chat_room_generations")
      .select()
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(1);

    // save it the html column to a variable
    const lastGenerationHtml = lastGeneration[0]?.html;

    // log the message history
    console.log("Message history:", messageHistory);

    // We already have the last message from earlier analysis

    // Create the prompt with stronger constraints and focus on responding to the last message
    const prompt = `
      The following is a chat conversation:
      ${messageHistory}
      
      Last Generation HTML:
      ${lastGenerationHtml}

      Expert Prompt:
      ${agentPrompt}

      Focus on responding directly to the last message in the conversation. Your response should reflect the topic and tone of the conversation, especially addressing what "${lastUserMessage.content}" is about.
      
      `;

    console.log("Sending prompt to OpenAI:", prompt);

    // Generate text using OpenAI with stricter constraints
    const { text } = await generateText({
      model: openai.responses("gpt-4o"),
      prompt: prompt,
      maxTokens: 4000, // Reduced to enforce shorter responses
      temperature: 0.8, // Add some randomness but not too much
    });

    console.log("AI generated response:", text);

    // Always send a regular text message first
    const aiAssistantId = selectedAgent ? selectedAgent.id : aiAgentIds[0];

    // Save the regular AI response to the Supabase database
    const { data, error } = await supabase.from("messages").insert({
      room_id: roomId,
      user_id: aiAssistantId,
      content: "local - " + text,
    });

    if (error) {
      console.error("Error saving AI response to database:", error);
      return;
    }

    console.log("AI response saved to database for room:", roomId);

    const expertAgentText = text;

    // If we should generate HTML, create and send a special HTML visualization message
    if (shouldGenerateHtml) {
      console.log("Generating HTML content based on conversation...");

      // Create a prompt for generating HTML content that responds to conversation intent
      const htmlPrompt = `# Conversation-Driven UI Generation

## Last generated Canvas  
Only use this if the person seemingly wants to update the last canvas 
${lastGenerationHtml ? lastGenerationHtml : ""}

## PRIORITY: Focus on BUILD/CREATE/GENERATE Requests
Analyze the conversation for the most recent message that explicitly asks for something to be built, created, generated, visualized, or updated. Ignore casual conversation or messages that don't request creation of something. Look for imperative commands and phrases like "build", "create", "generate", "make", "show me", "visualize", etc. For requests requiring update look at the most recent canvas code and only change the parts the user asks to change.

## Context Analysis Guidelines:
- Find the most recent message containing an EXPLICIT request to build/create something
- Look for clear directives like "build X", "create Y", "generate Z", "make a...", "show me...", "update...",
- Skip over casual messages, questions, or discussions that don't request creation or updates
- Once found, implement exactly what that message requested
- Use conversation history only as supporting context for implementing the request

## Technology Selection - Match the right tool to the request and check for dependencies:

- Data/statistics → Use D3.js or Chart.js (but only if actual data is present)
- Timelines/processes → Use TimelineJS, fill in as much detail as possible and choose the best format
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

IMPORTANT: Use complex libraries only when simpler approaches are less visually appealing. Choose technology based on conversation needs, and always prioritize user experience and aesthetics.

## Conversation:
${messageHistory}

## Your Creation Requirements:
1. Ensure responsive design that works well in the sidebar panel
2. Create a visualization that directly fulfills the most recent build/create/update request
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

## Expert Agent Response:
${expertAgentText}

MAKE SURE YOUR SOLUTION INVOLVES EVERYTHING, DON"T WORRY ABOUT HOW BIG THE FILE IS

IF YOU LOAD JAVASCRIPT OR CSS FROM A CDN, NEVER USE THE INTEGRITY ATTRIBUTE, KEEP THE SCRIPT OR LINK TAG AS SIMPLE AS POSSIBLE, JUST LOAD THE ASSET

## RETURN FORMAT: VALID HTML WITH NO COMMENTARY OR MARKDOWN - JUST RAW HTML/CSS/JS DOCUMENT

Create something that directly fulfills the most recent build/create/update request and makes users say "This is exactly what I asked for!"`;

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

// This duplicate init function is being removed as it contains undefined function calls.
// The properly implemented init function is defined earlier in the file.
// Keeping this comment as a placeholder for reference.

// Start the application
init();