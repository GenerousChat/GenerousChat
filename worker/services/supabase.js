/**
 * Supabase service for database operations
 */
const { createClient } = require("@supabase/supabase-js");
const config = require("../config");
const logger = require("../utils/logger");

// Initialize Supabase client
const keyType = config.supabase.serviceKey ? "service role" : "anon";
logger.info(
  `Initializing Supabase client with URL: ${config.supabase.url ? "URL is set" : "URL is NOT set"} and ${keyType} key: ${config.supabase.serviceKey || config.supabase.anonKey ? "Key is set" : "Key is NOT set"}`
);

const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey || config.supabase.anonKey
);

logger.info(`Supabase client initialized with ${keyType} key`);

// Store AI agents fetched from the database
let aiAgents = [];

// Set to store AI agent user IDs to prevent AI from responding to its own messages
let aiAgentIds = new Set();

/**
 * Fetch AI agents from the database
 * @returns {Promise<Array>} Array of AI agents
 */
async function fetchAIAgents() {
  try {
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("name");

    if (error) {
      logger.error("Error fetching AI agents:", error);
      return [];
    }

    if (data && data.length > 0) {
      aiAgents = data;
      // Update the set of AI agent IDs
      aiAgentIds = new Set(data.map((agent) => agent.id));
      logger.info(`Fetched ${aiAgents.length} AI agents`);
      return data;
    } else {
      logger.info("No AI agents found in the database");
      return [];
    }
  } catch (error) {
    logger.error("Error in fetchAIAgents:", error);
    return [];
  }
}

/**
 * Fetch the last 50 messages from Supabase
 * @returns {Promise<Array>} Array of recent messages
 */
async function fetchRecentMessages() {
  // Deprecated - messages are now fetched live when needed
  return [];
}

/**
 * Set up Supabase real-time listeners
 * @param {Function} onMessageInserted - Callback for message insertion
 * @param {Function} onParticipantJoined - Callback for participant joining
 * @param {Function} onParticipantLeft - Callback for participant leaving
 * @returns {Promise<Object>} Supabase channel
 */
async function setupSupabaseListeners(
  onMessageInserted,
  onParticipantJoined,
  onParticipantLeft
) {
  logger.info("Setting up Supabase real-time listeners...");

  // Create a single channel for all events
  logger.info("Setting up combined channel subscription...");
  const channel = supabase
    .channel("db-changes")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: config.supabase.messagesTable,
      },
      async (payload) => {
        logger.info("===== MESSAGE INSERTED CALLBACK TRIGGERED =====");
        logger.debug("New message received:", payload);

        const message = payload.new;

        // Note: We're not adding the message to recentMessages here anymore
        // This is now handled in the onMessageInserted callback to avoid duplication
        // and ensure consistent handling

        // Call the message inserted callback if provided
        if (onMessageInserted) {
          await onMessageInserted(message);
        }
      }
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "room_participants",
      },
      async (payload) => {
        logger.info("===== PARTICIPANT JOINED CALLBACK TRIGGERED =====");
        logger.debug("User joined room:", payload);

        if (onParticipantJoined) {
          await onParticipantJoined(payload.new);
        }
      }
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "room_participants",
      },
      async (payload) => {
        logger.info("===== PARTICIPANT LEFT CALLBACK TRIGGERED =====");
        logger.debug("User left room:", payload);

        if (onParticipantLeft) {
          await onParticipantLeft(payload.old);
        }
      }
    );

  // Subscribe to the channel
  logger.info("Subscribing to channel...");
  channel.subscribe((status) => {
    logger.info(`Subscription status changed: ${status}`);
    if (status === "SUBSCRIBED") {
      logger.info("Successfully subscribed to database changes!");
    }
    if (status === "CHANNEL_ERROR") {
      logger.error("Failed to subscribe to database changes");
    }
  });

  logger.info("Supabase real-time listeners set up successfully");
  logger.debug("Channel subscription state:", channel.state);

  return { channel };
}

/**
 * Get user profiles for a list of user IDs
 * @param {Array<string>} userIds - Array of user IDs
 * @returns {Promise<Object>} Map of user IDs to names
 */
