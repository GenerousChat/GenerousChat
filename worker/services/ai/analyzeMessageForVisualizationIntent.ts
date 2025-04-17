import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import logger from "../../utils/logger.js";
import { Message } from "../supabase.js";


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
  ${lastGenerationHtml}.
  
  5. If the message says that something is broken use the following canvas as a starting point and modify whatever the user says didn't work: ${lastGenerationHtml}.`;

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

export default analyzeMessageForVisualizationIntent;
