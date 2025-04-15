

import logger from "../../utils/logger.js";
import supabaseService, { Message } from "../supabase.js";
import pusherService from "../pusher.js";
import analyzeMessageForVisualizationIntent from "../ai/analyzeMessageForVisualizationIntent";
import generateAITextResponse from "../ai/generateAITextResponse";
import generateHTMLContent from "../ai/generateHTMLContent.js";
import generateCanvas from "./generateCanvas";

interface Agent {
  id: string;
  name: string;
  description?: string;
  personality_prompt?: string;
  avatar_url?: string;
}

async function generateTravisCanvas(canvasId: string, messages: any[], prompt: string, roomId: string): Promise<any> {
  // This is a simplified implementation that doesn't depend on external modules
  logger.info(`Generating canvas visualization for canvas ${canvasId}`);
  return await generateCanvas(canvasId, messages, prompt, roomId);
}


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

## Last Generation
${lastGenerationHtml}

Only use this as inspiration if appropriate

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
         const generation  = await generateTravisCanvas("canvas-1744521365054", [], htmlPrompt, roomId);

         console.log("DREAM");
         console.log("DREAM");
         console.log("DREAM");
         console.log("DREAM");
         console.log("DREAM");
         console.log("DREAM");
         console.log("DREAM");
         console.log("DREAM");

         console.log({ generation });
          await pusherService.sendNewGeneration(
            roomId,
            generation.id,
            "new-generation",
            generation.created_at || new Date().toISOString()
          );
  

     

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
        return true;
      } catch (e) {
        logger.error("Error calling canvas visualization function:", e);
      }
    } // Close the if (shouldGenerateHtml) block

    return true;
  } catch (error) {
    logger.error("Error in generateResponseWithAgent:", error instanceof Error ? error.message : String(error));
    return false;
  }
}

export default generateResponseWithAgent;