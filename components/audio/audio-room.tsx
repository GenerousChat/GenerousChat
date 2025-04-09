"use client";

import { useEffect, useState } from 'react';
import { useDyteMeeting, useDyteSelector } from '@dytesdk/react-web-core';
import { provideDyteDesignSystem } from '@dytesdk/react-ui-kit';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Users } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface AudioRoomProps {
  roomId: string;
  userId: string;
  userName: string;
}

export default function AudioRoom({ roomId, userId, userName }: AudioRoomProps) {
  const { meeting } = useDyteMeeting();
  const roomJoined = useDyteSelector((meeting) => meeting.self.roomJoined);
  const audioEnabled = useDyteSelector((meeting) => meeting.self.audioEnabled);
  const participants = useDyteSelector((meeting) => meeting.participants.active);
  const [error, setError] = useState<string>('');
  const [showParticipants, setShowParticipants] = useState(false);

  useEffect(() => {
    // Initialize Dyte design system
    provideDyteDesignSystem(document.body, {
      theme: 'light',
    });

    console.log('AudioRoom component state:', {
      roomJoined,
      audioEnabled,
      participantsCount: Object.keys(participants).length,
      meetingState: meeting.meta.meetingStarted ? 'started' : 'not started',
      selfId: meeting.self.id,
      selfName: meeting.self.name,
      activeParticipants: Object.values(participants).map(p => ({ name: p.name, id: p.id }))
    });

    // Try to join room if not already joined
    const joinRoom = async () => {
      try {
        if (!roomJoined) {
          console.log('AudioRoom: Attempting to manually join room...');
          await meeting.joinRoom();
          console.log('AudioRoom: Manual room join successful');
        } else {
          console.log('AudioRoom: Room already joined, no need to join again');
        }
      } catch (error) {
        console.error('AudioRoom: Error joining room:', error);
        setError('Failed to connect to audio room');
      }
    };

    // Enable audio when room is joined
    const enableAudio = async () => {
      try {
        if (roomJoined && !audioEnabled) {
          console.log('AudioRoom: Enabling audio in room...');
          await meeting.self.enableAudio();
          console.log('AudioRoom: Audio enabled successfully');
        } else if (!roomJoined) {
          console.log('AudioRoom: Cannot enable audio, room not joined yet');
        } else if (audioEnabled) {
          console.log('AudioRoom: Audio already enabled');
        }
      } catch (error) {
        console.error('AudioRoom: Error enabling audio:', error);
        setError('Failed to enable microphone');
      }
    };

    // First try to join room if needed
    joinRoom().then(() => {
      // Then enable audio if room joined
      if (roomJoined) {
        enableAudio();
      }
    });

    // Set up event listeners for debugging
    const setupEventListeners = () => {
      // Room events
      meeting.self.on('roomJoined', () => {
        console.log('Room joined event fired');
      });
      
      meeting.self.on('roomLeft', () => {
        console.log('Left audio room');
      });

      // Media events
      meeting.self.on('mediaPermissionError', ({ message, kind }) => {
        console.error(`Media permission error: ${kind} - ${message}`);
        if (kind === 'audio') {
          setError('Microphone permission denied. Please check your browser settings.');
        }
      });

      meeting.self.on('audioUpdate', (audioEnabled) => {
        console.log('Audio state updated:', audioEnabled ? 'enabled' : 'disabled');
      });

      // Participant events
      meeting.participants.on('participantJoined', (participant) => {
        console.log('Participant joined:', participant.name);
      });

      meeting.participants.on('participantLeft', (participant) => {
        console.log('Participant left:', participant.name);
      });

      meeting.participants.on('activeSpeakerChanged', (participant) => {
        console.log('Active speaker changed:', participant?.name || 'None');
      });
    };

    setupEventListeners();

    return () => {
      // Cleanup
      if (roomJoined) {
        meeting.leaveRoom();
      }
    };
  }, [meeting, roomJoined, audioEnabled]);

  const toggleAudio = async () => {
    try {
      if (audioEnabled) {
        await meeting.self.disableAudio();
      } else {
        await meeting.self.enableAudio();
      }
      setError('');
    } catch (error) {
      console.error('Error toggling audio:', error);
      setError('Failed to toggle microphone');
    }
  };

  if (error) {
    return (
      <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
        {error}
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 flex items-center gap-2">
      <Popover open={showParticipants} onOpenChange={setShowParticipants}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Users className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="end">
          <div className="space-y-2">
            <div className="font-medium text-sm">Audio Participants</div>
            {Object.keys(participants).length === 0 ? (
              <div className="text-sm text-muted-foreground">No participants</div>
            ) : (
              <div className="space-y-1">
                {Object.values(participants).map((participant: any) => {
                  // Ensure we have a valid key by using userId or a fallback
                  const participantKey = participant.id || participant.userId || `participant-${Math.random()}`;
                  return (
                    <div
                      key={participantKey}
                      className="flex items-center justify-between text-sm py-1"
                    >
                      <span>{participant.name}</span>
                      {participant.audioEnabled ? (
                        <Mic className="h-3 w-3 text-green-500" />
                      ) : (
                        <MicOff className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon"
        className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={toggleAudio}
      >
        {audioEnabled ? (
          <Mic className="h-4 w-4" />
        ) : (
          <MicOff className="h-4 w-4" />
        )}
      </Button>

      <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        Audio Connected
      </div>
    </div>
  );
}
