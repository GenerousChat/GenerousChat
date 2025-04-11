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
      <div className="w-1/4 flex flex-col">
        <ParticipantList
          participants={participants}
          onJoinAudio={handleJoinAudioRoom}
          showAudioRoom={showAudioRoom}
        />
        <Transcription onTranscript={handleSendMessage} />
      </div>

      {/* Main Chat Column */}
      <div className="flex flex-col h-full border rounded-lg overflow-hidden relative flex-1">
        {showAudioRoom && meeting && (
          <DyteProvider value={meeting}>
            <AudioRoom
              roomId={roomId}
              userId={currentUser.id}
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

        {generations.length > 0 && (
          <div className="border-t border-gray-200 p-2 bg-gray-50">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {generations.map((gen) => (
                <button
                  key={gen.id}
                  onClick={() => {
                    setSelectedGenerationId(gen.id);
                    setLatestHtmlContent(gen.html);
                  }}
                  className={`px-3 py-1 text-sm rounded-full whitespace-nowrap ${
                    selectedGenerationId === gen.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {new Date(gen.created_at).toLocaleTimeString()}
                </button>
              ))}
            </div>
          </div>
        )}

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
    </div>
  );
}
