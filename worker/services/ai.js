/**
 * AI service for generating responses and visualizations
 */
const { generateText, generateObject } = require("ai");
const { openai } = require("@ai-sdk/openai");
const { google } = require("@ai-sdk/google");
const { z } = require("zod");
const config = require("../config");
const logger = require("../utils/logger");
const supabaseService = require("./supabase");
const pusherService = require("./pusher");


/**
 * Analyze a message for visualization intent
 * @param {Object} message - Message object
 * @returns {Promise<number>} Confidence score (0-1)
 */
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
      logger.debug("AI analysis result structure:", result);

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
        // Check for response structure
        else if (
          result.response &&
          typeof result.response === "object" &&
          result.response.body &&
          result.response.body.output &&
          result.response.body.output[0] &&
          result.response.body.output[0].content
        ) {
          const content = JSON.parse(
            result.response.body.output[0].content.text
          );
          score = content.score;
          reason = content.reason;
        }

        if (typeof score === "number") {
          confidence = score / 100;
          logger.info(
            `AI analysis of visualization intent: ${confidence * 100}% confidence. Reason: ${reason || "No reason provided"}`
          );
        } else {
          logger.warn(
            "Could not find valid score in AI response, using keyword-based confidence"
          );
        }
      } else {
        logger.warn(
          "AI analysis returned invalid result, using keyword-based confidence"
        );
      }
    } catch (aiError) {
      logger.error("Error getting AI analysis of message:", aiError);
    }
  }

  return confidence;
}

/**
 * Select the best AI agent for a conversation
 * @param {string} roomId - Room ID
 * @param {Object} lastUserMessage - Last user message
 * @param {Array} messageHistory - Message history
 * @returns {Promise<Object>} Selected agent or null if no agents available
 */
async function selectBestAgent(roomId, lastUserMessage, messageHistory) {
  try {
    // Get AI agents from the service
    const aiAgents = await supabaseService.fetchAIAgents();

    // Log the number of agents available for debugging
    logger.info(`Selecting from ${aiAgents.length} available AI agents`);

    if (!aiAgents || aiAgents.length === 0) {
      // No agents available, return null
      logger.info("No AI agents available in the database");
      return null;
    }

    // If there's only one agent, return it immediately
    if (aiAgents.length === 1) {
      logger.info(`Only one agent available, selecting ${aiAgents[0].name}`);
      return aiAgents[0];
    }

    // Get the last generation HTML for context
    const lastGeneration = await supabaseService.getLastGeneration(roomId);
    const lastGenerationHtml = lastGeneration?.html || "";

    // Create a prompt for agent selection
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

    logger.debug("AI agent selection result:", result);

    // Parse the response to get the agent confidences
    let selectedAgents = [];

    if (
      result.response &&
      result.response.body &&
      result.response.body.output &&
      result.response.body.output[0] &&
      result.response.body.output[0].content
    ) {
      const content = result.response.body.output[0].content;
      if (typeof content === "object" && content.text) {
        selectedAgents = JSON.parse(content.text).agents_confidence;
      } else if (typeof content === "string") {
        selectedAgents = JSON.parse(content).agents_confidence;
      }
    }

    logger.debug("Selected agents:", selectedAgents);

    // Map agent IDs to names and confidences for logging
    const agentNamesAndConfidence = selectedAgents.map((agent) => {
      const agentInfo = aiAgents.find((a) => a.id === agent.agent_id);
      return {
        name: agentInfo?.name || "Unknown Agent",
        confidence: agent.confidence,
      };
    });

    logger.info(
      "Selected agent names and confidence:",
      agentNamesAndConfidence
    );

    // Find the agent with the highest confidence
    const highestConfidenceAgent = agentNamesAndConfidence.reduce(
      (prev, current) =>
        prev.confidence > current.confidence ? prev : current,
      { confidence: 0 }
    );

    logger.info(
      "Selected agent with highest confidence:",
      highestConfidenceAgent
    );

    // Return the selected agent or the first agent if none was found
    const selectedAgent = aiAgents.find(
      (a) => a.name === highestConfidenceAgent.name
    );
    if (selectedAgent) {
      logger.info(`Selected agent: ${selectedAgent.name}`);
      return selectedAgent;
    } else {
      // If we couldn't find the agent with the highest confidence, use the first one
      logger.info(
        `No suitable agent found, selecting first agent: ${aiAgents[0].name}`
      );
      return aiAgents[0];
    }
  } catch (error) {
    logger.error("Error selecting best agent:", error);

    // If there was an error but we have agents, return the first one
    if (aiAgents && aiAgents.length > 0) {
      logger.info(
        `Error in agent selection, using first agent: ${aiAgents[0].name}`
      );
      return aiAgents[0];
    }

    // If all else fails, return null
    logger.info("No agents available after error");
    return null;
  }
}

