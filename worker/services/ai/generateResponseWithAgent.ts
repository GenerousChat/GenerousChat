

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

const toolList =
`Prompt for an AI Agent to Utilize Visualization Tools

As an AI agent, you are tasked with creating engaging and effective visualizations to convey information, concepts, or simulations based on user requests. Below is a guide on how to use each available visualization tool to produce the most suitable output for different types of content. Select the appropriate tool based on the nature of the data or concept, and implement the visualization with clarity, accuracy, and user engagement in mind.

Charts/Graphs (D3.js or Chart.js)
Use D3.js or Chart.js to create interactive or static charts and graphs for displaying quantitative data.
When to use: For visualizing datasets (e.g., bar charts, line graphs, pie charts, scatter plots) such as sales trends, survey results, or statistical comparisons.
How to use:
Choose Chart.js for simpler, pre-built chart types with minimal setup (e.g., bar or line charts).
Use D3.js for highly customizable, complex visualizations (e.g., interactive network graphs or animated transitions).
Ensure data is clean and formatted (e.g., JSON or CSV) before rendering.
Add labels, tooltips, and legends for clarity, and optimize for responsiveness across devices.
Example: Visualize monthly website traffic with a line chart in Chart.js, or create an interactive force-directed graph in D3.js for social network analysis.
Diagrams/Flowcharts (Mermaid.js)
Use Mermaid.js to generate diagrams and flowcharts from text-based syntax.
When to use: For illustrating processes, workflows, or relationships (e.g., organizational charts, software architecture, or decision trees).
How to use:
Write Mermaid syntax to define nodes and connections (e.g., graph TD; A-->B;).
Render the diagram in a web canvas or embed it in markdown-compatible environments.
Keep diagrams concise to avoid clutter, and use clear labels for nodes and edges.
Example: Create a flowchart showing a user authentication process, with nodes for login, verification, and error handling.
Math Concepts (MathJax or KaTeX, or Custom SVG)
Use MathJax or KaTeX to render mathematical expressions, or custom SVG for geometric visualizations.
When to use: For displaying equations, formulas, or geometric concepts (e.g., calculus, linear algebra, or trigonometry).
How to use:
Use KaTeX for faster rendering of LaTeX-based equations in web environments.
Use MathJax for broader compatibility and advanced formatting options.
For geometric or visual math (e.g., graphs of functions), create custom SVGs with precise coordinates and annotations.
Ensure equations are formatted clearly and accompanied by explanations if needed.
Example: Render the quadratic formula using KaTeX, or draw a sine wave with labeled axes using SVG.
Games/Simulations (Phaser or p5.js)
Use Phaser or p5.js to build interactive games or simulations.
When to use: For educational games, interactive demos, or simulations (e.g., cellular automata, maze solvers, or physics-based games).
How to use:
Use Phaser for structured, game-like experiences with sprites, physics, and user input (e.g., a 2D platformer).
Use p5.js for creative coding and simpler, canvas-based simulations (e.g., particle systems or generative art).
Keep performance in mind by optimizing assets and limiting computational complexity.
Provide clear instructions for user interaction.
Example: Build a p5.js simulation of a bouncing ball with adjustable gravity, or a Phaser-based quiz game for learning vocabulary.
Maps/Locations (Leaflet.js or Mapbox GL JS)
Use Leaflet.js or Mapbox GL JS to display geographic data or interactive maps.
When to use: For visualizing location-based data (e.g., store locations, travel routes, or demographic data).
How to use:
Use Leaflet.js for lightweight, open-source maps with simple markers and popups.
Use Mapbox GL JS for advanced styling, 3D maps, or custom map designs.
Integrate GeoJSON or API data for dynamic content (e.g., real-time weather or traffic).
Ensure maps are zoomable and include clear legends or tooltips.
Example: Plot earthquake locations on a Leaflet.js map with popups showing magnitude and date.
Physics Simulations (Matter.js or Another Physics Engine)
Use Matter.js or similar physics engines to simulate physical systems.
When to use: For demonstrating physics concepts (e.g., collisions, gravity, or pendulum motion).
How to use:
Set up a Matter.js canvas with bodies, constraints, and forces.
Define realistic parameters (e.g., friction, restitution) for accurate simulations.
Allow user interaction (e.g., dragging objects or adjusting variables) to enhance engagement.
Visualize with clear rendering and optional annotations for key parameters.
Example: Simulate a chain of pendulums in Matter.js, with controls to adjust mass and length.
Simple Animations (CSS Animations or GSAP)
Use CSS animations or GSAP for lightweight, engaging motion graphics.
When to use: For visual effects or transitions (e.g., fading text, moving icons, or animated infographics).
How to use:
Use CSS animations for simple effects (e.g., keyframes for opacity or transforms).
Use GSAP for complex, timeline-based animations with precise control (e.g., staggered element animations).
Optimize for performance by minimizing reflows and using GPU-accelerated properties (e.g., transform, opacity).
Ensure animations enhance, rather than distract from, the content.
Example: Animate a progress bar filling up with CSS, or create a GSAP sequence for a landing page hero section.
Scientific Visualizations (Plotly.js or Vega-Lite)
Use Plotly.js or Vega-Lite for advanced scientific or data-driven visualizations.
When to use: For complex datasets or domain-specific visuals (e.g., heatmaps, 3D surface plots, or genomic data).
How to use:
Use Plotly.js for interactive, web-based plots with built-in support for scientific formats.
Use Vega-Lite for declarative, JSON-based visualizations with high customizability.
Ensure data is preprocessed and validated for accuracy.
Include interactive features (e.g., zoom, hover details) and clear axis labels.
Example: Create a Plotly.js heatmap of temperature data, or a Vega-Lite scatter plot of exoplanet properties.
YouTube Videos (Lite YouTube Embed)
Use Lite YouTube Embed to embed YouTube videos efficiently.
When to use: For supplementing explanations with video content (e.g., tutorials, demonstrations, or lectures).
How to use:
Embed videos using the Lite YouTube Embed library to reduce page load times.
Ensure the video is relevant and sourced from a credible channel.
Provide a brief description or context for the video’s purpose.
Test embeds for compatibility across devices.
Example: Embed a YouTube tutorial on machine learning basics to complement a text explanation.
Simple Text/Concepts (Elegant Typography)
Use elegant typography to present text-based information clearly and aesthetically.
When to use: For explaining concepts, definitions, or narratives without graphical elements (e.g., quotes, summaries, or instructions).
How to use:
Choose readable, web-safe fonts (e.g., Roboto, Open Sans) or modern typography libraries (e.g., Google Fonts).
Optimize font size, line spacing, and contrast for readability.
Use hierarchy (e.g., headings, bold text) to organize content.
Avoid excessive styling that could distract from the message.
Example: Present a definition of “artificial intelligence” with a clean, serif font and subtle emphasis on key terms.
General Guidelines:

Always assess the user’s request to determine the most appropriate tool for the task.
Prioritize clarity, accessibility, and performance in all visualizations.
Test outputs in a web environment to ensure compatibility and responsiveness.
If unsure about the best tool, consider combining methods (e.g., a chart with typography for labels) or ask the user for clarification.
For any visualization requiring external data, validate and preprocess the data to ensure accuracy.
By leveraging these tools effectively, you can create compelling, informative, and interactive visualizations tailored to the user’s needs.`


      // Create a prompt specifically for HTML visualization
      const htmlPrompt = `
# Visualization Generator

You are a visualization generator for a group chat. Your task is to create a custom HTML visualization or interactive element based on this latest request: ${lastUserMessage.content}
The current canvas is ${lastGenerationHtml}. If you need more context, refer to the conversation history: ${messageHistory}. Utilize the following expert response to inform your creation: ${agentExpertResponse} but make sure to follow the guidelines below.

#HTML/CSS/JS Generation Guidelines:
- Use semantic HTML5 elements and refer to ${styleGuide} for styling and the ${toolList} for the available tools.
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