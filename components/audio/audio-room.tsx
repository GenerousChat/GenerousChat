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
    const setupRoom = async () => {
      try {
        // Initialize Dyte design system
        provideDyteDesignSystem(document.body, {
          theme: 'light',
        });

        // Auto-join the room
        if (!roomJoined) {
          await meeting.joinRoom();
        }

        // Enable audio automatically after joining
        if (roomJoined && !audioEnabled) {
          await meeting.self.enableAudio();
        }
      } catch (error) {
        console.error('Error setting up audio room:', error);
        setError('Failed to connect to audio room');
      }
    };

    setupRoom();

    // Handle room leave events
    meeting.self.on('roomLeft', () => {
      console.log('Left audio room');
    });

    // Handle media permission errors
    meeting.self.on('mediaPermissionError', ({ message, kind }) => {
      console.error(`Media permission error: ${kind} - ${message}`);
      if (kind === 'audio') {
        setError('Microphone permission denied. Please check your browser settings.');
      }
    });

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
                {Object.values(participants).map((participant: any) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between text-sm py-1"
                  >
                    <span>{participant.name}</span>
                    {participant.audioEnabled ? (
                      <Mic className="h-3 w-3 text-green-500" />
                    ) : (
                      <MicOff className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                ))}
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
