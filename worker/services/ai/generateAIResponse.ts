
import config from "../../config/index.js";
import logger from "../../utils/logger.js";
import supabaseService, { Message } from "../supabase.js";
import shouldAgentRespond from "./shouldAgentRespond";
import selectBestAgent from "./selectBestAgent";
import generateResponseWithAgent from "./generateResponseWithAgent";

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


export default generateAIResponse;