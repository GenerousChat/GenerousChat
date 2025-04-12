"use client";

import { memo, useEffect, useState } from 'react';
import { createClient } from "@/utils/supabase/client";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { useSpeaking, SpeakingActivityType } from "@/utils/speaking-context";
import { Mic, Volume2 } from "lucide-react";

interface Participant {
  user_id: string;
  users: {
    email: string;
  };
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
}

const ParticipantList = memo(({ participants, onJoinAudio, showAudioRoom = false }: ParticipantListProps) => {
  const [userInfo, setUserInfo] = useState<Record<string, ParticipantInfo>>({});
  const [agents, setAgents] = useState<ParticipantInfo[]>([]);
  const { isParticipantSpeaking, getParticipantActivityType } = useSpeaking();
  
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
            isAgent: true
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
            newInfo[profile.id] = {
              id: profile.id,
              name: profile.name,
              isAgent: false
            };
          }
        });
        setUserInfo(newInfo);
      }
    };
    
    loadProfiles();
  }, [participants.map(p => p.user_id).join(',')]); // Only reload if participant IDs change
  
  return (
    <div className="w-64 border rounded-lg overflow-hidden bg-gray-50 flex flex-col">
      <div className="p-4 border-b">
        <h3 className="text-sm font-medium">Room Participants</h3>
      </div>
      
      {/* Audio Room Join Button */}
      {onJoinAudio && !showAudioRoom && (
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
        <div className="p-3 border-b bg-green-50">
          <div className="flex items-center justify-center gap-2 text-xs text-green-700">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Audio Connected
            </span>
          </div>
        </div>
      )}
      
      <div className="flex-1 p-2 space-y-1 overflow-auto">
        {/* Human participants */}
        {participants.map((participant) => {
          const info = userInfo[participant.user_id] || { id: participant.user_id, name: 'Loading...', isAgent: false };
          const isOnline = true; // TODO: Add online status tracking
          return (
            <div 
              key={participant.user_id} 
              className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100"
            >
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm truncate">{info.name}</span>
              {info.isAgent && (
                <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">AI</span>
              )}
              
              {/* Speaking indicator */}
              {isParticipantSpeaking(participant.user_id) && (
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
              className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100"
            >
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-blue-500' : 'bg-gray-300'}`} />
              <span className="text-sm truncate">{agent.name}</span>
              <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">AI</span>
              
              {/* Speaking indicator */}
              {isParticipantSpeaking(agent.id) && (
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
        return 'text-green-500';
      case 'tts':
        return 'text-blue-500';
      default:
        return 'text-gray-400';
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
