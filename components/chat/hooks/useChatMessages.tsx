import { useState, useCallback, useEffect } from 'react';
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import Pusher from 'pusher-js';

const MESSAGES_TABLE = process.env.NEXT_PUBLIC_MESSAGES_TABLE || 'messages';

export type Message = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  users?: {
    email: string;
  };
  name?: string;
  profile?: {
    name: string;
  };
  type: 'chat';
};

export type Participant = {
  user_id: string;
  joined_at: string;
  users: {
    email: string;
  };
};

export type UserInfo = {
  name: string;
  email?: string;
  isAgent: boolean;
};

export function useChatMessages(
  roomId: string,
  initialMessages: Message[],
  initialParticipants: Participant[],
  currentUser: User
) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  const [isLoading, setIsLoading] = useState(false);
  const [newMessageReceived, setNewMessageReceived] = useState<Message | null>(null);
  const [userCache, setUserCache] = useState<Record<string, UserInfo>>({});
  const supabase = createClient();

  // Load user cache from local storage on component mount
  useEffect(() => {
    const storedUsers = localStorage.getItem('chatUserCache');
    if (storedUsers) {
      try {
        setUserCache(JSON.parse(storedUsers));
      } catch (error) {
        console.error('Error parsing user cache from localStorage:', error);
      }
    }
  }, []);

  // Store user info in local storage
  const storeUserInfo = useCallback((userId: string, name: string, email: string = '', isAgent: boolean = false) => {
    const updatedCache = { ...userCache, [userId]: { name, email, isAgent } };
    setUserCache(updatedCache);
    localStorage.setItem('chatUserCache', JSON.stringify(updatedCache));
  }, [userCache]);

  // Get user info from cache, profiles, participants, or agents table
  const getUserInfo = useCallback(async (userId: string): Promise<UserInfo> => {
    // First check if it's in our cache
    if (userCache[userId]) {
      return { 
        name: userCache[userId].name, 
        email: userCache[userId].isAgent ? undefined : userCache[userId].name, 
        isAgent: userCache[userId].isAgent 
      };
    }

    // Check if it's the current user
    if (userId === currentUser.id) {
      const name = currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'You';
      storeUserInfo(userId, name, currentUser.email || '', false);
      return { name, email: currentUser.email, isAgent: false };
    }

    // Try to get user from profiles table
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userId)
        .single();

      if (profile && !error) {
        storeUserInfo(userId, profile.name, '', false);
        return { name: profile.name, isAgent: false };
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    }

    // Check participants list
    const participant = participants.find((p) => p.user_id === userId);
    if (participant) {
      const name = participant.users?.email?.split('@')[0] || 'User';
      storeUserInfo(userId, name, participant.users?.email, false);
      return { name, email: participant.users?.email, isAgent: false };
    }

    // If not found, check if it's an agent
    try {
      const { data: agent, error } = await supabase
        .from('agents')
        .select('name')
        .eq('id', userId)
        .single();

      if (agent && !error) {
        storeUserInfo(userId, agent.name, undefined, true);
        return { name: agent.name, isAgent: true };
      }
    } catch (error) {
      console.error('Error fetching agent data:', error);
    }

    // Default fallback
    const defaultName = 'Unknown User';
    storeUserInfo(userId, defaultName, '', false);
    return { name: defaultName, isAgent: false };
  }, [currentUser, participants, storeUserInfo, supabase, userCache]);

  // Get user email by user ID (simplified version for backward compatibility)
  const getUserEmail = useCallback((userId: string) => {
    // First check cache
    if (userCache[userId]) {
      return userCache[userId].isAgent ? userCache[userId].name : userCache[userId].email || userCache[userId].name;
    }
    
    // Then check if it's the current user
    if (userId === currentUser.id) {
      return currentUser.email || "You";
    }
    
    // Then check participants list
    const participant = participants.find((p) => p.user_id === userId);
    return participant?.users?.email || "Unknown User";
  }, [currentUser, participants, userCache]);

  // Send a message
  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.from(MESSAGES_TABLE).insert({
        room_id: roomId,
        user_id: currentUser.id,
        content: message,
      });

      if (error) {
        console.error("Error sending message:", error);
        return;
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id, roomId, supabase]);

  // Set up Pusher subscription for real-time messages
  useEffect(() => {
    // Initialize Pusher without excessive logging
    Pusher.logToConsole = false;
    
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: 'us3',
    });

    // Subscribe to the room channel
    const channel = pusher.subscribe(`room-${roomId}`);
    
    // Simplified connection logging
    pusher.connection.bind('error', (err: any) => {
      console.error('Pusher connection error:', err);
    });

    // Listen for new messages
    channel.bind('new-message', async (data: any) => {
      try {
        const messageData = typeof data === 'string' ? JSON.parse(data) : data;
        
        // Get user info and update cache if needed
        const userInfo = await getUserInfo(messageData.user_id);
        
        // Create a properly typed message object
        const newMessage: Message = {
          ...messageData,
          type: 'chat',
          users: { email: userInfo.email || '' },
          name: userInfo.name
        };
        
        setMessages(prev => [...prev, newMessage]);
        setNewMessageReceived(newMessage);
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    // Listen for user joined events
    channel.bind('user-joined', async (data: { user_id: string }) => {
      // Add to participants list
      const newParticipant = {
        user_id: data.user_id,
        joined_at: new Date().toISOString(),
        users: { email: '' } // Will be populated by ParticipantList component
      };
      setParticipants(prev => [...prev, newParticipant]);
      
      // No longer adding status messages
    });

    // Listen for user left events
    channel.bind('user-left', (data: { user_id: string }) => {
      // Remove from participants list
      setParticipants(prev => prev.filter(p => p.user_id !== data.user_id));
      
    });
    


    // Clean up on unmount
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`room-${roomId}`);
    };
  }, [getUserInfo, roomId]);

  // Helper functions
  const getMessageTimestamp = (message: Message): string => {
    return message.created_at;
  };

  const formatTime = (timestamp: string) => {
    // Create a date object from the timestamp
    const date = new Date(timestamp);
    
    // Format hours and minutes manually to ensure consistent format
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    // Return in HH:MM format
    return `${hours}:${minutes}`;
  };

  const isCurrentUser = (userId: string) => userId === currentUser.id;

  return {
    messages,
    participants,
    isLoading,
    newMessageReceived,
    userCache,
    handleSendMessage,
    getUserInfo,
    getUserEmail,
    getMessageTimestamp,
    formatTime,
    isCurrentUser
  };
}
