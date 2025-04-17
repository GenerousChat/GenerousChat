import config from "../../config/index.js";
import logger from "../../utils/logger.js";
import supabaseService, { Message } from "../supabase.js";
import selectBestAgent from "./selectBestAgent";
import generateResponseWithAgent from "./generateResponseWithAgent";

async function generateAIResponse(roomId: string): Promise<boolean> {
  const functionTimerLabel = `generateAIResponse-${roomId}`;
  console.time(functionTimerLabel);
  logger.info(`Starting AI response generation for room ${roomId}`);

  try {
    // Fetch the most recent messages for the room
    const fetchMessagesTimerLabel = `fetchMessages-${roomId}`;
    console.time(fetchMessagesTimerLabel);
    const { data: messages, error } = await supabaseService.supabase
      .from(config.supabase.messagesTable)
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(7);
    console.timeEnd(fetchMessagesTimerLabel);

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
      .reverse()
      .map((msg: Message) => {
        // here, the message history uuids do not have names
        return `- ${msg.user_id}: ${msg.content}`;
      })
      .join("\n");


    const selectAgentTimerLabel = `selectAgent-${roomId}`;
    console.time(selectAgentTimerLabel);
    const selectedAgent = await selectBestAgent(
      roomId,
      lastUserMessage,
      messageHistory
    );
    console.timeEnd(selectAgentTimerLabel);

    if (!selectedAgent) {
      logger.info("No suitable agent selected, skipping response");
      return false;
    }

    // Get the last HTML generation for context if it exists
    const getLastGenerationTimerLabel = `getLastGeneration-${roomId}`;
    console.time(getLastGenerationTimerLabel);
    const lastGeneration = await supabaseService.getLastGeneration(roomId);
    console.timeEnd(getLastGenerationTimerLabel);
    const lastGenerationHtml = lastGeneration?.html || "";

    const generateResponseTimerLabel = `generateResponse-${roomId}`;
    console.time(generateResponseTimerLabel);
    // Generate a response using the selected agent
    const result = await generateResponseWithAgent(
      roomId,
      selectedAgent,
      lastUserMessage,
      messageHistory,
      lastGenerationHtml
    );
    console.timeEnd(generateResponseTimerLabel);

    return result;
  } catch (error) {
    logger.error("Error in generateAIResponse:", error instanceof Error ? error.message : String(error));
    return false;
  } finally {
    console.timeEnd(functionTimerLabel);
  }
}

export default generateAIResponse;