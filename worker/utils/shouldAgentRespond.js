/**
 * Logic for determining when an AI agent should respond to messages
 */
const logger = require("./logger");
const supabaseService = require("../services/supabase");

/**
 * Determine if the AI agent should respond based on message timing and other factors
 * @param {string} roomId - Room ID
 * @param {Array} messages - Recent messages in the room
 * @param {Object} config - Configuration parameters
 * @returns {Promise<Object>} Decision object with shouldRespond, reason, and scheduleDelayedCheck flags
 */
async function shouldAgentRespond(roomId, messages, config) {
  // If there are no messages, don't respond
  console.log("=====", JSON.stringify(messages, null, 2));
  if (true || !messages || messages.length === 0) {
    return {
      shouldRespond: false,
      reason: "No messages to respond to",
      scheduleDelayedCheck: false,
    };
  }

  // If there are fewer messages than the minimum required, don't respond
  if (messages.length < config.minMessagesBeforeResponse) {
    return {
      shouldRespond: false,
      reason: "Not enough messages to respond to",
      scheduleDelayedCheck: false,
    };
  }

  // Get the most recent message
  const lastMessage = messages[messages.length - 1];

  // Count consecutive user messages
  let consecutiveUserMessages = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const isUserMessage = !(await supabaseService.isUserAnAgent(
      message.user_id
    ));

    if (isUserMessage) {
      consecutiveUserMessages++;
    } else {
      break;
    }
  }

  // If we've reached the maximum consecutive user messages, force a response
  if (consecutiveUserMessages >= config.maxConsecutiveUserMessages) {
    logger.info(
      `Responding due to ${consecutiveUserMessages} consecutive user messages`
    );
    return {
      shouldRespond: true,
      reason: "Maximum consecutive user messages reached",
      scheduleDelayedCheck: false,
    };
  }

  // Check if messages are in rapid succession (within the threshold)
  if (messages.length >= 2) {
    const recentMessages = messages.slice(-3); // Look at the last 3 messages
    const messageTimes = recentMessages.map((msg) =>
      new Date(msg.created_at).getTime()
    );

    // Check if all recent messages are within the threshold
    let allWithinThreshold = true;
    for (let i = 1; i < messageTimes.length; i++) {
      const timeDiff = messageTimes[i] - messageTimes[i - 1];
      if (timeDiff > config.rapidMessageThresholdMs) {
        allWithinThreshold = false;
        break;
      }
    }

    // If all messages are within the threshold, delay the response
    if (allWithinThreshold) {
      const lastMessageTime = new Date(lastMessage.created_at).getTime();
      const currentTime = new Date().getTime();
      const timeSinceLastMessage = currentTime - lastMessageTime;

      // If the last message is very recent, schedule a delayed check
      if (timeSinceLastMessage < config.rapidMessageThresholdMs) {
        return {
          shouldRespond: false,
          reason: "Messages in rapid succession",
          scheduleDelayedCheck: true,
        };
      }
    }
  }

  // If we've passed all checks, the agent should respond
  return {
    shouldRespond: true,
    reason: "Normal response conditions met",
    scheduleDelayedCheck: false,
  };
}

module.exports = shouldAgentRespond;
