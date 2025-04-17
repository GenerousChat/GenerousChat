import { useState, useCallback } from 'react';
import { useDyteClient } from '@dytesdk/react-web-core';
import { createOrJoinMeeting } from '@/utils/dyte/create-meeting';

export function useAudioRoom(roomId: string, userId: string, userEmail: string) {
  const [meeting, initMeeting] = useDyteClient();
  const [showAudioRoom, setShowAudioRoom] = useState(false);

  // Initialize Dyte meeting when user clicks the join button
  const initDyte = useCallback(async () => {
    try {
      console.log('Initializing Dyte meeting for room:', roomId);
      
      const authToken = await createOrJoinMeeting(
        roomId,
        userId,
        userEmail || 'Anonymous'
      );
      
      console.log('Got Dyte auth token, initializing client...');
      
      await initMeeting({
        authToken,
        defaults: {
          audio: true,
          video: false,
        },
      });
      
      console.log('Dyte client initialized successfully');
      
      // Add event listeners to track meeting state
      if (meeting && meeting.self) {
        meeting.self.on('roomJoined', () => {
          console.log('ChatRoom: Room joined successfully');
          console.log('Meeting state:', {
            roomJoined: meeting.self.roomJoined,
            audioEnabled: meeting.self.audioEnabled,
            meetingStarted: meeting.self.roomJoined,
            participantCount: Object.keys(meeting.participants.active).length
          });
        });
      } else {
        console.warn('ChatRoom: meeting.self is not available yet');
      }
      
      // Track participant changes
      if (meeting && meeting.participants) {
        meeting.participants.joined.on('participantJoined', (participant) => {
          console.log('ChatRoom: Participant joined:', {
            name: participant.name,
            id: participant.id,
            audioEnabled: participant.audioEnabled
          });
        });
      } else {
        console.warn('ChatRoom: meeting.participants is not available yet');
      }
    } catch (error) {
      console.error('Failed to initialize Dyte:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
    }
  }, [initMeeting, meeting, roomId, userId, userEmail]);

  // Handle joining the audio room
  const handleJoinAudioRoom = useCallback(async () => {
    setShowAudioRoom(true);
    await initDyte();
    
  }, [initDyte]);

  // Handle leaving the audio room
  const handleLeaveAudioRoom = useCallback(async () => {
    setShowAudioRoom(false);
    if (meeting && meeting.self) {
      meeting.self.leave();
    }
  }, [meeting]);

  return {
    meeting,
    showAudioRoom,
    handleJoinAudioRoom,
    handleLeaveAudioRoom
  };
}
