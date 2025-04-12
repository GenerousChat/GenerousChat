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

  const MONKEY_TIME_PAUSE = 10000;
  const MONKEY_TIME_OVERTURE = 30000;
  const MONKEY_TIME_DELAY = 5000;

  const realTimeMessages = messages.map((msg) => ({
    ...msg,
    created_at: new Date(msg.created_at).getTime(),
  }));

  // fetch agent uuids from supabase
  const agents = await supabaseService.fetchAIAgents();
  const agentUuids = agents.map((agent) => agent.uuid);

  // starting from the last message, we want to check the previous and see if its longer than MONKEY_TIME_PAUSE, just the message before

  let lastMessage = realTimeMessages[realTimeMessages.length - 1];
  const secondLastMessage = realTimeMessages[realTimeMessages.length - 2];
  const sameConsecutiveUser = lastMessage.user_id === secondLastMessage.user_id;
  const sameConsecutiveAnyUsers =
    agentUuids.includes(lastMessage.user_id) &&
    agentUuids.includes(secondLastMessage.user_id);

  console.log("=======");
  console.log("=======");
  console.log("=======");
  console.log("=======");

  console.log({
    sameConsecutiveUser,
    sameConsecutiveAnyUsers,
  });

  if (sameConsecutiveUser || sameConsecutiveAnyUsers) {
    // it should call this function after MONKEY_TIME_DELAY

    return {
      shouldRespond: false,
      reason: "Same consecutive user or users",
      scheduleDelayedCheck: false,
    };
  }

  return {
    shouldRespond: false,
    reason: "Failed debug test",
    scheduleDelayedCheck: false,
  };
  // time between last and second last
  const timeBetweenMessages =
    lastMessage.created_at - secondLastMessage.created_at;

  if (
    timeBetweenMessages > MONKEY_TIME_PAUSE &&
    timeBetweenMessages < MONKEY_TIME_OVERTURE
  ) {
    return {
      shouldRespond: false,
      reason: "Monkey time pause",
      scheduleDelayedCheck: false,
    };
  }

  // If we've passed all checks, the agent should respond
  return {
    shouldRespond: true,
    reason: "Normal response conditions met",
    scheduleDelayedCheck: false,
  };
}

module.exports = shouldAgentRespond;