/**
 * Generate an AI text response
 * @param {string} prompt - Prompt for the AI
 * @returns {Promise<string>} Generated text
 */
async function generateAITextResponse(prompt) {
  try {
    const { text } = await generateText({
      model: openai.responses("gpt-4o"),
      prompt: prompt,
      maxTokens: 4000,
      temperature: 0.8,
    });

    return text;
  } catch (error) {
    logger.error("Error generating AI text response:", error);
    throw error;
  }
}

/**
 * Generate HTML content
 * @param {string} prompt - Prompt for the AI
 * @returns {Promise<string>} Generated HTML
 */
async function generateHTMLContent(prompt) {
  try {
    const { text: htmlContent } = await generateText({
      model: openai.responses("o3-mini"),
      prompt: prompt,
      maxTokens: 35500,
      temperature: 0.8,
    });

    return htmlContent;
  } catch (error) {
    logger.error("Error generating HTML content:", error);
    throw error;
  }
}

/**
 * Generate AI response based on recent messages
 * @param {string} roomId - Room ID
 * @returns {Promise<boolean>} Success status
 */
async function generateAIResponse(roomId) {
  try {
    logger.info("Generating AI response based on recent messages...");

    // Fetch messages for the specific room
    const { data: roomMessages, error: messagesError } = await supabaseService.supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (messagesError) {
      logger.error("Error fetching messages:", messagesError);
      return false;
    }

    // If no messages in this room, skip
    if (!roomMessages || roomMessages.length === 0) {
      logger.info("No messages found for room:", roomId);
      return false;
    }

    // Get the last message to analyze for visualization intent
    const lastUserMessage = roomMessages[roomMessages.length - 1];

    // Check if the last message is from an AI agent
    const isLastMessageFromAgent = await supabaseService.isUserAnAgent(lastUserMessage.user_id);
    if (isLastMessageFromAgent) {
      logger.info("Last message was from an AI agent, skipping response");
      return false;
    }

    // Analyze the message for visualization intent
    const visualizationConfidence =
      await analyzeMessageForVisualizationIntent(lastUserMessage);

    // Determine if we should generate HTML based on confidence score
    const shouldGenerateHtml =
      visualizationConfidence > 0.7
        ? true
        : visualizationConfidence > 0.3
          ? Math.random() < visualizationConfidence
          : Math.random() < 0.1; // Very low chance for low confidence messages

    logger.info(
      `HTML generation: Visualization confidence: ${visualizationConfidence * 100}%, Final decision: ${shouldGenerateHtml}`
    );

    // Use all fetched messages (we already limited to 50 in the query)
    const lastMessages = roomMessages;

    // Get user IDs from messages to fetch their names
    const userIds = [...new Set(lastMessages.map((msg) => msg.user_id))];
    logger.debug("User IDs to fetch:", userIds);

    // Fetch user profiles
    const userNames = await supabaseService.getUserProfiles(userIds);

    // For any user IDs not found in profiles, check if they're agents
    const missingUserIds = userIds.filter(id => !userNames[id]);
    
    if (missingUserIds.length > 0) {
      // Get agent profiles for missing users
      const agentNames = await supabaseService.getAgentProfiles(missingUserIds);
      
      // Merge agent names into userNames
      Object.assign(userNames, agentNames);
    }

    // Format messages for the prompt with user names
    const messageHistory = lastMessages
      .map((msg) => {
        let userName = userNames[msg.user_id];

        // If still no name found, use a generic name
        if (!userName) {
          userName = "User";
        }

        // Final fallback
        userName = userName || "Unknown User";

        return `${userName}: ${msg.content}`;
      })
      .join("\n");

    // Get the last generation HTML for context
    const lastGeneration = await supabaseService.getLastGeneration(roomId);
    const lastGenerationHtml = lastGeneration?.html || "";

    // Select the best agent for the conversation
    const selectedAgent = await selectBestAgent(
      roomId,
      lastUserMessage,
      messageHistory
    );

    if (!selectedAgent) {
      logger.info("No suitable agent found for this conversation");

      // Attempt to fetch agents directly from the database as a fallback
      try {
        const { data: agents, error } = await supabaseService.supabase
          .from("agents")
          .select("*")
          .limit(1);

        if (error) {
          logger.error("Error fetching fallback agent:", error);
          return false;
        }

        if (agents && agents.length > 0) {
          logger.info(`Using fallback agent: ${agents[0].name}`);
          // Continue with the fallback agent
          return await generateResponseWithAgent(
            roomId,
            agents[0],
            lastUserMessage,
            messageHistory,
            lastGenerationHtml
          );
        } else {
          logger.error("No agents available in the database");
          return false;
        }
      } catch (fallbackError) {
        logger.error("Error in fallback agent selection:", fallbackError);
        return false;
      }
    }

    // Generate response with the selected agent
    return await generateResponseWithAgent(
      roomId,
      selectedAgent,
      lastUserMessage,
      messageHistory,
      lastGenerationHtml
    );
  } catch (error) {
    logger.error("Error generating AI response:", error);
    return false;
  }
}

