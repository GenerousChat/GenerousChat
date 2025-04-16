import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import logger from "../../utils/logger.js";

async function generateAITextResponse(prompt: string, options: any): Promise<string> {
  try {
    const { text } = await generateText({
      model: openai(process.env.DEBUG_MODEL || 'gpt-4o'),
      prompt,
      temperature: 0.8,
      maxTokens: options?.tokens || 150, // Adjust as needed for response length
    });


    return text;
  } catch (error) {
    logger.error("Error generating AI text response:", error instanceof Error ? error.message : String(error));
    return "I'm having trouble generating a response right now. Please try again.";
  }
}
export default generateAITextResponse;