

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
      tokens: 150
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
        Use your expertise to create better visualizations and interactive elements for an online chat room. The current canvas is ${lastGenerationHtml}. Your task is to create a custom HTML visualization or interactive element based on this latest request: ${lastUserMessage.content} If you need more context, refer to the conversation history: ${messageHistory}. 

        Reply with the utmost technical acumen and provide all necessary details to render a more complex and technically accurate visualization. Your response should be a complete HTML document that includes the following:
        - A title for the visualization
        - A description of the visualization
        - The necessary HTML structure
        - Any required CSS styles
        - JavaScript for interactivity
        - Any external libraries or resources needed for the visualization
        -Make sure the design is responsive and works well in the sidebar panel
        `;
        
        const agentExpertResponse = await generateAITextResponse(agentExpertPrompt, {
          tokens: 850
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
Generous is a generative AI app with a collaborative canvas, blending a retro-inspired aesthetic with modern functionality. The style reflects a nostalgic, analog vibe while maintaining a clean, user-friendly interface for seamless collaboration.

Color Palette
Primary Background: Vibrant Sky Blue (#00AEEF)
Inspired by the bold blue background in the image, this color evokes a sense of openness and creativity, perfect for a collaborative canvas.
Accent Color: Warm Orange (#FF6200)
Drawn from the orange cube, this retro-inspired hue adds warmth and energy, highlighting interactive elements like buttons or collaborative tools.
Neutral Tones:
Off-White (#F5F5F5) for the robotic arm’s tone, used in UI elements like cards or backgrounds.
Soft Black (#1A1A1A) for joints and outlines, used for text and subtle borders.
Typography
Primary Font: Space Grotesk
A modern, geometric sans-serif font with a retro twist, aligning with the app’s aesthetic.
Headings: Space Grotesk Bold, 24-36pt, for titles and section headers.
Body Text: Space Grotesk Regular, 14-16pt, for descriptions and canvas labels.
Accents: Space Grotesk Italic for emphasis or tooltips.
Text Color: Soft Black (#1A1A1A) for readability, with Warm Orange (#FF6200) for CTAs or highlights.
Imagery & Iconography
Imagery Style: Retro-futuristic with a warm, analog filter (like the image’s soft glow). Use visuals of robotic hands, vintage tech (e.g., cassettes, dials), or abstract shapes to symbolize collaboration and creation.
Icons: Minimal, line-based icons with rounded edges, reflecting the robotic arm’s smooth joints. Use Off-White (#F5F5F5) for icon fills with Warm Orange (#FF6200) accents on hover or active states.
UI Elements
Buttons: Rounded rectangles with Warm Orange (#FF6200) backgrounds, Off-White (#F5F5F5) text, and a subtle glow effect on hover to mimic the image’s lighting.
Canvas Background: Sky Blue (#00AEEF) to create a cohesive workspace, with a faint grid pattern in Off-White (#F5F5F5) for a retro tech vibe.
Collaborative Elements: Highlight active users or shared tools with glowing Warm Orange (#FF6200) outlines, inspired by the cube’s prominence.
Borders & Shadows: Soft Black (#1A1A1A) for borders, with a light drop shadow to give a floating, analog feel.
Tone & Voice
Visual Tone: Playful yet functional, blending retro nostalgia with modern collaboration.
Language: Friendly, encouraging, and creative. Example: “Let’s build something amazing together!” Use Space Grotesk for all in-app text to maintain consistency.
Example Application
Home Screen: Sky Blue (#00AEEF) background with a robotic hand graphic passing an orange cube, welcoming users to “Start Creating.” Buttons in Warm Orange (#FF6200) with Space Grotesk Bold text.
Collaborative Canvas: Sky Blue workspace with Off-White gridlines, orange-highlighted tools, and user cursors with glowing Warm Orange outlines. Tooltips in Space Grotesk Italic.`

      // Create a prompt specifically for HTML visualization
      const htmlPrompt = `
# Visualization Generator

You are a visualization generator for a group chat. Your task is to create a custom HTML visualization or interactive element based on this latest request: ${lastUserMessage.content}
The current canvas is ${lastGenerationHtml}. If you need more context, refer to the conversation history: ${messageHistory}. Utilize the following expert response to inform your creation: ${agentExpertResponse} but make sure to follow the guidelines below.

#HTML/CSS/JS Generation Guidelines:
- Use semantic HTML5 elements and refer to ${styleGuide} for styling
- Make sure the design is responsive and works well in the sidebar panel

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