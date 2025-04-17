import supabaseService from "../supabase";
import logger from "../../utils/logger.js";
import selectBestAgent from "./selectBestAgent";
import generateResponseWithAgent from "./generateResponseWithAgent";
import config from "../../config/index.js";

// Helper function to fetch names (could be moved to supabaseService)
async function fetchNamesForUserIds(userIds: string[]): Promise<{ profiles: Map<string, string>, agents: Map<string, string> }> {
  const profileMap = new Map<string, string>();
  const agentMap = new Map<string, string>();

  if (!userIds || userIds.length === 0) {
    return { profiles: profileMap, agents: agentMap };
  }

  // Fetch profiles
  const { data: profilesData, error: profilesError } = await supabaseService.supabase
    .from('profiles') // Assuming 'profiles' is your table name
    .select('id, name') // Assuming 'id' is the user_id link and 'name' is the column with the name
    .in('id', userIds);

  if (profilesError) {
    logger.error("Error fetching profiles:", profilesError);
    // Continue without profile names
  } else if (profilesData) {
    profilesData.forEach(profile => {
      if (profile.id && profile.name) {
        profileMap.set(profile.id, profile.name);
      }
    });
  }

  // Fetch agents - Fetch only for IDs not found in profiles
  const agentUserIds = userIds.filter(id => !profileMap.has(id));
  if (agentUserIds.length > 0) {
      const { data: agentsData, error: agentsError } = await supabaseService.supabase
        .from('agents') // Assuming 'agents' is your table name
        .select('id, name') // Assuming 'user_id' links to auth user and 'name' is the agent's name
        .in('id', agentUserIds);

       if (agentsError) {
        logger.error("Error fetching agents:", agentsError);
        // Continue without agent names
       } else if (agentsData) {
        agentsData.forEach(agent => {
           if (agent.id && agent.name) {
             agentMap.set(agent.id, agent.name);
           }
         });
       }
  }


  return { profiles: profileMap, agents: agentMap };
}


const generateAIResponse = async (roomId: string): Promise<boolean> => {
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

     // --- Name Enrichment Start ---
     const userIds = Array.from(new Set(messages.map(msg => msg.user_id))); // Get unique user IDs
     const fetchNamesTimerLabel = `fetchNames-${roomId}`;
     console.time(fetchNamesTimerLabel);
     const { profiles: profileNameMap, agents: agentNameMap } = await fetchNamesForUserIds(userIds);
     console.timeEnd(fetchNamesTimerLabel);
     // --- Name Enrichment End ---

    // Get the most recent user message
    const lastUserMessage = messages[0] as any;
     const lastUserMessageSenderName = profileNameMap.get(lastUserMessage.user_id) ?? agentNameMap.get(lastUserMessage.user_id) ?? lastUserMessage.user_id;
     logger.info(`Last message from ${lastUserMessageSenderName}: ${lastUserMessage.content}`);


    // Create a formatted message history for the AI
    const messageHistory = messages
      .reverse()
      .map((msg: any) => {
         // Look up name: Profile -> Agent -> user_id
         const senderName = profileNameMap.get(msg.user_id) ?? agentNameMap.get(msg.user_id) ?? msg.user_id;
         return `- ${senderName}: ${msg.content}`;
      })
      .join("\n");


    const selectAgentTimerLabel = `selectAgent-${roomId}`;
    console.time(selectAgentTimerLabel);
    const selectedAgent = await selectBestAgent(
      roomId,
      lastUserMessage, // Pass original message object
      messageHistory // Pass enriched history string
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
       lastUserMessage, // Pass original message object
       messageHistory, // Pass enriched history string
       lastGenerationHtml
     );
     console.timeEnd(generateResponseTimerLabel);

     return result;

  } catch (e) {
    logger.error(`Error in generateAIResponse for room ${roomId}:`, e);
    return false;
  } finally {
    console.timeEnd(functionTimerLabel);
  }
};

export default generateAIResponse;