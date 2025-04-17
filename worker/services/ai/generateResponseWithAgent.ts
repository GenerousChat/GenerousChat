

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

        //// ==== START AGENT EXPERT REPLY ====
        // @todo - the expert reply should probably know abouts it initial casual reply so they have a lil fidelity
        const agentExpertPrompt = `
        You are ${agent.name}, an AI with the following personality: ${agent.personality_prompt}. Use your expertise to help create better visualizations and interactive elements for the shared canvas in online chat room. The current canvas is ${lastGenerationHtml}. Your task is to create the design specifications for the visual requested by the user: ${lastUserMessage.content} If you need more context, refer to the conversation history: ${messageHistory}.  Reply with the utmost technical acumen and provide all necessary details to render a more complex and technically accurate or visually compelling visualization.
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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com/" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap" rel="stylesheet">
Space Grotesk: CSS class for a variable style

// <weight>: Use a value from 300 to 700
// <uniquifier>: Use a unique and descriptive class name

.space-grotesk-<uniquifier> {
  font-family: "Space Grotesk", sans-serif;
  font-optical-sizing: auto;
  font-weight: <weight>;
  font-style: normal;
}
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
`;

const recommendedLibraries =
`Recommended Canvas Visualization Libraries for Generous

Below is a curated list of JavaScript libraries for HTML5 Canvas visualizations, tailored for Generous, a generative AI app with a collaborative, real-time canvas for simulations, games, and visualizations. These libraries are served via CDNJS, compatible with HTML and React, and optimized for mobile-first performance, real-time collaboration, and minimal dependencies to align with Generous retro-inspired, responsive design and dynamic rendering needs.

1. Konva
Purpose: A 2D canvas library for creating interactive shapes, animations, and visualizations with a scene graph.
Why for Generous: Konva is lightweight (no external dependencies), supports real-time updates for collaborative features, and offers drag-and-drop, animations, and event handling, ideal for Generous dynamic canvas where users collaboratively create simulations or games. Its scene graph simplifies managing complex visuals, and it performs well on mobile devices.
CDNJS Link (Konva 9.3.6):
<script src="https://cdnjs.cloudflare.com/ajax/libs/konva/9.3.6/konva.min.js"></script>
Integration with Generous:
Real-Time Collaboration: Use Konvas stage.toJSON() and Konva.Node.create() to serialize and sync canvas state over WebSockets (e.g., via Socket.IO) for multiplayer updates.
Mobile Performance: Enable pixelRatio adjustments for crisp rendering on high-DPI mobile screens.
Retro Aesthetic: Style shapes with Generous color palette (e.g., Vibrant Sky Blue #00A3FF, Warm Orange #FF5733) and apply Space Grotesk for text via Konvas Text nodes.
Example Usage (React for Generous):
import { useEffect, useRef } from 'react';
function CollaborativeCanvas() {
  const containerRef = useRef(null);
  useEffect(() => {
    const stage = new window.Konva.Stage({
      container: containerRef.current,
      width: 400,
      height: 400,
    });
    const layer = new window.Konva.Layer();
    const rect = new window.Konva.Rect({
      x: 50,
      y: 50,
      width: 100,
      height: 100,
      fill: '#00A3FF', // Vibrant Sky Blue from Generous palette
      draggable: true,
    });
    layer.add(rect);
    stage.add(layer);
    // Simulate real-time update (e.g., via WebSocket)
    rect.on('dragmove', () => {
      // Emit position to other users
      console.log('New position:', rect.x(), rect.y());
    });
  }, []);
  return <div ref={containerRef} style={{ background: '#F5F5F5' }} />; // Light Gray canvas background
}

Why Best Fit: Konvas simplicity, performance, and event-driven API make it ideal for Generous real-time, interactive canvas. It was previously recommended (April 13, 2025) for its balance of ease and power, and it supports Generous collaborative and mobile-first goals.

2. Fabric.js
Purpose: A canvas library for interactive graphics, supporting shapes, text, images, and animations with an object-oriented model.
Why for Generous: Fabric.js excels at creating editable, interactive visualizations (e.g., design tools or collaborative boards), supports real-time updates via canvas serialization, and is mobile-friendly. Its ability to handle text and images aligns with Generous retro aesthetic for styled visualizations.
CDNJS Link (Fabric.js 5.3.1): <script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js"></script>
Integration with Generous:
Real-Time Collaboration: Use canvas.toJSON() and canvas.loadFromJSON() to sync canvas state across users in real time.
Mobile Performance: Optimize by limiting object counts and using canvas.renderOnAddRemove = false for batch updates.
Retro Aesthetic: Apply Space Grotesk for text objects and use Generous colors (e.g., Bright Green #00FF85 for interactive elements).
Example Usage (React for Generous):
import { useEffect, useRef } from 'react';
function CanvasEditor() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = new window.fabric.Canvas(canvasRef.current);
    const circle = new window.fabric.Circle({
      left: 100,
      top: 100,
      radius: 50,
      fill: '#FF5733', // Warm Orange from Generous palette
      selectable: true,
    });
    canvas.add(circle);
    // Real-time sync simulation
    canvas.on('object:modified', () => {
      // Send canvas.toJSON() to server
      console.log('Canvas updated:', canvas.toJSON());
    });
  }, []);
  return <canvas ref={canvasRef} width={400} height={400} style={{ background: '#2A2A2A' }} />; // Dark Gray for dark mode
}

Why Suitable: Fabric.js is powerful for Generous collaborative editing needs, offering flexibility for simulations and visualizations with minimal setup.

3. ZIM
Purpose: A creative coding framework for canvas-based animations, games, and interactive visualizations.
Why for Generous: ZIM provides a high-level API for rapid development of interactive visuals, supports drag-and-drop and animations, and includes built-in accessibility features, aligning with Generous collaborative and inclusive goals. Its mobile-optimized rendering suits your mobile-first design.
CDNJS Link (ZIM 10.8.0):<script src="https://cdnjs.cloudflare.com/ajax/libs/zimjs/10.8.0/zim.min.js"></script>
Integration with Generous:
Real-Time Collaboration: Use ZIMs toString() and fromString() methods to serialize and share canvas states.
Mobile Performance: Leverage ZIMs Frame scaling for responsive canvas sizing on mobile devices.
Retro Aesthetic: Customize components with Generous palette and Space Grotesk for labels.
Example Usage (React for Generous):

import { useEffect } from 'react';
function InteractiveCanvas() {
  useEffect(() => {
    const frame = new window.zim.Frame('fit', 400, 400, '#F5F5F5'); // Light Gray background
    frame.on('ready', () => {
      const stage = frame.stage;
      const star = new window.zim.Star({
        points: 5,
        radius1: 50,
        radius2: 25,
        color: '#00FF85', // Bright Green from Generous palette
      }).center(stage).drag();
      stage.update();
      // Simulate collaboration
      star.on('pressmove', () => {
        // Emit position to server
        console.log('Star moved:', star.x, star.y);
      });
    });
  }, []);
  return <div id="canvas" />;
}

Why Suitable: ZIMs beginner-friendly API and built-in interactivity make it a strong choice for Generous dynamic, game-like visualizations, though its slightly heavier due to CreateJS inclusion.

Considerations for Generous
Real-Time Collaboration: All libraries support serialization (e.g., toJSON or toString) for syncing canvas states via WebSockets, critical for Generous multiplayer features. Pair with a library like Socket.IO (available on CDNJS) for networking.
Mobile-First: Konva and ZIM offer responsive scaling, while Fabric.js requires manual optimization. Test on mobile devices to ensure smooth performance.
Retro Aesthetic: Apply Generous style guide (e.g., Vibrant Sky Blue, Warm Orange, Space Grotesk) to shapes, text, and backgrounds. Use dark mode colors (e.g., Dark Gray #2A2A2A) for accessibility.
Performance: Konva is the lightest and fastest, followed by Fabric.js. ZIM is slightly heavier but offers more out-of-the-box features. Limit redraws and use debouncing for real-time updates.
React Integration: Use useEffect and useRef to manage canvas lifecycle in React components, as shown. Avoid re-rendering the canvas unnecessarily by memoizing components.`;

