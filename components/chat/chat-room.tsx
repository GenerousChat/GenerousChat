"use client";

import React, { useState } from "react";
import { User } from "@supabase/supabase-js";
import { DyteProvider } from '@dytesdk/react-web-core';
import AudioRoom from '@/components/audio/audio-room';
import { TTSManager } from "@/components/chat/tts-manager";
import ParticipantList from "@/components/chat/participant-list";
import { Transcription } from './transcription';
import { OptimizedInput } from './optimized-input';
import { MessageList } from './message-list';
import Canvas from "@/components/canvas/chat-canvas";
import { GenerationHistory } from "@/components/canvas/index";
import { useChatMessages, Message, Participant } from './hooks/useChatMessages';
import { useAudioRoom } from './hooks/useAudioRoom';

interface ChatRoomProps {
  roomId: string;
  initialMessages: Message[];
  currentUser: User;
  participants: Participant[];
}

export default function ChatRoom({
  roomId,
  initialMessages,
  currentUser,
  participants: initialParticipants,
}: ChatRoomProps) {
  // Initialize hooks
  const {
    messages,
    participants,
    isLoading,
    newMessageReceived,
    userCache,
    handleSendMessage,
    getUserEmail,
    getMessageTimestamp,
    formatTime,
    isCurrentUser
  } = useChatMessages(roomId, initialMessages, initialParticipants, currentUser);

  const {
    meeting,
    showAudioRoom,
    handleJoinAudioRoom
  } = useAudioRoom(roomId, currentUser.id, currentUser.email || '');
  
  // Canvas generation state
  const [activeGeneration, setActiveGeneration] = useState<any>(null);
  
  // Handle generation selection
  const handleSelectGeneration = (generation: any) => {
    setActiveGeneration(generation);
  };

  return (
    <div className="w-full h-full">
      <GenerationHistory 
        roomId={roomId || ''}
        activeGenerationId={activeGeneration?.id}
        onSelectGeneration={handleSelectGeneration}
      />
    <div className="flex w-full h-full">

      {/* Canvas Panel - Grows to fill remaining space */}
      <div className="flex-grow h-full overflow-hidden min-w-0">
        <div className={`w-full h-full`}>
          
          <Canvas 
            roomId={roomId}
            activeGeneration={activeGeneration}
            onSelectGeneration={handleSelectGeneration}
          />
        </div>
      </div>

      {/* Left Sidebar - Max width 150px */}
      <div className="flex bg-yellow flex-col max-w-[200px] min-w-[200px]">
        <ParticipantList
          participants={participants}
          onJoinAudio={handleJoinAudioRoom}
          showAudioRoom={showAudioRoom}
        />
        {false && <Transcription onTranscript={handleSendMessage} />}
      </div>

      {/* Main Chat Column - Max width 300px */}
      <div className="flex bg-green flex-col h-full border rounded-lg overflow-hidden relative max-w-[400px] min-w-[400px]">
        {showAudioRoom && meeting && (
          <DyteProvider value={meeting}>
            <AudioRoom
              roomId={roomId}
              userId={currentUser.id}
              userName={currentUser.email?.split('@')[0] || 'User'}
            />
          </DyteProvider>
        )}

        {false &&  <TTSManager 
          messages={messages} 
          userCache={userCache} 
          currentUserId={currentUser.id}
          newMessageReceived={newMessageReceived}
        />}
        
        <MessageList
          messages={messages}
          userCache={userCache}
          isCurrentUser={isCurrentUser}
          getUserEmail={getUserEmail}
          getMessageTimestamp={getMessageTimestamp}
          formatTime={formatTime}
        />

       

        <OptimizedInput 
          onSubmit={handleSendMessage}
          isLoading={isLoading} 
        />
      </div>

      </div>
    </div>
  );
}
