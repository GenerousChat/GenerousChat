/**
 * Response decision service for determining when AI agents should respond
 */
const logger = require("../utils/logger");
const supabaseService = require("./supabase");

// Store recent response decisions to prevent duplicate responses
// Using a more persistent approach with database-backed tracking
const responseTracker = {
  // Map of roomId -> timestamp of last response
  lastResponseTime: new Map(),
  // Map of roomId -> set of message IDs that have been responded to
  respondedMessageIds: new Map(),
  // Map of roomId -> timestamp of last check for this room
  lastCheckTime: new Map(),
  // Minimum time between responses in milliseconds (default 15 seconds)
  minTimeBetweenResponses: 15000,
  // Minimum time between checks for the same room (5 seconds)
  minTimeBetweenChecks: 5000,
  // Maximum number of consecutive checks for a room
  maxConsecutiveChecks: 30,
  // Map of roomId -> count of consecutive checks
  consecutiveChecks: new Map(),

  // Initialize a room in the tracker
  initRoom(roomId) {
    if (!this.respondedMessageIds.has(roomId)) {
      this.respondedMessageIds.set(roomId, new Set());
      this.consecutiveChecks.set(roomId, 0);
    }
  },

  // Record a response to a message
  recordResponse(roomId, messageId) {
    this.lastResponseTime.set(roomId, Date.now());
    this.respondedMessageIds.get(roomId).add(messageId);
    this.consecutiveChecks.set(roomId, 0); // Reset consecutive checks
    logger.info(
      `[RESPONSE TRACKER] Recorded response to message ${messageId} in room ${roomId}`
    );
  },

  // Record a check for a room
  recordCheck(roomId) {
    const checkTime = Date.now();
    this.lastCheckTime.set(roomId, checkTime);

    // Increment consecutive checks
    const currentCount = this.consecutiveChecks.get(roomId) || 0;
    this.consecutiveChecks.set(roomId, currentCount + 1);

    logger.info(
      `[RESPONSE TRACKER] Recorded check for room ${roomId}, consecutive checks: ${currentCount + 1}`
    );
    return currentCount + 1;
  },

  // Check if we've exceeded the maximum consecutive checks
  hasExceededMaxChecks(roomId) {
    const checkCount = this.consecutiveChecks.get(roomId) || 0;
    return checkCount >= this.maxConsecutiveChecks;
  },
};

/**
 * Determine if the AI agent should respond based on message timing and other factors
 * @param {string} roomId - Room ID
 * @param {Array} messages - Recent messages in the room
 * @param {Object} config - Configuration parameters including:
 *   - rapidMessageThresholdMs: Time threshold for considering messages as rapid succession
 *   - responseDelayMs: Time to delay response when messages are in rapid succession
 *   - minMessagesBeforeResponse: Minimum number of messages before responding
 *   - maxConsecutiveUserMessages: Maximum consecutive user messages before forcing a response
 * @returns {Promise<Object>} Decision object with shouldRespond, reason, and scheduleDelayedCheck flags
 */