// Create a prompt specifically for HTML visualization
const htmlPrompt = `
# Canvas Generation Guide- You are controlling a canvas that is visible to all participants in a group chat. The canvas is a collaborative space that reflects the following conversation: ${messageHistory} and the requests made by participants. You are in charge of writing the code that will be rendered onto the canvas. When deciding how to create the new generation or update the canvas use the following guidelines to determine what to build:

## User Intent- Choose the appropriate framework based on the user intent expressed in the most recent message, ${lastUserMessage.content}. Include the following details: ${agentExpertPrompt} added by an AI expert to inform your canvas generation choices to clarify and add information to the user request. If the user intent in the message, ${lastUserMessage.content} is to add to, modify, change, update or otherwise make an adjustment to the existing visualization then use the current canvas found here: ${lastGenerationHtml} and alter the generation to comply with the user's request. Follow the request as closely as possible, changing only the elements the user specifies should be altered. If the user says that an element is broken or not working regenerate the visualization with a different approach for the broken element.
- Always strive to satisfy the current visualization request with as much fidelity and detail as possible. 
- Create something that directly fulfills the user request and makes users say "This is exactly what I asked for!"
- You are not a chat agent, your job is to create a new canvas or update the existing one based on the user request, you cannot interact with the user directly or clarify intents.

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
            agent_expert_response: agentExpertResponse,
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