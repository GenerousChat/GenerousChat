/**
 * Logic for determining when an AI agent should respond to messages
 */
import logger from "./logger.js";
import supabaseService from "../services/supabase.js";

// Define interfaces for messages and configuration
interface Message {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  read_by_ai?: boolean;
}

interface AgentResponseConfig {
  // Add configuration parameters as needed
  timeThreshold?: number;
  messageRateThreshold?: number;
}

interface ResponseDecision {
  shouldRespond: boolean;
  reason: string;
  scheduleDelayedCheck: boolean;
}

/**
 * Determine if the AI agent should respond based on message timing and other factors
 * @param roomId - Room ID
 * @param messages - Recent messages in the room
 * @param config - Configuration parameters
 * @returns Decision object with shouldRespond, reason, and scheduleDelayedCheck flags
 */
async function shouldAgentRespond(
  roomId: string,
  messages: Message[],
  config?: AgentResponseConfig
): Promise<ResponseDecision> {
  // If there are no messages, don't respond
  if (!messages || messages.length === 0) {
    return {
      shouldRespond: false,
      reason: "No messages to respond to",
      scheduleDelayedCheck: false,
    };
  }

  const MONKEY_BUFFER = 10000; // ms

  // In the last minute, count the total messages
  const lastMinuteMessages = messages.filter((msg) => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    return new Date(msg.created_at) > oneMinuteAgo;
  });

  const messagesPerMinute = (lastMinuteMessages.length / 60) * 100;

  // Calculate time since last message in ms
  const lastMessage = messages[messages.length - 1];
  const secondLastMessage = messages.length > 1 ? messages[messages.length - 2] : null;
  const timeSinceLastMessage = new Date().getTime() - new Date(lastMessage.created_at).getTime();

  logger.debug("Agent response decision data", {
    lastMessage,
    secondLastMessage,
    messagesPerMinute,
    timeSinceLastMessage,
  });

  // If message rate is too high, don't respond yet
  if (messagesPerMinute > 5 && timeSinceLastMessage < MONKEY_BUFFER) {
    return {
      shouldRespond: false,
      reason: "Too many messages in last minute",
      scheduleDelayedCheck: false,
    };
  }

  return {
    shouldRespond: true,
    reason: "Normal response conditions met",
    scheduleDelayedCheck: false,
  };
}

export default shouldAgentRespond;
