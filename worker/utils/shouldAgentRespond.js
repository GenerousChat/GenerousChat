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
  return true;
  // If there are no messages, don't respond
  console.log("=====", JSON.stringify(messages, null, 2));
  /*
  ===== [
  {
    "id": "b5f7229b-d599-41da-8d2f-815d044392e0",
    "room_id": "c4e00ce9-1407-4998-afed-5ad217efd714",
    "user_id": "e92d83f8-b2cd-4ebe-8d06-6e232e64736a",
    "content": "gu",
    "created_at": "2025-04-11T23:16:21.447436+00:00",
    "read_by_ai": false
  },
  {
    "id": "f61d7434-16d7-44f4-b9da-8075274a5b75",
    "room_id": "c4e00ce9-1407-4998-afed-5ad217efd714",
    "user_id": "e92d83f8-b2cd-4ebe-8d06-6e232e64736a",
    "content": "hi",
    "created_at": "2025-04-11T23:17:08.49741+00:00",
    "read_by_ai": false
  },
  
]

*/

  const MONKEY_BUFFER = 10000;

  // in the last minute, count the total messages
  const lastMinuteMessages = messages.filter((msg) => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    return new Date(msg.created_at) > oneMinuteAgo;
  });

  const messagesPerMinute = (lastMinuteMessages.length / 60) * 100;

  // calculate time since last message in ms
  const lastMessage = messages[messages.length - 1];
  const secondLastMessage = messages[messages.length - 2];
  console.log("XXXXXXXXXXXXXXXXXXXXXXXXXXX");
  console.log("XXXXXXXXXXXXXXXXXXXXXXXXXXX");
  console.log("XXXXXXXXXXXXXXXXXXXXXXXXXXX");
  console.log("XXXXXXXXXXXXXXXXXXXXXXXXXXX");
  console.log("XXXXXXXXXXXXXXXXXXXXXXXXXXX");
  console.log("XXXXXXXXXXXXXXXXXXXXXXXXXXX");
  console.log("XXXXXXXXXXXXXXXXXXXXXXXXXXX");
  console.log("XXXXXXXXXXXXXXXXXXXXXXXXXXX");
  console.log({ lastMessage, secondLastMessage });
  const timeSinceLastMessage = new Date() - new Date(lastMessage.created_at);

  console.log("==================");
  console.log("==================");
  console.log("==================");
  console.log("==================");
  console.log("==================");
  console.log({
    lastMessage,
    secondLastMessage,
    messagesPerMinute,
    timeSinceLastMessage,
  });

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

module.exports = shouldAgentRespond;
