"use client";

import { memo, useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from "@/utils/supabase/client";
import { Button } from "../ui/button";
import { useSpeaking, SpeakingActivityType } from "@/utils/speaking-context";
import { Mic, Volume2 } from "lucide-react";
import Pusher from 'pusher-js';
import { Tooltip } from 'react-tooltip';

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

interface AgentInfo {
  id: string;
  name: string;
  isAgent: boolean;
  description: string;
}

const agentColors = [
  'bg-blue-500 dark:bg-blue-400',
  'bg-purple-500 dark:bg-purple-400',
  'bg-pink-500 dark:bg-pink-400',
  'bg-indigo-500 dark:bg-indigo-400',
  'bg-cyan-500 dark:bg-cyan-400',
  'bg-teal-500 dark:bg-teal-400',
];

const getAgentColor = (index: number): string => {
  return agentColors[index % agentColors.length];
};

const ParticipantList = memo(({ participants, onJoinAudio, showAudioRoom = false }: ParticipantListProps) => {  const [userInfo, setUserInfo] = useState<Record<string, ParticipantInfo>>({});
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [lastActivityMap, setLastActivityMap] = useState<Record<string, number>>({});
  const { isParticipantSpeaking, getParticipantActivityType } = useSpeaking();

  // Create a map of agent IDs to their colors
  const agentColorMap = useMemo(() => {
    const colorMap: Record<string, string> = {};
    agents.forEach((agent, index) => {
      colorMap[agent.id] = getAgentColor(index);
    });
    return colorMap;
  }, [agents]);
  
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
        // Explicitly select id, name, and personality_prompt
        const { data, error } = await supabase
          .from('agents')
          .select('id, name, personality_prompt');

        if (error) {
           return; // Stop if there's an error
        }

        if (data) {
          // Ensure mapping includes description from personality_prompt
          const agentInfo: AgentInfo[] = data.map(agent => ({
            id: agent.id,
            name: agent.name,
            isAgent: true,
            // Correctly map personality_prompt to description
            description: agent.personality_prompt || 'No description available.'
          }));
          
          setAgents(agentInfo); // Update state with AgentInfo array

          // Add agents to userInfo (This part only adds basic info for presence, not the description)
          const newInfo = { ...userInfo };
          agentInfo.forEach(agent => {
            newInfo[agent.id] = {
              id: agent.id,
              name: agent.name,
              isAgent: true,
              lastActive: Date.now() // Agents are always considered active
              // Note: We are NOT adding agent.description to the general userInfo here
            };
          });
          setUserInfo(newInfo);
        }
      } catch (error) {
      }
    };
    
    loadAgents();
  }, []);
  
  // Load profile names once when participants change
  useEffect(() => {
    const loadProfiles = async () => {
      // Filter out participants whose info we already have or are agents
      const idsToFetch = participants
        .map(p => p.user_id)
        .filter(id => !userInfo[id]?.name && !agents.some(agent => agent.id === id));

      if (idsToFetch.length === 0) {
        return; // No new profiles to fetch
      }

      const supabase = createClient();

      try { // Add try-catch block
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', idsToFetch); // Only fetch missing profiles

        if (error) {
          // Set default names for IDs that failed to fetch
          setUserInfo(prevInfo => {
            const newInfo = { ...prevInfo };
            idsToFetch.forEach(id => {
              if (!newInfo[id]) { // Only add if not present
                 newInfo[id] = {
                    id: id,
                    name: `User (${id.substring(0, 4)})`, // Default placeholder
                    isAgent: false,
                    lastActive: undefined
                };
              }
            });
            return newInfo;
          });
          return;
        }

        if (profiles) {
          setUserInfo(prevInfo => {
            const newInfo = { ...prevInfo };
            // Keep track of IDs that were successfully updated
            const updatedIds = new Set<string>();

            profiles.forEach(profile => {
              const profileName = profile.name?.trim(); // Use trimmed name
              // Preserve existing lastActive value if it exists
              const existingInfo = newInfo[profile.id];
              newInfo[profile.id] = {
                id: profile.id,
                // Use fetched name or a default if empty/null
                name: profileName || `User (${profile.id.substring(0, 4)})`,
                isAgent: false,
                lastActive: existingInfo?.lastActive // Keep existing activity
              };
              updatedIds.add(profile.id);
            });

            // Set default names for any IDs that were requested but not returned
            idsToFetch.forEach(id => {
                if (!updatedIds.has(id) && !newInfo[id]) { // Only add if not present and not updated
                     newInfo[id] = {
                        id: id,
                        name: `User (${id.substring(0, 4)})`, // Default placeholder
                        isAgent: false,
                        lastActive: undefined
                    };
                }
            });

            return newInfo;
          });
        }
      } catch (fetchError) {
         // Set default names for IDs that failed to fetch due to exception
         setUserInfo(prevInfo => {
            const newInfo = { ...prevInfo };
            idsToFetch.forEach(id => {
                if (!newInfo[id]) { // Only add if not present
                     newInfo[id] = {
                        id: id,
                        name: `User (${id.substring(0, 4)})`, // Default placeholder
                        isAgent: false,
                        lastActive: undefined
                    };
                }
            });
            return newInfo;
        });
      }
    };

    // Check if participants array is populated before loading
    if (participants && participants.length > 0 && agents.length > 0) { // Ensure agents are loaded too
       loadProfiles();
    }

  // Use a more stable dependency: sorted, stringified list of participant IDs + agents
  }, [JSON.stringify(participants.map(p => p.user_id).sort()), agents, userInfo]); // Re-run if userInfo changes to catch updates
  
  // Setup Pusher to track user activity
  useEffect(() => {
    // Initialize Pusher
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
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

  // Calculate active count for HUMAN participants only
  const activeParticipantsCount = participants.filter(p => isActive(p.user_id)).length;
  const totalActiveHumans = activeParticipantsCount;
  const totalHumanParticipants = participants.length;

  return (
    <div className="w-full  overflow-hidden  flex flex-col">
      <Tooltip 
        id="agent-tooltip" 
        className="max-w-[350px] max-h-[80vh] overflow-y-auto z-50" 
        clickable={true} 
      />
      <div className="text-sm text-muted-foreground">
        {/* Show Active Humans / Total Humans */}
        <p>Participants ({totalActiveHumans} / {totalHumanParticipants})</p>
      </div>
      
      {/* Audio Room Join Button */}
      
      
      <div className="flex-1 p-2 space-y-1 overflow-auto text-gray-800 dark:text-gray-200">
        {/* Human participants */}
        {sortedParticipants.map((participant) => {
          // Default to a basic object if info isn't loaded yet
          const info = userInfo[participant.user_id] || { id: participant.user_id, name: null, isAgent: false };
          // Use a placeholder name if the fetched name is null/empty/still loading
          const displayName = info.name || `User (${participant.user_id.substring(0, 6)}...)`; // Show partial ID if name is missing
          const isOnline = isActive(participant.user_id);
          return (
            <div 
              key={participant.user_id} 
              className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/70"
            >              <div className={`w-2 h-2 rounded-full ${
                info.isAgent 
                  ? agentColorMap[participant.user_id] 
                  : isOnline 
                    ? 'bg-green-500 dark:bg-green-400' 
                    : 'bg-gray-300 dark:bg-gray-600'
              }`} />
              {/* Use displayName */}
              <span className="text-sm truncate text-gray-900 dark:text-gray-100">{displayName}</span>
              {info.isAgent && (
                <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">AI</span>
              )}
              
              {/* Speaking indicator */}
              { isParticipantSpeaking(participant.user_id) && (
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
              data-tooltip-id="agent-tooltip" 
              data-tooltip-content={agent.description} 
              data-tooltip-place="right"
              className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/70 cursor-default"
            >
              <div className={`w-2 h-2 rounded-full ${agentColorMap[agent.id]}`} />
              <span className="text-sm truncate text-gray-900 dark:text-gray-100">{agent.name}</span>
              <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">AI</span>
              { isParticipantSpeaking(agent.id) && (
                <SpeakingIndicator 
                  activityType={getParticipantActivityType(agent.id)} 
                  isAgent={true}
                />
              )}
            </div>
          );
        })}

      </div>

<div className="text-sm text-muted-foreground">
        {/* Show Active Humans / Total Humans */}
        <p>Audio shit ({totalActiveHumans} / {totalHumanParticipants})</p>
      </div>

{ onJoinAudio && !showAudioRoom && (
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