async function getUserProfiles(userIds) {
  try {
    // Filter out null or undefined user IDs to prevent database errors
    const validUserIds = userIds.filter(
      (id) => id !== null && id !== undefined
    );

    // If there are no valid user IDs, return an empty object
    if (validUserIds.length === 0) {
      logger.info("No valid user IDs to fetch profiles for");
      return {};
    }

    // Create a mapping for null/undefined IDs
    const userNames = {};
    userIds.forEach((id) => {
      if (id === null || id === undefined) {
        userNames[id] = "System";
      }
    });

    // Fetch profiles for valid user IDs
    const { data: userProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", validUserIds);

    if (profilesError) {
      logger.error("Error fetching user profiles:", profilesError);
      return userNames; // Return the mapping with null IDs already handled
    }

    logger.debug("Fetched user profiles:", userProfiles);

    // Add fetched profiles to the user names map
    if (userProfiles && userProfiles.length > 0) {
      userProfiles.forEach((profile) => {
        userNames[profile.id] = profile.name;
      });
      logger.debug("User names map from profiles:", userNames);
    } else {
      logger.info("No user profiles found or empty array returned");
    }

    return userNames;
  } catch (error) {
    logger.error("Error getting user profiles:", error);
    return {};
  }
}

/**
 * Get agent profiles for a list of agent IDs
 * @param {Array<string>} agentIds - Array of agent IDs
 * @returns {Promise<Object>} Map of agent IDs to names
 */
/**
 * Check if a user ID belongs to an AI agent
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>} True if user is an AI agent
 */
async function isUserAnAgent(userId) {
  // If userId is null/undefined, it's not an agent
  if (!userId) {
    logger.debug(
      "Received null/undefined userId in isUserAnAgent, treating as non-agent"
    );
    return false;
  }

  try {
    const { data, error } = await supabase
      .from("agents")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      logger.error("Error checking if user is agent:", error);
      return false;
    }

    return data !== null;
  } catch (error) {
    logger.error("Error in isUserAnAgent:", error);
    return false;
  }
}

async function getAgentProfiles(agentIds) {
  try {
    const { data: agentData, error: agentError } = await supabase
      .from("agents")
      .select("id, name")
      .in("id", agentIds);

    if (agentError) {
      logger.error("Error fetching agent data:", agentError);
      return {};
    }

    const agentNames = {};
    if (agentData && agentData.length > 0) {
      agentData.forEach((agent) => {
        agentNames[agent.id] = agent.name;
      });
      logger.debug("Agent names map:", agentNames);
    }

    return agentNames;
  } catch (error) {
    logger.error("Error getting agent profiles:", error);
    return {};
  }
}

/**
 * Save a message to the database
 * @param {string} roomId - Room ID
 * @param {string} userId - User ID
 * @param {string} content - Message content
 * @returns {Promise<Object>} Saved message
 */
async function saveMessage(roomId, userId, content) {
  try {
    const { data, error } = await supabase
      .from(config.supabase.messagesTable)
      .insert({
        room_id: roomId,
        user_id: userId,
        content: content,
      })
      .select()
      .single();

    if (error) {
      logger.error("Error saving message to database:", error);
      throw error;
    }

    logger.info(`Message saved to database for room: ${roomId}`);
    return data;
  } catch (error) {
    logger.error("Error in saveMessage:", error);
    throw error;
  }
}

/**
 * Save a generation to the database
 * @param {string} roomId - Room ID
 * @param {string} html - HTML content
 * @param {string} summary - Summary
 * @param {string} createdBy - Creator ID
 * @param {string} type - Generation type
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Saved generation
 */
async function saveGeneration(
  roomId,
  html,
  summary,
  createdBy,
  type,
  metadata
) {
  try {
    const { data: generation, error: insertError } = await supabase
      .from("chat_room_generations")
      .insert({
        room_id: roomId,
        html: html,
        summary: summary,
        created_by: createdBy,
        type: type,
        metadata: metadata,
      })
      .select()
      .single();

    // insert into canvas_generations
    // this is not the right way, we should be invoking travis thing
    const { data: generationNeo, error: insertErrorNeo } = await supabase
      .from("canvas_generations")
      .insert({
        room_id: roomId,
        html: html,
        summary: summary,
        template_id: null,
        render_method: "fallback_iframe",
        type: "visualization",
        metadata: metadata,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Error storing generation: ${insertError.message}`);
    }

    logger.info(`Generation stored in database with ID: ${generation.id}`);
    return generation;
  } catch (error) {
    logger.error("Error saving generation:", error);
    throw error;
  }
}

/**
 * Get the last generation for a room
 * @param {string} roomId - Room ID
 * @returns {Promise<Object>} Last generation
 */
async function getLastGeneration(roomId) {
  try {
    const { data, error } = await supabase
      .from("chat_room_generations")
      .select()
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      logger.error("Error fetching last generation:", error);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    logger.error("Error in getLastGeneration:", error);
    return null;
  }
}

module.exports = {
  supabase,
  isUserAnAgent,
  fetchAIAgents,
  fetchRecentMessages,
  setupSupabaseListeners,
  getUserProfiles,
  getAgentProfiles,
  saveMessage,
  saveGeneration,
  getLastGeneration,
};
