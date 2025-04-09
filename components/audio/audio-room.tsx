"use client";

import { useEffect } from 'react';
import { useDyteMeeting, useDyteSelector } from '@dytesdk/react-web-core';
import { provideDyteDesignSystem } from '@dytesdk/react-ui-kit';
import { createClient } from '@/utils/supabase/client';

interface AudioRoomProps {
  roomId: string;
  userId: string;
  userName: string;
}

export default function AudioRoom({ roomId, userId, userName }: AudioRoomProps) {
  const { meeting } = useDyteMeeting();
  const roomJoined = useDyteSelector((meeting) => meeting.self.roomJoined);
  const audioEnabled = useDyteSelector((meeting) => meeting.self.audioEnabled);

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
      }
    };

    setupRoom();

    // Handle room leave events
    meeting.self.on('roomLeft', () => {
      console.log('Left audio room');
    });

    return () => {
      // Cleanup
      if (roomJoined) {
        meeting.leaveRoom();
      }
    };
  }, [meeting, roomJoined, audioEnabled]);

  // No need for a loading state since we auto-join
  return (
    <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      Audio Connected
    </div>
  );
}
