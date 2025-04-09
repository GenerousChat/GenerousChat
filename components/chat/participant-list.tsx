"use client";

import { memo, useEffect, useState } from 'react';
import { createClient } from "@/utils/supabase/client";

interface Participant {
  user_id: string;
  users: {
    email: string;
  };
}

interface ParticipantInfo {
  name: string;
  isAgent?: boolean;
}

const ParticipantList = memo(({ participants }: { participants: Participant[] }) => {
  const [userInfo, setUserInfo] = useState<Record<string, ParticipantInfo>>({});
  
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
              name: profile.name,
              isAgent: userInfo[profile.id]?.isAgent
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
      <div className="flex-1 p-2 space-y-1 overflow-auto">
        {participants.map((participant) => {
          const info = userInfo[participant.user_id] || { name: 'Loading...' };
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
            </div>
          );
        })}
      </div>
    </div>
  );
});

ParticipantList.displayName = 'ParticipantList';

export default ParticipantList;
