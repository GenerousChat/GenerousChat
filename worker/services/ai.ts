import { generateText, generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import config from "../config/index.js";
import logger from "../utils/logger.js";
import supabaseService, { Message } from "./supabase.js";
import pusherService from "./pusher.js";
import shouldAgentRespond from "../utils/shouldAgentRespond.js";
import { generateCanvasVisualization as generateCanvas } from "./ai/generateCanvas";
import selectBestAgent from "./ai/selectBestAgent";
interface Agent {
  id: string;
  name: string;
  description?: string;
  personality_prompt?: string;
  avatar_url?: string;
}


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
};

// Export as default for compatibility with existing imports
const aiService = {
  analyzeMessageForVisualizationIntent,
  selectBestAgent,
  generateAITextResponse,
  generateHTMLContent,
  generateAIResponse,
  shouldAgentRespond, 
};

export default aiService;
