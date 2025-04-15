/**
 * AI service for generating responses and visualizations
 */
import { generateText, generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import config from "../config/index.js";
import logger from "../utils/logger.js";
import supabaseService, { Message, Participant } from "./supabase.js";
import pusherService from "./pusher.js";
import shouldAgentRespond from "../utils/shouldAgentRespond.js";
import { createXai } from "@ai-sdk/xai";
// Import placeholder for canvas visualization - to be implemented in worker context
import { generateCanvasVisualization as generateCanvas } from "../../app/api/canvas/generate-visualization/generateCanvas";
interface Agent {
  id: string;
  name: string;
  description?: string;
  personality_prompt?: string;
  avatar_url?: string;
}

interface VisualizationAnalysisResult {
  score: number;
  reason: string;
}

interface AgentConfidence {
  agent_id: string;
  confidence: number;
}

interface AgentSelectionResult {
  agents_confidence: AgentConfidence[];
}

// Initialize XAI client if API key is available
const xai = createXai({
  apiKey: process.env.XAI_API_KEY,
});

/**
 * Function to generate canvas visualizations - imported from external module
 * This is a placeholder as the actual function is imported from a different location
 */
// Import directly in the places where it's used or define a mock function if needed
async function generateTravisCanvas(canvasId: string, messages: any[], prompt: string, roomId: string): Promise<any> {
  // This is a simplified implementation that doesn't depend on external modules
  logger.info(`Generating canvas visualization for canvas ${canvasId}`);
  return await generateCanvas(canvasId, messages, prompt, roomId);
  // Return a mock canvas visualization result
  return {
    id: `canvas-${Date.now()}`,
    created_at: new Date().toISOString(),
    content: "<div>Canvas visualization placeholder</div>",
    type: "visualization"
  };
}

/**
 * Analyze a message for visualization intent
 * @param lastUserMessage - Last user message
 * @param lastGenerationHtml - Last HTML generation
 * @param messageHistory - Message history
 * @returns Confidence score (0-1)
 */
async function analyzeMessageForVisualizationIntent(
  lastUserMessage: Message,
  lastGenerationHtml: string,
  messageHistory: string
): Promise<number> {
  let confidence = 0;

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

  const visualizationEvalPrompt = `You are an AI that analyzes whether a message is requesting a visualization. You are controlling a canvas that is visible to all participants in a group chat. The canvas is a collaborative space updated based on the conversation and the requests made by participants. It often contains visualizations, diagrams, games, or other interactive elements that enhance the conversation. When deciding whether to generate or update the canvas conduct the following steps:

  1. Analyze the most recent message, ${lastUserMessage.content}, for canvas generation requests. Look for imperatives, commands, explicit requests that ask for something to be built, created, generated, visualized, rendered, or updated. Check for key phrases that indicate a request like "can you", "could you", "build", "create", "generate", "make", "show me", "visualize", etc. You can also refer to the following list of keywords that suggest a visualization request, ${visualizationKeywords}, if the message contains any of these treat it is likely a canvas generation request. 
  
  2. Try to interpret the users intent, checking whether there is an implicit request or intent to change the canvas, and when ambiguous use the following conversation history to better understand context and decide if generation is needed: 
  ${messageHistory}
  
  3. Ignore casual conversation and messages that don't request anything, only respond to implied or explicit requests to generate or modify a canvas.  
  
  4. If the user requests to change, update, modify, or add to the canvas, use the following canvas as a starting point and modify only the parts that the user specifically says they wish to change: 
  ${lastGenerationHtml}.`;

  // For more accurate analysis, use the AI to evaluate
  try {
    // Use generateObject with Zod schema as per the latest docs
    const result = await generateObject({
      model: openai.responses("gpt-4o"),
      schema: z.object({
        score: z
          .number()
          .describe(
            "A score from 0 to 100 indicating the likelihood that the user is requesting something to be generated"
          ),
        reason: z
          .string()
          .describe("A brief explanation of why this score was given"),
      }),
      prompt: visualizationEvalPrompt,
      temperature: 0.1,
    });

    // Safely access properties with fallbacks
    if (result && typeof result === "object") {
      // Try to find score and reason properties at any level based on the actual structure
      let score: number | undefined;
      let reason: string | undefined;

      // Check for direct properties
      if ("score" in result && typeof result.score === 'number') {
        score = result.score;
        reason = "reason" in result && typeof result.reason === 'string' ? result.reason : 'No reason provided';
      }
      // Check for object.score structure
      else if (result.object && typeof result.object === "object" && "score" in result.object && typeof result.object.score === 'number') {
        score = result.object.score;
        reason = "reason" in result.object && typeof result.object.reason === 'string' ? result.object.reason : 'No reason provided';
      }
      // Check for analysis structure
      else if ('analysis' in result && result.analysis && typeof result.analysis === "object") {
        // Use type-safe property access
        if ('score' in result.analysis && typeof result.analysis.score === 'number') {
          score = result.analysis.score;
        }
        if ('reason' in result.analysis && typeof result.analysis.reason === 'string') {
          reason = result.analysis.reason;
        }
      }
      // Check for response structure
      else if ('response' in result && result.response) {
        try {
          // Use type-safe property access with optional chaining
          const responseObj = result.response as Record<string, any>;
          if (responseObj.body && 
              typeof responseObj.body === 'object' && 
              'output' in responseObj.body && 
              Array.isArray(responseObj.body.output) && 
              responseObj.body.output.length > 0 && 
              responseObj.body.output[0]?.content?.text) {
            
            const content = JSON.parse(responseObj.body.output[0].content.text);
            if (typeof content === 'object' && content !== null) {
              if ('score' in content && typeof content.score === 'number') {
                score = content.score;
              }
              if ('reason' in content && typeof content.reason === 'string') {
                reason = content.reason;
              }
            }
          }
        } catch (parseError) {
          logger.error("Error parsing AI response:", parseError);
        }
      }

      if (typeof score === "number") {
        confidence = score / 100;
        logger.info(
          `AI analysis of generation intent: ${confidence * 100}% confidence. Reason: ${reason || "No reason provided"}`
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
    logger.error("Error getting AI analysis of message:", aiError instanceof Error ? aiError.message : String(aiError));
  }

  return confidence;
}

/**
 * Select the best AI agent for a conversation
 * @param roomId - Room ID
 * @param lastUserMessage - Last user message
 * @param messageHistory - Message history
 * @returns Selected agent or null if no agents available
 */
async function selectBestAgent(
  roomId: string, 
  lastUserMessage: Message, 
  messageHistory: string
): Promise<Agent | null> {
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
      return aiAgents[0] as Agent;
    }

    // Get the last generation HTML for context
    const lastGeneration = await supabaseService.getLastGeneration(roomId);
    const lastGenerationHtml = lastGeneration?.html || "";

    // Create a prompt for agent selection
    const prompt = `
You are controlling a group of AI agents with distinct personalities. Each agent has its own unique perspective and expertise. Your task is to analyze the last message in the conversation and determine if any of the agents should respond. Consider the context of the conversation, the personalities of the agents, and the content of the last message.
 
First, decide whether it is converationally appropriate to respond. You should engage in natural conversation within the group, adapting to the current social context and being careful not to let any one agent dominate the conversation. 

If a response is warranted, then decide which agent will respond by judging how likely each agent is to offer meaningful contributions to the conversation, based on their personality and the context of the conversation. Only respond if you are confident that it is converationally appropriate and the agent's personality aligns with the topic of the last message.

Based on these constraints, analyze the following message and rank the confidence interval for each agent:      
      Agents:
      ${aiAgents
        .map(
          (agent) => `
        Agent Name:
        ${agent.name}: 
        Agent Id: 
        ${agent.id}
        Agent Personality:
        ${(agent as any).personality_prompt || "No personality defined"}
      `
        )
        .join("\n\n\n")}

      This is the current conversation canvas, only use it in ranking if it is extremely relevant.
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

    let selectedAgents: AgentConfidence[] = [];
    
    try {
      // Use type assertion to safely access nested properties
      const responseObj = result.response as Record<string, any>;
      
      // Check if we have the expected nested structure
      if (responseObj?.body && 
          typeof responseObj.body === 'object' && 
          'output' in responseObj.body && 
          Array.isArray(responseObj.body.output) && 
          responseObj.body.output.length > 0 && 
          responseObj.body.output[0]?.content && 
          Array.isArray(responseObj.body.output[0].content) && 
          responseObj.body.output[0].content.length > 0 && 
          responseObj.body.output[0].content[0]?.text) {
        
        // Parse the JSON text from the first content item
        const parsedData = JSON.parse(
          responseObj.body.output[0].content[0].text
        );
        if (parsedData.agents_confidence) {
          selectedAgents = parsedData.agents_confidence;
          logger.debug(
            "Successfully parsed agent confidences:",
            selectedAgents
          );
        }
      }
    } catch (error) {
      logger.error("Error parsing agent selection result:", error instanceof Error ? error.message : String(error));
    }

    if (selectedAgents.length === 0) {
      return null;
    }

    // Map agent IDs to names and confidences for logging
    const agentConfidenceMap = selectedAgents.reduce<Record<string, number>>(
      (acc, item) => {
        acc[item.agent_id] = item.confidence;
        return acc;
      },
      {}
    );

    logger.info(
      "Agent selection confidence scores:",
      JSON.stringify(agentConfidenceMap)
    );

    // Sort agents by confidence (descending)
    selectedAgents.sort((a, b) => b.confidence - a.confidence);

    // If highest confidence is below threshold, don't select any agent
    if (selectedAgents[0].confidence < 0.05) {
      logger.info(
        `Highest agent confidence (${selectedAgents[0].confidence}) is below threshold, not selecting any agent`
      );
      return null;
    }

    // Find the agent with the highest confidence
    const bestAgentId = selectedAgents[0].agent_id;
    const bestAgent = aiAgents.find((agent) => agent.id === bestAgentId);

    if (!bestAgent) {
      logger.warn(
        `Selected agent ID ${bestAgentId} not found in available agents`
      );
      return null;
    }

    logger.info(
      `Selected agent: ${bestAgent.name} (ID: ${bestAgent.id}) with confidence ${selectedAgents[0].confidence}`
    );
    return bestAgent as Agent;
  } catch (error) {
    logger.error("Error selecting best agent:", error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Generate an AI text response
 * @param prompt - Prompt for the AI
 * @returns Generated text
 */
async function generateAITextResponse(prompt: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt,
      temperature: 0.8,
      maxTokens: 300, // Adjust as needed for response length
    });


    return text;
  } catch (error) {
    logger.error("Error generating AI text response:", error instanceof Error ? error.message : String(error));
    return "I'm having trouble generating a response right now. Please try again.";
  }
}

/**
 * Generate HTML content
 * @param prompt - Prompt for the AI
 * @returns Generated HTML
 */
async function generateHTMLContent(prompt: string): Promise<string> {
  try {
    // First attempt - use AI to generate HTML content
    const { text: htmlResponse } = await generateText({
      model: openai("o3-mini"),
      prompt,
      temperature: 0.7,
    });

    // Check if the response is valid HTML
    if (htmlResponse.includes("<html") || htmlResponse.includes("<body") || htmlResponse.includes("<div")) {
      return htmlResponse;
    }

    // If we got a response but it's not valid HTML, try to extract HTML from it
    const htmlMatch = htmlResponse.match(/<html[\s\S]*<\/html>|<body[\s\S]*<\/body>|<div[\s\S]*<\/div>/i);
    if (htmlMatch && htmlMatch[0]) {
      return htmlMatch[0];
    }

    // If no HTML found, make a second attempt with more specific instructions
    const secondAttemptPrompt = `${prompt}\n\nVERY IMPORTANT: Respond ONLY with the raw HTML. Do not include any explanations, markdown formatting, or code block markers. Start your response with '<' and end with '>' for a proper HTML document or fragment.`;
    
    const { text: secondResponse } = await generateText({
      model: openai("gpt-4o"),
      prompt: secondAttemptPrompt,
      temperature: 0.5,
    });

    return secondResponse;
  } catch (error) {
    logger.error("Error generating HTML content:", error instanceof Error ? error.message : String(error));
    return `<div class="error-message">Sorry, I was unable to generate the visualization you requested.</div>`;
  }
}

/**
 * Generate AI response based on recent messages
 * @param roomId - Room ID
 * @returns Success status
 */
async function generateAIResponse(roomId: string): Promise<boolean> {
  try {
    logger.info(`Generating AI response for room ${roomId}`);

    // Fetch the most recent messages for the room
    const { data: messages, error } = await supabaseService.supabase
      .from(config.supabase.messagesTable)
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      logger.error("Error fetching recent messages:", error);
      return false;
    }

    // If no messages, don't generate a response
    if (!messages || messages.length === 0) {
      logger.info("No messages found for room, skipping AI response");
      return false;
    }

    // Get the most recent user message
    const lastUserMessage = messages[0] as Message;
    logger.info(`Last message: ${lastUserMessage.content}`);

    // Create a formatted message history for the AI
    const messageHistory = messages
      .slice(0, 25)
      .reverse()
      .map((msg: Message) => `- ${msg.user_id}: ${msg.content}`)
      .join("\n");

    // Check if this message should receive an AI response
    // Create a compatible AgentResponseConfig object from the available config
    const agentResponseConfig = {
      timeThreshold: config.ai.responseAlgorithm.responseDelayMs,
      messageRateThreshold: config.ai.responseAlgorithm.maxConsecutiveUserMessages
    };
    
    const responseDecision = await shouldAgentRespond(
      roomId,
      messages as Message[],
      agentResponseConfig
    );

    if (!responseDecision.shouldRespond) {
      logger.info(
        `Skipping AI response: ${responseDecision.reason}`
      );
      return false;
    }

    // Select the best agent for this conversation
    const selectedAgent = await selectBestAgent(
      roomId,
      lastUserMessage,
      messageHistory
    );

    if (!selectedAgent) {
      logger.info("No suitable agent selected, skipping response");
      return false;
    }

    // Get the last HTML generation for context if it exists
    const lastGeneration = await supabaseService.getLastGeneration(roomId);
    const lastGenerationHtml = lastGeneration?.html || "";

    // Generate a response using the selected agent
    return await generateResponseWithAgent(
      roomId,
      selectedAgent,
      lastUserMessage,
      messageHistory,
      lastGenerationHtml
    );
  } catch (error) {
    logger.error("Error in generateAIResponse:", error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Mark messages as read by the AI
 * @param roomId - Room ID
 * @param messages - Messages to mark as read
 */
async function markMessagesAsRead(roomId: string, messages: Message[]): Promise<void> {
  try {
    if (!messages || messages.length === 0) {
      return;
    }

    // Get IDs of messages that haven't been read by AI
    const unreadMessageIds = messages
      .filter((msg) => !msg.read_by_ai)
      .map((msg) => msg.id);

    if (unreadMessageIds.length === 0) {
      return;
    }

    logger.info(`Marking ${unreadMessageIds.length} messages as read by AI`);

    // Update the messages in the database
    const { error } = await supabaseService.supabase
      .from(config.supabase.messagesTable)
      .update({ read_by_ai: true })
      .in("id", unreadMessageIds);

    if (error) {
      logger.error("Error marking messages as read:", error);
    }
  } catch (error) {
    logger.error("Error in markMessagesAsRead:", error instanceof Error ? error.message : String(error));
  }
}

/**
 * Generate a response with a specific agent
 * @param roomId - Room ID
 * @param agent - The agent to use for response
 * @param lastUserMessage - Last user message
 * @param messageHistory - Formatted message history
 * @param lastGenerationHtml - Last HTML generation
 * @returns Success status
 */
async function generateResponseWithAgent(
  roomId: string,
  agent: Agent,
  lastUserMessage: Message,
  messageHistory: string,
  lastGenerationHtml: string
): Promise<boolean> {
  try {
    logger.info(`Generating response with agent: ${agent.name}`);

    // Check if the message is asking for a visualization
    const visualizationConfidence = await analyzeMessageForVisualizationIntent(
      lastUserMessage,
      lastGenerationHtml,
      messageHistory
    );

    const shouldGenerateHtml = visualizationConfidence > 0.5;
    logger.info(
      `Visualization confidence: ${visualizationConfidence}. Will ${
        shouldGenerateHtml ? "" : "not "
      }generate HTML`
    );

    // Create the prompt for the AI based on the agent's personality
    const agentPrompt = `
You are ${agent.name}, an AI assistant with the following personality:
${agent.personality_prompt || "You are a helpful, friendly assistant."}

The conversation so far:
${messageHistory}

The last message to respond to is:
${lastUserMessage.content}

Please provide a thoughtful, authentic response in character as ${agent.name}.
Make your response concise and conversational, ideally 1-3 sentences.
Keep your personality consistent and make sure your tone, language, and word choice match the given personality description.
Be playful, engaging, and humorous where appropriate.

Your response:
`;


    // Generate a text response
    const aiResponse = await generateAITextResponse(agentPrompt);
    


    // Ensure aiResponse is a string before using substring
    const responseText = typeof aiResponse === 'string' ? aiResponse : String(aiResponse);
    logger.info(`AI response generated: ${responseText.substring(0, 100)}...`);

    // Save the AI response to the database
    await supabaseService.saveMessage(roomId, agent.id, aiResponse);
    logger.info("AI response saved to database");

    // If the confidence for a visualization is high, generate HTML content
    if (shouldGenerateHtml) {
      // Create a prompt specifically for HTML visualization
      const htmlPrompt = `
# Visualization Generator

You are a visualization generator for a group chat. Your task is to create a custom HTML visualization or interactive element based on the latest request. 

## Conversation Information:
Most recent user message: ${lastUserMessage.content}
Chat history: ${messageHistory}

## Available Visualization Types:
- Charts/Graphs → Use D3.js or Chart.js
- Diagrams/Flowcharts → Use Mermaid.js
- Math concepts → use MathJax or KaTeX for math, or custom SVG
- Games/simulations → Use Phaser or p5.js, 
- Maps/locations → Use Leaflet.js or Mapbox GL JS
- Physics simulations → Use Matter.js or another physics engine
- Simple animations → Use CSS animations or GSAP
- Scientific visualizations → Use Plotly.js or Vega-Lite
- Youtube videos → Use lite YouTube embed
- Simple text/concepts → Use elegant typography

## Your Creation Requirements:
- Ensure responsive design that works well in the sidebar panel
- Create a visualization that directly fulfills the most recent build/create/update request, ${lastUserMessage.content}
- Optimize performance (lazy load libraries, efficient code) 
- Balance aesthetics with functionality - beautiful but purposeful
- Use libraries and technologies that fit the conversation needs
- Add thoughtful interactivity that improves understanding
- Provide clear visual cues for how to interact with your creation
- Include helpful annotations where appropriate
- Handle edge cases gracefully with fallbacks


## Implementation Details:
- IF YOU LOAD JAVASCRIPT OR CSS FROM A CDN, NEVER USE THE INTEGRITY ATTRIBUTE
- KEEP SCRIPTS OR LINK TAGS AS SIMPLE AS POSSIBLE, JUST LOAD THE ASSET
- RETURN FORMAT MUST BE VALID HTML WITH NO COMMENTARY OR MARKDOWN - JUST RAW HTML/CSS/JS DOCUMENT
- Use the latest stable versions of libraries
- You may use external libraries from trusted CDNs (cdnjs, unpkg, jsdelivr)
- The visualization must work immediately without setup steps
- Use appropriate semantic HTML and accessibility features
- Include fallback content if libraries fail to load
- Create smooth loading experience with transitions
- Make appropriate use of viewport dimensions
`;

      // Generate HTML content
      const htmlContent = await generateHTMLContent(htmlPrompt);
      logger.info("HTML content generated, length:", htmlContent.length);

      try {
        // Store the generation in the database
        const generation = await supabaseService.saveGeneration(
          roomId,
          htmlContent,
          "Generated a visual summary of this conversation",
          agent.id,
          "visualization",
          {
            model: "o3-mini",
            messageCount: messageHistory.split("\n").length, // Estimate message count from history
          }
        );

        // Generate canvas visualization if needed
        try {
          console.log("129o837198371398173918237189237191");
          console.log("129o837198371398173918237189237191");
          console.log("129o837198371398173918237189237191");
          console.log("129o837198371398173918237189237191");
          console.log("129o837198371398173918237189237191");
          console.log("129o837198371398173918237189237191");
          console.log("129o837198371398173918237189237191");
          console.log("129o837198371398173918237189237191");
          console.log("129o837198371398173918237189237191");
          console.log("129o837198371398173918237189237191");
         const someGeneration  = await generateTravisCanvas("canvas-1744521365054", [], htmlPrompt, roomId);

         console.log("DREAM");
         console.log("DREAM");
         console.log("DREAM");
         console.log("DREAM");
         console.log("DREAM");
         console.log("DREAM");
         console.log("DREAM");
         console.log("DREAM");

         console.log({ someGeneration });
          await pusherService.sendNewGeneration(
            roomId,
            someGeneration.id,
            "new-generation",
            someGeneration.created_at || new Date().toISOString()
          );
  

          return true;
        } catch (e) {
          logger.error("Error calling canvas visualization function:", e);
        }

        // Send a notification to clients about the new generation
        if (generation && generation.id) {
          await pusherService.sendNewGeneration(
            roomId,
            generation.id,
            "new-generation",
            generation.created_at || new Date().toISOString()
          );

          logger.info(
            "Notification sent to clients about new generation:",
            generation.id
          );
        } else {
          logger.warn("Cannot send notification: generation ID is undefined");
        }
      } catch (error) {
        logger.error("Error saving HTML generation:", error);
      }
    } // Close the if (shouldGenerateHtml) block

    return true;
  } catch (error) {
    logger.error("Error in generateResponseWithAgent:", error instanceof Error ? error.message : String(error));
    return false;
  }
}

// Export individual functions
export {
  analyzeMessageForVisualizationIntent,
  selectBestAgent,
  generateAITextResponse,
  generateHTMLContent,
  generateAIResponse,
  shouldAgentRespond,
  markMessagesAsRead,
};

// Export as default for compatibility with existing imports
const aiService = {
  analyzeMessageForVisualizationIntent,
  selectBestAgent,
  generateAITextResponse,
  generateHTMLContent,
  generateAIResponse,
  shouldAgentRespond, 
  markMessagesAsRead,
};

export default aiService;
