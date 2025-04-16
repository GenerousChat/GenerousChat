

import logger from "../../utils/logger.js";
import supabaseService, { Message } from "../supabase.js";
import pusherService from "../pusher.js";
import analyzeMessageForVisualizationIntent from "../ai/analyzeMessageForVisualizationIntent";
import generateAITextResponse from "../ai/generateAITextResponse";
// import generateHTMLContent from "../ai/generateHTMLContent.js";
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';

interface Agent {
  id: string;
  name: string;
  description?: string;
  personality_prompt?: string;
  avatar_url?: string;
}



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
    Reply to the following message: ${lastUserMessage.content} Your response should be consistent with the tone and style of the discussion. Ensure your reply is relevant to the message and pertinent to the topic at hand. Ensure your response fits the style and context of the conversation, you may use the full range of human expression, whether that is casual chat, banter or humor, asking questions, offering advice, providing information, or any other socially appropriate input. Your response must be relevant, consistent with your personality, and must keep the conversation flowing naturally while also addressing the needs of the users in the room.
    
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

        //// ==== START AGENT EXPERT REPLY ====
        // @todo - the expert reply should probably know abouts it initial casual reply so they have a lil fidelity
        const agentExpertPrompt = `
        You are ${agent.name}, an AI with the following personality: ${agent.personality_prompt}. 
        Use your expertise to create better visualizations and interactive elements for the shared canvas in online chat room. The current canvas is ${lastGenerationHtml}. Your task is to create a custom HTML visualization or interactive element based on this latest request: ${lastUserMessage.content} If you need more context, refer to the conversation history: ${messageHistory}. 

        Reply with the utmost technical acumen and provide all necessary details to render a more complex and technically accurate visualization.
        `;
        
        const agentExpertResponse = await generateAITextResponse(agentExpertPrompt, {
          tokens: 850,
          temperature: 0.9,
        });
    
        // ==== END AGENT EXPERT REPLY ==== 

        console.log("XXXXXXXXX");
        console.log("XXXXXXXXX");
        console.log("XXXXXXXXX");
        console.log("XXXXXXXXX");
        console.log("XXXXXXXXX");
        console.log("XXXXXXXXX");
        console.log("XXXXXXXXX");
        console.log({agentExpertResponse});

