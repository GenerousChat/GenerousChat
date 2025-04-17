

import logger from "../../utils/logger.js";
import supabaseService, { Message } from "../supabase.js";
import pusherService from "../pusher.js";
import analyzeMessageForVisualizationIntent from "../ai/analyzeMessageForVisualizationIntent";
import generateAITextResponse from "../ai/generateAITextResponse";
// import generateHTMLContent from "../ai/generateHTMLContent.js";
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createXai } from "@ai-sdk/xai";
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';

interface Agent {
  id: string;
  name: string;
  description?: string;
  personality_prompt?: string;
  avatar_url?: string;
}

const xai = createXai({
	apiKey: process.env.XAI_API_KEY,
});

async function generateResponseWithAgent(
  roomId: string,
  agent: Agent,
  lastUserMessage: Message,
  messageHistory: string,
  lastGenerationHtml: string
): Promise<boolean> {
  try {


    /*
    messageHistory (10-30)
    lastGenerationHtml 
    lastUserMessage
    agentCasualMessage (100-200 chars)
    agentExpertMessage (1000 chars) 

    visualizationConfidencePrompt (sent to client be rendered in chat)
    agentCasualPrompt (sent to client be rendered in chat)
    agentExpertPrompt (sent to the htmlGenerationPrompt)
    htmlGenerationPrompt (stored in database)
    
    */

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

    //// ==== START AGENT CASUAL REPLY ====

    const agentCasualPrompt = `
    ##Context:
    You are in an online audio chat room participating in a conversation with multiple people. The room is a collaborative space and has a canvas that often contains visualizations, diagrams, or other interactive elements that enhance the discussion. This is the current canvas: ${lastGenerationHtml}
    
    ##Task:
    You are responding to the most recent message in this group chat: ${messageHistory}. You were chosen to respond based on your personality and expertise, it is VITAL that you RESPOND IN CHARACTER! You must assume and maintain all aspects of the following persona: ${agent.personality_prompt}.

    ##Instructions:
    Reply to the following message: ${lastUserMessage.content} Your response should be consistent with the tone and style of the discussion. Ensure your reply is relevant to the message and pertinent to the topic at hand. Ensure your response fits the style and context of the conversation, you may use the full range of human expression, whether that is casual chat, banter or humor, asking questions, offering advice, providing information, or any other socially appropriate input. Your response must be relevant, consistent with your personality, and must keep the conversation flowing naturally while also addressing the needs of the users in the room. Do not preface your response with a name, your name is already in the chat ui.
    
Your response should be short and pithy, one to two sentences at most. You may use emojis, gifs, or other media to enhance your response. Your response should be in the same format as the original message, and you should not include any additional commentary or explanations.:
`;

    const agentCasualResponse = await generateAITextResponse(agentCasualPrompt, {
      tokens: 150,
      temperature: 0.9,
    });

    await supabaseService.saveMessage(roomId, agent.id, agentCasualResponse);
    logger.info("AI response saved to database");

    // ==== END AGENT CASUAL REPLY ==== 


    // If the confidence for a visualization is high, generate HTML content
    if (shouldGenerateHtml) {
        // Generate a unique slug for the generation
        const slug = uniqueNamesGenerator({
          dictionaries: [adjectives, animals],
          separator: '_',
          style: 'lowerCase',
        });
        
        // Create an empty generation row first
        const { data: emptyGeneration, error: emptyInsertError } = await supabaseService.supabase
          .from("canvas_generations")
          .insert({
            canvas_id: roomId,
            html: null,
            render_method: 'fallback_iframe',
            summary: `Visualization in progress...`,
            created_by: 'e92d83f8-b2cd-4ebe-8d06-6e232e64736a',
            type: "visualization",
            slug,
            room_id: roomId,
            metadata: {
              status: 'generating',
              fallback: true
            },
          })
          .select()
          .single();
          
        if (emptyInsertError) {
          logger.error("Error creating empty generation row:", emptyInsertError);
          return false;
        }
        
        // Send a notification to clients about the new generation (in progress)
        if (emptyGeneration && emptyGeneration.id) {
          await pusherService.sendNewGeneration(
            roomId,
            emptyGeneration.id,
            "new-generation",
            emptyGeneration.created_at || new Date().toISOString(),
            slug
          );

          logger.info(
            "Notification sent to clients about new generation (in progress):",
            emptyGeneration.id
          );
        }


// Create a prompt specifically for HTML visualization
const htmlPrompt = `
# Canvas Generation Guide- You are controlling a canvas that is visible to all participants in a group chat. The canvas is a collaborative space that reflects the following conversation: ${messageHistory} and the requests made by participants. You are in charge of writing the code that will be rendered onto the canvas. When deciding how to create the new generation or update the canvas use the following guidelines to determine what to build:

## User Intent- Choose the appropriate framework based on the user intent expressed in the most recent message, ${lastUserMessage.content}. If the user intent in the message, ${lastUserMessage.content} is to add to, modify, change, update or otherwise make an adjustment to the existing visualization then use the current canvas found here: ${lastGenerationHtml} and alter the generation to comply with the user's request. Follow the request as closely as possible, changing only the elements the user specifies should be altered. If the user says that an element is broken or not working regenerate the visualization with a different approach for the broken element.
- Always strive to satisfy the current visualization request with as much fidelity and detail as possible. 
- Create something that directly fulfills the user request and makes users say "This is exactly what I asked for!"
- You are not a chat agent, your job is to create a new canvas or update the existing one based on the user request, you cannot interact with the user directly or clarify intents.
- Generate controls for mobile where possible, and ensure that the canvas is responsive and works well on all devices.
- Add event listeners for mobile and desktop where appropriate.

## Canvas Rules
- **IMPORTANT: Only render the html and do not include any comments or markdown or code blocks**
- Everything you generate will be rendered directly in the sidebar, only render the html and do not include any comments or markdown or code blocks. 
- Everything must be rendered in html in the sidebar and must be responsive.
- Keep every visualization centered in the viewport
- Use responsive design principles to create the best possible user experience
- Match the right tool/library to the request and check for dependencies
- Where possible use libraries that are more performant and have less dependencies.
- Prioritize user experience and pixel perfect design aesthetics.
- Visuals may be rendered with react components and babel for pure html/css. 
- Don't use WebGL as it does not work in the sidebar 

## Technology Selection - Use the list below as a guideline for which tools are preferred, you may substitute better js frameworks where applicable.
- Interactive tools → Use the javascript framework best fitted for the specific tool
- Data/statistics → Use D3.js or Chart.js 
- Timelines/processes → Use TimelineJS or vis.js
- 3D objects/spaces → Use babylon js
- Creative explanations → Use SVG/Canvas/p5.js or paper js for illustrations
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
- For interactive elements, use clear and intuitive controls
- Provide clear visual cues for how to interact with your creation
- Add thoughtful interactivity that improves understanding
- Make sure to INCLUDE EVENT LISTENERS for user interactions
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
    

				const htmlGenerationModel = process.env.USE_XAI ? xai("grok-3-beta") : openai(process.env.DEBUG_MODEL || 'o3-mini');
         const { text: htmlContent } = await generateText({
          model: htmlGenerationModel,
          temperature: 0.9,
          prompt: htmlPrompt,
          maxTokens: 10000,
        });

				console.log("BIGTESTTTTTTTTTT", htmlContent)


        // Update the existing generation with the completed content
        const { data: updatedGeneration, error: updateError } = await supabaseService.supabase
          .from("canvas_generations")
          .update({
            html: htmlContent,
            agent_expert_response: 'lisa hated expert prompts',
            summary: `Visualization for: ${lastUserMessage.content.substring(0, 50)}${lastUserMessage.content.length > 50 ? '...' : ''}`,
            metadata: {
              status: 'completed',
              fallback: true
            },
						listener_name: process.env.HOME
          })
          .eq('id', emptyGeneration.id)
          .select()
          .single();

         console.log("DREAM");
         console.log("DREAM");
         console.log("DREAM");
         console.log("DREAM");
         console.log("DREAM");
         console.log("DREAM");
         console.log("DREAM");
         console.log("DREAM");

         console.log({ updatedGeneration });
         console.log("Attempting to push notification about completed generation");

        // Send a notification to clients about the completed generation
        if (updatedGeneration && updatedGeneration.id) {
          await pusherService.sendNewGeneration(
            roomId,
            updatedGeneration.id,
            "generation-completed",
            updatedGeneration.created_at || new Date().toISOString(),
            slug
          );

          logger.info(
            "Notification sent to clients about completed generation:",
            updatedGeneration.id
          );
        } else {
          logger.warn("Cannot send notification: updated generation ID is undefined");
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