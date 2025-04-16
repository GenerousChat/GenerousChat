"use client";

import { memo, useEffect, useState, useCallback } from 'react';
import { createClient } from "@/utils/supabase/client";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { useSpeaking, SpeakingActivityType } from "@/utils/speaking-context";
import { Mic, Volume2 } from "lucide-react";
import Pusher from 'pusher-js';

interface Participant {
  user_id: string;
  users: {
    email: string;
  };
  joined_at?: string;
}

interface ParticipantListProps {
  participants: Participant[];
  onJoinAudio?: () => void;
  showAudioRoom?: boolean;
}

interface ParticipantInfo {
  name: string;
  isAgent: boolean;
  id: string;
  lastActive?: number; // Timestamp of last activity
}

const ParticipantList = memo(({ participants, onJoinAudio, showAudioRoom = false }: ParticipantListProps) => {
  const [userInfo, setUserInfo] = useState<Record<string, ParticipantInfo>>({});
  const [agents, setAgents] = useState<ParticipantInfo[]>([]);
  const [lastActivityMap, setLastActivityMap] = useState<Record<string, number>>({});
  const { isParticipantSpeaking, getParticipantActivityType } = useSpeaking();
  
  // Check if user is active (activity in last 5 minutes)
  const isActive = useCallback((userId: string) => {
    const lastActive = lastActivityMap[userId] || 0;
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000; // 5 minutes in milliseconds
    return lastActive > fiveMinutesAgo;
  }, [lastActivityMap]);
  
  // Load agents from the database
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('agents')
          .select('id, name');
        
        if (!error && data) {
          const agentInfo = data.map(agent => ({
            id: agent.id,
            name: agent.name,
            isAgent: true,
            lastActive: Date.now() // Agents are always considered active
          }));
          setAgents(agentInfo);
          
          // Add agents to userInfo
          const newInfo = { ...userInfo };
          agentInfo.forEach(agent => {
            newInfo[agent.id] = agent;
          });
          setUserInfo(newInfo);
        }
      } catch (error) {
        console.error('Error loading agents:', error);
      }
    };
    
    loadAgents();
  }, []);
  
  // Load profile names once when participants change
  useEffect(() => {
    const loadProfiles = async () => {
      const supabase = createClient();
      const participantIds = participants.map(p => p.user_id);
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', participantIds);
      
      if (!error && profiles) {
        const newInfo = { ...userInfo };
        profiles.forEach(profile => {
          if (profile.name) {
            // Preserve existing lastActive value if it exists
            const existingInfo = newInfo[profile.id];
            newInfo[profile.id] = {
              id: profile.id,
              name: profile.name,
              isAgent: false,
              lastActive: existingInfo?.lastActive
            };
          }
        });
        setUserInfo(newInfo);
      }
    };
    
    loadProfiles();
  }, [participants.map(p => p.user_id).join(',')]); // Only reload if participant IDs change
  
  // Setup Pusher to track user activity
  useEffect(() => {
    // Initialize Pusher
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '96f9360f34a831ca1901', {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us3',
    });
    
    // Assuming we're in a chat room, get roomId from URL or context
    const pathParts = window.location.pathname.split('/');
    const roomId = pathParts[pathParts.length - 1]; // Gets the last part of the URL path
    
    // Subscribe to the room channel
    const channel = pusher.subscribe(`room-${roomId}`);
    
    // Update activity on various events
    const handleActivity = (data: any) => {
      if (data && data.user_id) {
        updateUserActivity(data.user_id);
      }
    };
    
    channel.bind('new-message', handleActivity);
    channel.bind('user-joined', handleActivity);
    channel.bind('new-status', handleActivity);
    channel.bind('heartbeat', handleActivity);
    
    // Clean up on unmount
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`room-${roomId}`);
    };
  }, []);
  
  // Update user activity timestamp
  const updateUserActivity = useCallback((userId: string) => {
    const now = Date.now();
    setLastActivityMap(prev => ({ ...prev, [userId]: now }));
    
    // Also update in userInfo if it exists
    setUserInfo(prev => {
      if (prev[userId]) {
        return {
          ...prev,
          [userId]: {
            ...prev[userId],
            lastActive: now
          }
        };
      }
      return prev;
    });
  }, []);
  
  // Send heartbeat to indicate user is active
  const sendHeartbeat = useCallback(async () => {
    try {
      // Get current user ID
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const currentUserId = data.user?.id;
      
      if (currentUserId) {
        // Get roomId from URL
        const pathParts = window.location.pathname.split('/');
        const roomId = pathParts[pathParts.length - 1];
        
        // We can't directly trigger events from the client with standard Pusher
        // Instead, we'll use a client-side trigger endpoint
        const timestamp = new Date().toISOString();
        
        // Create a custom event to broadcast to other clients
        const eventData = {
          user_id: currentUserId,
          timestamp: timestamp
        };
        
        // Update local activity state
        updateUserActivity(currentUserId);
        
        // Send the heartbeat through our API endpoint
        await fetch('/api/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomId,
            userId: currentUserId,
            timestamp: timestamp
          }),
        });
      }
    } catch (error) {
      console.error('Error sending heartbeat:', error);
    }
  }, [updateUserActivity]);
  
  // Initialize activity on component mount from joined_at timestamps
  useEffect(() => {
    const activityMap: Record<string, number> = {};
    
    participants.forEach(participant => {
      if (participant.joined_at) {
        const joinedTime = new Date(participant.joined_at).getTime();
        activityMap[participant.user_id] = joinedTime;
      }
    });
    
    // Only update if we have new data
    if (Object.keys(activityMap).length > 0) {
      setLastActivityMap(prev => ({ ...prev, ...activityMap }));
    }
  }, [participants]);
  
  // Set up heartbeat interval
  useEffect(() => {
    // Send initial heartbeat
    sendHeartbeat();
    
    // Set up interval to send heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      sendHeartbeat();
    }, 30 * 1000); // 30 seconds
    
    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [sendHeartbeat]);
  
  // Sort participants by activity status
  const sortedParticipants = [...participants].sort((a, b) => {
    const aActive = isActive(a.user_id) ? 1 : 0;
    const bActive = isActive(b.user_id) ? 1 : 0;
    return bActive - aActive; // Active users first
  });

  return (
    <div className="w-full border dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800 flex flex-col">
    <div className="text-sm text-muted-foreground">
          {participants?.length || 0} participant(s)
        </div>
      
      {/* Audio Room Join Button */}
      {false && onJoinAudio && !showAudioRoom && (
        <div className="p-3 border-b">
          <Button 
            onClick={onJoinAudio} 
            className="w-full flex items-center justify-center gap-2 text-xs"
            size="sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
            Join Audio Chat
          </Button>
        </div>
      )}
      
      {/* Audio Room Status */}
      {showAudioRoom && (
        <div className="p-3 border-b dark:border-gray-700 bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center justify-center gap-2 text-xs text-green-700 dark:text-green-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full animate-pulse"></span>
              Audio Connected
            </span>
          </div>
        </div>
      )}
      
      <div className="flex-1 p-2 space-y-1 overflow-auto text-gray-800 dark:text-gray-200">
        {/* Human participants */}
        {sortedParticipants.map((participant) => {
          const info = userInfo[participant.user_id] || { id: participant.user_id, name: 'Loading...', isAgent: false };
          const isOnline = isActive(participant.user_id);
          return (
            <div 
              key={participant.user_id} 
              className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/70"
            >
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 dark:bg-green-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
              <span className="text-sm truncate text-gray-900 dark:text-gray-100">{info.name}</span>
              {info.isAgent && (
                <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">AI</span>
              )}
              
              {/* Speaking indicator */}
              {false && isParticipantSpeaking(participant.user_id) && (
                <SpeakingIndicator 
                  activityType={getParticipantActivityType(participant.user_id)} 
                  isAgent={info.isAgent}
                />
              )}
            </div>
          );
        })}
        
        {/* AI Agents */}
        {agents.map((agent) => {
          const isOnline = true; // Agents are always online
          return (
            <div 
              key={agent.id} 
              className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/70"
            >
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-blue-500 dark:bg-blue-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
              <span className="text-sm truncate text-gray-900 dark:text-gray-100">{agent.name}</span>
              <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">AI</span>
              
              {/* Speaking indicator */}
              {false && isParticipantSpeaking(agent.id) && (
                <SpeakingIndicator 
                  activityType={getParticipantActivityType(agent.id)} 
                  isAgent={true}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

ParticipantList.displayName = 'ParticipantList';

// Speaking indicator component
interface SpeakingIndicatorProps {
  activityType: SpeakingActivityType;
  isAgent: boolean;
}

const SpeakingIndicator = ({ activityType, isAgent }: SpeakingIndicatorProps) => {
  // Different animations based on activity type
  const getAnimationClass = () => {
    return 'animate-pulse'; // Basic animation for now
  };
  
  // Different colors based on activity type
  const getColorClass = () => {
    switch (activityType) {
      case 'transcribing':
        return 'text-green-500 dark:text-green-400';
      case 'tts':
        return 'text-blue-500 dark:text-blue-400';
      default:
        return 'text-gray-400 dark:text-gray-500';
    }
  };
  
  return (
    <div className={`flex items-center ${getColorClass()} ${getAnimationClass()}`}>
      {activityType === 'transcribing' ? (
        <Mic className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
      <div className="ml-1 flex space-x-1">
        <span className="block w-1 h-3 bg-current rounded-full animate-sound-wave-1"></span>
        <span className="block w-1 h-4 bg-current rounded-full animate-sound-wave-2"></span>
        <span className="block w-1 h-2 bg-current rounded-full animate-sound-wave-3"></span>
      </div>
    </div>
  );
};

export default ParticipantList;