const styleGuide =
`Style Guide for Generous App
Overview
Generous is a generative AI app with a collaborative canvas, featuring a retro-inspired design with modern functionality. This updated style guide includes both light and dark modes, reflecting the Figma homepage revisions, while maintaining a clean, grid-based canvas and intuitive collaborative workspace.

Color Palette
Light Mode (Unchanged from Previous Guide):
Primary Background (Canvas): Light Gray (#E5E5E5) with a dot grid pattern (#D5D5D5).
Accent Color: Warm Orange (#FF6200) for highlights (e.g., chat messages).
Secondary Accent: Bright Green (#00FF00) for interactive elements (e.g., "Join Audio Chat").
Neutral Tones:
Off-White (#F5F5F5) for UI panels (user list, chat).
Soft Black (#1A1A1A) for text and icons.
Background (Non-Canvas): Dark Gray (#333333) for the top bar and side panels.
Dark Mode (New):
Primary Background (Canvas): Dark Gray (#2A2A2A) with a lighter dot grid pattern (#3F3F3F).
Accent Color: Warm Orange (#FF6200), retained for continuity, used for highlights (e.g., chat messages).
Secondary Accent: Bright Green (#00FF00), retained for interactive elements (e.g., "Join Audio Chat").
Neutral Tones:
Dark Off-White (#D5D5D5) for UI panels (user list, chat), ensuring readability.
Light Gray (#B0B0B0) for text and icons, replacing Soft Black for better contrast on dark backgrounds.
Background (Non-Canvas): Deep Black (#1A1A1A) for the top bar and side panels, as seen in the dark mode Figma screenshot.
Typography
Primary Font: Space Grotesk, consistent across both modes.
Headings: Space Grotesk Bold, 18-24pt (e.g., "SAMPLE ROOM TITLE").
Body Text: Space Grotesk Regular, 12-14pt (e.g., user list, chat messages).
Accents: Space Grotesk Italic for secondary info (e.g., timestamps).
Text Color:
Light Mode: Soft Black (#1A1A1A) for primary text, Warm Orange (#FF6200) for highlighted chat messages, Bright Green (#00FF00) for interactive text.
Dark Mode: Light Gray (#B0B0B0) for primary text, Warm Orange (#FF6200) for highlighted chat messages, Bright Green (#00FF00) for interactive text.
Imagery & Iconography
Imagery Style: Retain the retro-futuristic vibe with a watermark "Generous" logo on the canvas in both modes.
Light Mode: Translucent Off-White (#F5F5F580).
Dark Mode: Translucent Dark Off-White (#D5D5D580).
Icons: Minimal icons with a retro feel.
Light Mode: Soft Black (#1A1A1A), Bright Green (#00FF00) on hover/active.
Dark Mode: Light Gray (#B0B0B0), Bright Green (#00FF00) on hover/active.
Canvas Pattern:
Light Mode: Dot grid in #D5D5D5 on Light Gray (#E5E5E5).
Dark Mode: Dot grid in #3F3F3F on Dark Gray (#2A2A2A).
UI Elements
Top Bar:
Light Mode: Dark Gray (#333333) background, Soft Black (#1A1A1A) text, Bright Green (#00FF00) hover states.
Dark Mode: Deep Black (#1A1A1A) background, Light Gray (#B0B0B0) text, Bright Green (#00FF00) hover states.
Canvas:
Light Mode: Light Gray (#E5E5E5) with dot grid (#D5D5D5), faded "Generous" watermark.
Dark Mode: Dark Gray (#2A2A2A) with dot grid (#3F3F3F), faded "Generous" watermark.
Side Panel (User List):
Light Mode: Off-White (#F5F5F5) background, Soft Black (#1A1A1A) text, colored user dots.
Dark Mode: Dark Off-White (#D5D5D5) background, Light Gray (#B0B0B0) text, colored user dots.
Chat Section:
Light Mode: Off-White (#F5F5F5) background, Soft Black (#1A1A1A) text, Warm Orange (#FF6200) highlight.
Dark Mode: Dark Off-White (#D5D5D5) background, Light Gray (#B0B0B0) text, Warm Orange (#FF6200) highlight.
Timestamps in Space Grotesk Italic: #666666 (Light Mode), #999999 (Dark Mode).
Buttons:
Light Mode: Off-White (#F5F5F5) background, Soft Black (#1A1A1A) text/icons, Bright Green (#00FF00) active/hover.
Dark Mode: Dark Off-White (#D5D5D5) background, Light Gray (#B0B0B0) text/icons, Bright Green (#00FF00) active/hover.
Loading Indicator: Yellow dot (#FFFF00) in both modes.
Tone & Voice
Visual Tone: Clean, collaborative, and retro-inspired, with a seamless transition between light and dark modes.
Language: Casual and community-driven. Example: “Let’s create something awesome together!” Use Space Grotesk for all text.
Example Application
Home Screen (Light Mode): Dark Gray (#333333) top bar, Light Gray (#E5E5E5) canvas with dot grid, Off-White (#F5F5F5) side panels, Warm Orange (#FF6200) chat highlights.
Home Screen (Dark Mode): Deep Black (#1A1A1A) top bar, Dark Gray (#2A2A2A) canvas with dot grid, Dark Off-White (#D5D5D5) side panels, Warm Orange (#FF6200) chat highlights.

      // Create a prompt specifically for HTML visualization
      const htmlPrompt = `
# Visualization Generator

You are a visualization generator for a group chat. Your task is to create a custom HTML visualization or interactive element based on this latest request: ${lastUserMessage.content}
The current canvas is ${lastGenerationHtml}. If you need more context, refer to the conversation history: ${messageHistory}. Utilize the following expert response to inform your creation: ${agentExpertResponse} but make sure to follow the guidelines below.

#HTML/CSS/JS Generation Guidelines:
- Use semantic HTML5 elements and refer to ${styleGuide} for styling
- Make sure the design is responsive and works well in the sidebar panel

## Available Visualization Types:
- Interactive tools → Use the javascript framework best fitted for the specific tool
- Data/statistics → Use D3.js or Chart.js 
- Timelines/processes → Use TimelineJS or vis.js
- 3D objects/spaces → Use Three.js or babylon js
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
    

         const { text: htmlContent } = await generateText({
          model: openai(process.env.DEBUG_MODEL || 'o3-mini'),
          temperature: 0.9,
          prompt: htmlPrompt,
          maxTokens: 10000,
        });

        // Update the existing generation with the completed content
        const { data: updatedGeneration, error: updateError } = await supabaseService.supabase
          .from("canvas_generations")
          .update({
            html: htmlContent,
            agent_expert_response: agentExpertResponse,
            summary: `Visualization for: ${lastUserMessage.content.substring(0, 50)}${lastUserMessage.content.length > 50 ? '...' : ''}`,
            metadata: {
              status: 'completed',
              fallback: true
            },
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