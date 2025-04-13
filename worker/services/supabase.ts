/**
 * Supabase service for database operations
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import config from "../config/index.js";
import logger from "../utils/logger.js";

// Define interfaces for the data models
export interface Message {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  read_by_ai?: boolean;
}

export interface Participant {
  user_id: string;
  room_id: string;
  joined_at?: string;
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  created_at?: string;
}

export interface Profile {
  id: string;
  name: string;
  avatar_url?: string;
}

export interface Generation {
  id?: string;
  room_id: string;
  html: string;
  summary: string;
  created_by: string;
  type: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

console.log("config", {config});

// Initialize Supabase client
const keyType = config.supabase.serviceKey ? "service role" : "anon";
logger.info(
  `Initializing Supabase client with URL: ${config.supabase.url ? "URL is set" : "URL is NOT set"} and ${keyType} key: ${config.supabase.serviceKey || config.supabase.anonKey ? "Key is set" : "Key is NOT set"}`
);

const supabase: SupabaseClient = createClient(
  config.supabase.url,
  config.supabase.serviceKey || config.supabase.anonKey
);

logger.info(`Supabase client initialized with ${keyType} key`);

// Store AI agents fetched from the database
let aiAgents: Agent[] = [];

// Set to store AI agent user IDs to prevent AI from responding to its own messages
let aiAgentIds: Set<string> = new Set();

/**
 * Fetch AI agents from the database
 * @returns Array of AI agents
 */
async function fetchAIAgents(): Promise<Agent[]> {
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
    logger.error("Error in fetchAIAgents:", error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Fetch the last 50 messages from Supabase
 * @returns Array of recent messages
 */
async function fetchRecentMessages(): Promise<Message[]> {
  // Deprecated - messages are now fetched live when needed
  return [];
}

/**
 * Set up Supabase real-time listeners
 * @param onMessageInserted - Callback for message insertion
 * @param onParticipantJoined - Callback for participant joining
 * @param onParticipantLeft - Callback for participant leaving
 * @returns Supabase channel
 */
async function setupSupabaseListeners(
  onMessageInserted: (message: Message) => Promise<void>,
  onParticipantJoined: (participant: Participant) => Promise<void>,
  onParticipantLeft: (participant: Participant) => Promise<void>
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

        const message = payload.new as Message;

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
          await onParticipantJoined(payload.new as Participant);
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
          await onParticipantLeft(payload.old as Participant);
        }
      }
    );

  // Subscribe to the channel
  logger.info("Subscribing to channel...");
  try {
    await channel.subscribe();
    logger.info("Successfully subscribed to real-time events");
    return channel;
  } catch (error) {
    logger.error("Error subscribing to channel:", error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Get user profiles for a list of user IDs
 * @param userIds - Array of user IDs
 * @returns Map of user IDs to names
 */
async function getUserProfiles(userIds: string[]): Promise<Record<string, string>> {
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
    const userNames: Record<string, string> = {};
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
    logger.error("Error getting user profiles:", error instanceof Error ? error.message : String(error));
    return {};
  }
}

/**
 * Check if a user ID belongs to an AI agent
 * @param userId - User ID to check
 * @returns True if user is an AI agent
 */
async function isUserAnAgent(userId: string): Promise<boolean> {
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
    logger.error("Error in isUserAnAgent:", error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Get agent profiles for a list of agent IDs
 * @param agentIds - Array of agent IDs
 * @returns Map of agent IDs to names
 */
async function getAgentProfiles(agentIds: string[]): Promise<Record<string, string>> {
  try {
    const { data: agentData, error: agentError } = await supabase
      .from("agents")
      .select("id, name")
      .in("id", agentIds);

    if (agentError) {
      logger.error("Error fetching agent data:", agentError);
      return {};
    }

    const agentNames: Record<string, string> = {};
    if (agentData && agentData.length > 0) {
      agentData.forEach((agent) => {
        agentNames[agent.id] = agent.name;
      });
      logger.debug("Agent names map:", agentNames);
    }

    return agentNames;
  } catch (error) {
    logger.error("Error getting agent profiles:", error instanceof Error ? error.message : String(error));
    return {};
  }
}

/**
 * Save a message to the database
 * @param roomId - Room ID
 * @param userId - User ID
 * @param content - Message content
 * @returns Saved message
 */
async function saveMessage(roomId: string, userId: string, content: string): Promise<Message> {
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
    logger.error("Error in saveMessage:", error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Save a generation to the database
 * @param roomId - Room ID
 * @param html - HTML content
 * @param summary - Summary
 * @param createdBy - Creator ID
 * @param type - Generation type
 * @param metadata - Additional metadata
 * @returns Saved generation
 */
async function saveGeneration(
  roomId: string,
  html: string,
  summary: string,
  createdBy: string,
  type: string,
  metadata?: Record<string, any>
): Promise<Generation> {
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

    if (insertError) {
      throw new Error(`Error storing generation: ${insertError.message}`);
    }

    logger.info(`Generation stored in database with ID: ${generation.id}`);
    return generation;
  } catch (error) {
    logger.error("Error saving generation:", error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Get the last generation for a room
 * @param roomId - Room ID
 * @returns Last generation
 */
async function getLastGeneration(roomId: string): Promise<Generation | null> {
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
    logger.error("Error in getLastGeneration:", error instanceof Error ? error.message : String(error));
    return null;
  }
}

// Export individual functions and types
export {
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

// Export as default for compatibility with existing imports
const supabaseService = {
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

export default supabaseService;