/**
 * Generate a response with a specific agent
 * @param {string} roomId - Room ID
 * @param {Object} agent - The agent to use for response
 * @param {Object} lastUserMessage - Last user message
 * @param {string} messageHistory - Formatted message history
 * @param {string} lastGenerationHtml - Last HTML generation
 * @returns {Promise<boolean>} Success status
 */
async function generateResponseWithAgent(
  roomId,
  agent,
  lastUserMessage,
  messageHistory,
  lastGenerationHtml
) {
  try {
    // Create the prompt with stronger constraints and focus on responding to the last message
    const prompt = `
      The following is a chat conversation:
      ${messageHistory}
      
      Last Generation HTML:
      ${lastGenerationHtml}

      Expert Prompt:
      ${agent.personality_prompt}

      Focus on responding directly to the last message in the conversation. Your response should reflect the topic and tone of the conversation, especially addressing what "${lastUserMessage.content}" is about.
    `;

    logger.debug("Sending prompt to OpenAI");

    // Generate text using OpenAI with stricter constraints
    const text = await generateAITextResponse(prompt);
    logger.debug("AI generated response:", text);

    // Save the regular AI response to the Supabase database
    await supabaseService.saveMessage(roomId, agent.id, text);
    logger.info("AI response saved to database for room:", roomId);

    // Determine if we should generate HTML based on confidence score
    // This should be passed from the parent function, but we'll recalculate it here for safety
    const visualizationConfidence =
      await analyzeMessageForVisualizationIntent(lastUserMessage);
    const shouldGenerateHtml =
      visualizationConfidence > 0.7
        ? true
        : visualizationConfidence > 0.3
          ? Math.random() < visualizationConfidence
          : Math.random() < 0.1; // Very low chance for low confidence messages

    logger.info(
      `HTML generation in agent response: Visualization confidence: ${visualizationConfidence * 100}%, Final decision: ${shouldGenerateHtml}`
    );

    // If we should generate HTML, create and send a special HTML visualization message
    if (shouldGenerateHtml) {
      logger.info("Generating HTML content based on conversation...");

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
${text}

MAKE SURE YOUR SOLUTION INVOLVES EVERYTHING, DON"T WORRY ABOUT HOW BIG THE FILE IS

IF YOU LOAD JAVASCRIPT OR CSS FROM A CDN, NEVER USE THE INTEGRITY ATTRIBUTE, KEEP THE SCRIPT OR LINK TAG AS SIMPLE AS POSSIBLE, JUST LOAD THE ASSET

## RETURN FORMAT: VALID HTML WITH NO COMMENTARY OR MARKDOWN - JUST RAW HTML/CSS/JS DOCUMENT

Create something that directly fulfills the most recent build/create/update request and makes users say "This is exactly what I asked for!"`;

      // Generate HTML content
      const htmlContent = await generateHTMLContent(htmlPrompt);
      logger.info("HTML content generated, length:", htmlContent.length);

      try {
        // Store the generation in the database
        const generation = await supabaseService.saveGeneration(
          roomId,
          htmlContent,
          "Generated a visual summary of this conversation",
          agent.id, // Use the passed agent ID, not selectedAgent
          "visualization",
          {
            model: "o3-mini",
            messageCount: messageHistory.split("\n").length, // Estimate message count from history
          }
        );

        // Send a notification to clients about the new generation
        await pusherService.sendNewGeneration(
          roomId,
          generation.id,
          "visualization",
          generation.created_at
        );

        logger.info(
          "Notification sent to clients about new generation:",
          generation.id
        );
      } catch (error) {
        logger.error("Error saving HTML generation:", error);
      }
    } // Close the if (shouldGenerateHtml) block

    return true;
  } catch (error) {
    logger.error("Error in generateResponseWithAgent:", error);
    return false;
  }
}

module.exports = {
  generateAIResponse,
  analyzeMessageForVisualizationIntent,
  selectBestAgent,
  generateAITextResponse,
  generateHTMLContent
};
