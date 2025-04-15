import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import logger from "../../utils/logger.js";

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
export default generateHTMLContent;