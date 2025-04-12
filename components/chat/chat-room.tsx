"use client";

import React from "react";
import { User } from "@supabase/supabase-js";
import { DyteProvider } from '@dytesdk/react-web-core';
import AudioRoom from '@/components/audio/audio-room';
import { TTSManager } from "@/components/chat/tts-manager";
import ParticipantList from "@/components/chat/participant-list";
import { Transcription } from './transcription';
import { OptimizedInput } from './optimized-input';
import { MessageList } from './message-list';
import { VisualizationPanel } from './visualization-panel';
import { CanvasPanel } from './canvas-panel';
import { useChatMessages, Message, Participant } from './hooks/useChatMessages';
import { useAudioRoom } from './hooks/useAudioRoom';
import { useVisualizations } from './hooks/useVisualizations';

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

  const {
    latestHtmlContent,
    defaultHtmlContent,
    generations,
    selectedGenerationId,
    setSelectedGenerationId,
    setLatestHtmlContent
  } = useVisualizations(roomId);

  return (
    <div className="flex h-full gap-4">
      {/* Left Sidebar */}
      {<div className="w-1/4 flex flex-col">
        <ParticipantList
          participants={participants}
          onJoinAudio={handleJoinAudioRoom}
          showAudioRoom={showAudioRoom}
        />
        <Transcription onTranscript={handleSendMessage} />
      </div>}

      {/* Main Chat Column */}
      <div className="flex flex-col h-full border rounded-lg overflow-hidden relative flex-1">
        {showAudioRoom && meeting && (
          <DyteProvider value={meeting}>
            <AudioRoom
              roomId={roomId}
              userId={currentUser.id}
              userName={currentUser.email?.split('@')[0] || 'User'}
            />
          </DyteProvider>
        )}

        <TTSManager 
          messages={messages} 
          userCache={userCache} 
          currentUserId={currentUser.id}
          newMessageReceived={newMessageReceived}
        />
        
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

      {/* Visualization Panel */}
      <VisualizationPanel
        latestHtmlContent={latestHtmlContent}
        defaultHtmlContent={defaultHtmlContent}
        generations={generations}
        selectedGenerationId={selectedGenerationId}
        setSelectedGenerationId={setSelectedGenerationId}
        setLatestHtmlContent={setLatestHtmlContent}
      />
      <CanvasPanel
        latestHtmlContent={latestHtmlContent}
        defaultHtmlContent={defaultHtmlContent}
        generations={generations}
        selectedGenerationId={selectedGenerationId}
        setSelectedGenerationId={setSelectedGenerationId}
        setLatestHtmlContent={setLatestHtmlContent}
        user={currentUser}
        messages={messages}
      />
    </div>
  );
}