async function shouldAgentRespond(roomId, messages, config) {
  logger.info(
    `[RESPONSE DECISION] Evaluating response for room ${roomId} with ${messages?.length || 0} messages`
  );
  logger.info(`[RESPONSE DECISION] Config: ${JSON.stringify(config)}`);

  // Initialize response tracker for this room
  responseTracker.initRoom(roomId);

  // Record this check
  const consecutiveChecks = responseTracker.recordCheck(roomId);

  // Check if we've exceeded the maximum consecutive checks for this room
  if (responseTracker.hasExceededMaxChecks(roomId)) {
    logger.info(
      `[RESPONSE DECISION] Exceeded maximum consecutive checks (${responseTracker.maxConsecutiveChecks}) for room ${roomId}`
    );
    return {
      shouldRespond: false,
      reason: `Too many consecutive checks for this room`,
      scheduleDelayedCheck: false,
    };
  }

  // Check if we've checked this room too recently
  const lastCheckTime = responseTracker.lastCheckTime.get(roomId) || 0;
  const now = Date.now();
  const timeSinceLastCheck = now - lastCheckTime;

  if (
    lastCheckTime > 0 &&
    timeSinceLastCheck < responseTracker.minTimeBetweenChecks &&
    consecutiveChecks > 1
  ) {
    logger.info(
      `[RESPONSE DECISION] Checked too recently (${timeSinceLastCheck}ms < ${responseTracker.minTimeBetweenChecks}ms)`
    );
    return {
      shouldRespond: false,
      reason: `Checked too recently`,
      scheduleDelayedCheck: false,
    };
  }

  // Get the most recent message ID
  const lastMessageId =
    messages?.length > 0 ? messages[messages.length - 1].id : null;
  logger.info(`[RESPONSE DECISION] Last message ID: ${lastMessageId}`);

  // Check if we've already responded to this message
  if (
    lastMessageId &&
    responseTracker.respondedMessageIds.get(roomId).has(lastMessageId)
  ) {
    logger.info(
      `[RESPONSE DECISION] Already responded to message ${lastMessageId}`
    );
    return {
      shouldRespond: false,
      reason: "Already responded to this message",
      scheduleDelayedCheck: false,
    };
  }

  // Check if we've responded recently to any message in this room
  const lastResponseTime = responseTracker.lastResponseTime.get(roomId) || 0;
  // Use the 'now' variable already defined above
  const timeSinceLastResponse = now - lastResponseTime;

  logger.info(
    `[RESPONSE DECISION] Time since last response: ${timeSinceLastResponse}ms`
  );

  if (
    lastResponseTime > 0 &&
    timeSinceLastResponse < responseTracker.minTimeBetweenResponses
  ) {
    logger.info(
      `[RESPONSE DECISION] Too soon since last response (${timeSinceLastResponse}ms < ${responseTracker.minTimeBetweenResponses}ms)`
    );
    return {
      shouldRespond: false,
      reason: `Too soon since last response (${Math.round(timeSinceLastResponse / 1000)}s ago)`,
      scheduleDelayedCheck: timeSinceLastResponse < config.responseDelayMs,
    };
  }
  // If there are no messages, don't respond
  if (!messages || messages.length === 0) {
    logger.info(`[RESPONSE DECISION] No messages to respond to`);
    return {
      shouldRespond: false,
      reason: "No messages to respond to",
      scheduleDelayedCheck: false,
    };
  }

  // If there are fewer messages than the minimum required, don't respond
  if (messages.length < config.minMessagesBeforeResponse) {
    logger.info(
      `[RESPONSE DECISION] Not enough messages: ${messages.length} < ${config.minMessagesBeforeResponse}`
    );
    return {
      shouldRespond: false,
      reason: "Not enough messages to respond to",
      scheduleDelayedCheck: false,
    };
  }

  // Get the most recent message
  const lastMessage = messages[messages.length - 1];
  logger.info(
    `[RESPONSE DECISION] Last message: ${JSON.stringify({
      id: lastMessage.id,
      user_id: lastMessage.user_id,
      created_at: lastMessage.created_at,
      content:
        lastMessage.content?.substring(0, 50) +
        (lastMessage.content?.length > 50 ? "..." : ""),
    })}`
  );

  // Identify which messages are from users vs AI agents
  const messageAuthors = [];
  for (let i = 0; i < messages.length; i++) {
    const isUserMessage = !(await supabaseService.isUserAnAgent(
      messages[i].user_id
    ));
    messageAuthors.push(isUserMessage ? "user" : "agent");
  }

  logger.info(
    `[RESPONSE DECISION] Message authors pattern: ${messageAuthors.slice(-10).join(", ")}`
  );

  // Count consecutive user messages
  let consecutiveUserMessages = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messageAuthors[i] === "user") {
      consecutiveUserMessages++;
    } else {
      break;
    }
  }

  logger.info(
    `[RESPONSE DECISION] Consecutive user messages: ${consecutiveUserMessages}`
  );

  // If we've reached the maximum consecutive user messages, force a response
  if (consecutiveUserMessages >= config.maxConsecutiveUserMessages) {
    logger.info(
      `[RESPONSE DECISION] Responding due to ${consecutiveUserMessages} consecutive user messages`
    );

    // Track this response
    responseTracker.recordResponse(roomId, lastMessage.id);

    return {
      shouldRespond: true,
      reason: "Maximum consecutive user messages reached",
      scheduleDelayedCheck: false,
    };
  }

  // Check if messages are in rapid succession (within the threshold)
  if (messages.length >= 2) {
    // Look at up to the last 30 messages to detect conversation flow
    const messageCount = Math.min(30, messages.length);
    const recentMessages = messages.slice(-messageCount);
    const messageTimes = recentMessages.map((msg) =>
      new Date(msg.created_at).getTime()
    );

    // Filter to only include user messages for time analysis
    const userMessageTimes = [];
    const userMessageIds = [];

    for (let i = 0; i < recentMessages.length; i++) {
      if (messageAuthors[messages.length - messageCount + i] === "user") {
        userMessageTimes.push(messageTimes[i]);
        userMessageIds.push(recentMessages[i].id);
      }
    }

    logger.info(
      `[RESPONSE DECISION] User message times: ${userMessageTimes.map((t) => new Date(t).toISOString()).join(", ")}`
    );

    // Calculate time differences between consecutive user messages
    const timeDiffs = [];
    for (let i = 1; i < userMessageTimes.length; i++) {
      timeDiffs.push(userMessageTimes[i] - userMessageTimes[i - 1]);
    }

    logger.info(
      `[RESPONSE DECISION] Time diffs between user messages (ms): ${timeDiffs.join(", ")}`
    );

    // Check if most recent user messages are within the threshold
    const recentUserTimeDiffs = timeDiffs.slice(-Math.min(3, timeDiffs.length));
    let recentMessagesInRapidSuccession = recentUserTimeDiffs.length > 0;

    for (const timeDiff of recentUserTimeDiffs) {
      if (timeDiff > config.rapidMessageThresholdMs) {
        recentMessagesInRapidSuccession = false;
        break;
      }
    }

    logger.info(
      `[RESPONSE DECISION] Recent messages in rapid succession: ${recentMessagesInRapidSuccession}`
    );

    // If recent messages are in rapid succession, check if this is part of an ongoing conversation
    if (recentMessagesInRapidSuccession) {
      const lastUserMessageTime = userMessageTimes[userMessageTimes.length - 1];
      // Use Date.now() directly to avoid variable conflicts
      const timeSinceLastUserMessage = Date.now() - lastUserMessageTime;

      logger.info(
        `[RESPONSE DECISION] Time since last user message: ${timeSinceLastUserMessage}ms`
      );

      // If the last message is very recent, schedule a delayed check
      if (timeSinceLastUserMessage < config.rapidMessageThresholdMs) {
        // Count how many messages are within the threshold overall
        const messagesWithinThreshold = timeDiffs.filter(
          (diff) => diff <= config.rapidMessageThresholdMs
        ).length;

        const percentWithinThreshold =
          timeDiffs.length > 0
            ? (messagesWithinThreshold / timeDiffs.length) * 100
            : 0;

        logger.info(
          `[RESPONSE DECISION] ${messagesWithinThreshold}/${timeDiffs.length} (${percentWithinThreshold.toFixed(1)}%) messages within threshold`
        );

        // Only schedule a delayed check if this is the first time we're seeing this message
        const shouldScheduleCheck = !responseTracker.respondedMessageIds
          .get(roomId)
          .has(lastMessage.id);

        // Mark that we've seen this message to prevent duplicate delayed checks
        if (shouldScheduleCheck) {
          // Don't record a full response, just mark the message as seen
          responseTracker.respondedMessageIds.get(roomId).add(lastMessage.id);
          logger.info(
            `[RESPONSE DECISION] Marked message ${lastMessage.id} as seen for delayed check`
          );
        }

        return {
          shouldRespond: false,
          reason: `Messages in rapid succession (${messagesWithinThreshold}/${timeDiffs.length} recent messages within threshold)`,
          scheduleDelayedCheck: shouldScheduleCheck,
        };
      }
    }
  }

  // If we've passed all checks, the agent should respond
  logger.info(`[RESPONSE DECISION] All checks passed, agent should respond`);

  // Track this response
  responseTracker.recordResponse(roomId, lastMessage.id);

  return {
    shouldRespond: true,
    reason: "Normal response conditions met",
    scheduleDelayedCheck: false,
  };
}

module.exports = {
  shouldAgentRespond,
};
