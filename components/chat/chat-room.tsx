"use client";

import React, { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { DyteProvider } from '@dytesdk/react-web-core';
import AudioRoom from '@/components/audio/audio-room';
import { TTSManager } from "@/components/chat/tts-manager";
import ParticipantList from "@/components/chat/participant-list";
import { Transcription } from './transcription';
import { IntegratedChat } from './integrated-chat';
import Canvas from "@/components/canvas/chat-canvas";
import { GenerationHistory } from "@/components/canvas/index";
import { useChatMessages, Message, Participant } from './hooks/useChatMessages';
import { useAudioRoom } from './hooks/useAudioRoom';
// Import Swiper and required modules
import SwiperCore from 'swiper'; // Import SwiperCore for instance type
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import { ChevronLeft, ChevronRight, Users, MessageSquare, Layers } from 'lucide-react';

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
  // State to track if we're on mobile
  const [isMobile, setIsMobile] = useState(false);
  // State to track active slide
  const [activeSlide, setActiveSlide] = useState(1); // Default to chat view (middle slide)
  // State to hold Swiper instance
  const [swiperInstance, setSwiperInstance] = useState<SwiperCore | null>(null);
  
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
    handleJoinAudioRoom,
    handleLeaveAudioRoom,
    
  } = useAudioRoom(roomId, currentUser.id, currentUser.email || '');
  
  // Canvas generation state
  const [activeGeneration, setActiveGeneration] = useState<any>(null);
  
  // Handle generation selection
  const handleSelectGeneration = (generation: any) => {
    setActiveGeneration(generation);
  };

  // Check if we're on mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768); // 768px is a common breakpoint for mobile
    };
    
    // Initial check
    checkIfMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  return (
    <div className="w-full h-full flex flex-col">
      <GenerationHistory 
        roomId={roomId || ''}
        activeGenerationId={activeGeneration?.id}
        onSelectGeneration={handleSelectGeneration}
      />
      
      {/* Mobile view with swiper */}
      {isMobile ? (
        <div className="relative w-full h-full">
          <Swiper
            effect={'coverflow'}
            grabCursor={true}
            centeredSlides={true}
            slidesPerView={1}
            initialSlide={1}
            coverflowEffect={{
              rotate: 50,
              stretch: 0,
              depth: 100,
              modifier: 1,
              slideShadows: true,
            }}
            modules={[EffectCoverflow]}
            className="w-full h-full"
            onSlideChange={(swiper) => setActiveSlide(swiper.activeIndex)}
            onSwiper={setSwiperInstance}
          >
            {/* Participants Slide */}
            <SwiperSlide>
              <div className="w-full h-full flex flex-col">
                <div className="p-2 bg-primary text-primary-foreground flex items-center justify-between">
                  <Users className="h-5 w-5" />
                  <h2 className="text-center font-medium">Participants</h2>
                  <ChevronRight 
                    className="h-5 w-5 animate-pulse cursor-pointer"
                    onClick={() => swiperInstance?.slideNext()}
                  />
                </div>
                <div className="flex-1 overflow-y-auto pb-20">
                  <ParticipantList
                    participants={participants}
                    onJoinAudio={handleJoinAudioRoom}
                    showAudioRoom={showAudioRoom}
                  />
                </div>
              </div>
            </SwiperSlide>
            
            {/* Chat Slide (default) */}
            <SwiperSlide>
              <div className="w-full h-full flex flex-col">
                <div className="p-2 bg-primary text-primary-foreground flex items-center justify-between">
                  <ChevronLeft 
                    className="h-5 w-5 animate-pulse cursor-pointer"
                    onClick={() => swiperInstance?.slidePrev()}
                  />
                  <h2 className="text-center font-medium">Chat</h2>
                  <ChevronRight 
                    className="h-5 w-5 animate-pulse cursor-pointer"
                    onClick={() => swiperInstance?.slideNext()}
                  />
                </div>
                <div className="flex-1 flex flex-col h-full overflow-hidden pb-2">
                  {showAudioRoom && meeting && (
                    <DyteProvider value={meeting}>
                      <AudioRoom
                        roomId={roomId}
                        userId={currentUser.id}
                        userName={currentUser.email?.split('@')[0] || 'User'}
                      />
                    </DyteProvider>
                  )}
                  
                  <IntegratedChat
                    messages={messages}
                    userCache={userCache}
                    isCurrentUser={isCurrentUser}
                    getUserEmail={getUserEmail}
                    formatTime={formatTime}
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                  />
                </div>
              </div>
            </SwiperSlide>
            
            {/* Canvas Slide */}
            <SwiperSlide>
              <div className="w-full h-full flex flex-col">
                <div className="p-2 bg-primary text-primary-foreground flex items-center justify-between">
                  <ChevronLeft 
                    className="h-5 w-5 animate-pulse cursor-pointer"
                    onClick={() => swiperInstance?.slidePrev()}
                  />
                  <h2 className="text-center font-medium">Canvas</h2>
                  <Layers className="h-5 w-5" />
                </div>
                <div className="flex-1 pb-20">
                  <Canvas 
                    roomId={roomId}
                    activeGeneration={activeGeneration}
                    onSelectGeneration={handleSelectGeneration}
                  />
                </div>
              </div>
            </SwiperSlide>
          </Swiper>
          
          {/* Navigation Indicators */}
          <div className="absolute bottom-0.5 left-0 right-0 flex justify-center gap-2 z-10">
            <div className={`h-2 w-2 rounded-full ${activeSlide === 0 ? 'bg-primary' : 'bg-gray-300'}`}></div>
            <div className={`h-2 w-2 rounded-full ${activeSlide === 1 ? 'bg-primary' : 'bg-gray-300'}`}></div>
            <div className={`h-2 w-2 rounded-full ${activeSlide === 2 ? 'bg-primary' : 'bg-gray-300'}`}></div>
          </div>
        </div>
      ) : (
        /* Desktop view with flex layout */
        <div className="flex w-full h-full gap-5 px-5">

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
          onLeaveAudio={handleLeaveAudioRoom}
          showAudioRoom={showAudioRoom}
        />
         {showAudioRoom && meeting && (
          <DyteProvider value={meeting}>
            <AudioRoom
              roomId={roomId}
              userId={currentUser.id}
              userName={currentUser.email?.split('@')[0] || 'User'}
            />
          </DyteProvider>
        )}
       asdasd
       { <TTSManager 
          messages={messages} 
          userCache={userCache} 
          currentUserId={currentUser.id}
          newMessageReceived={newMessageReceived}
        />}
        wttrtyerfg
        {<Transcription onTranscript={handleSendMessage} />}
      </div>

      {/* Main Chat Column - Max width 300px */}
      <div className="flex bg-green flex-col h-full overflow-hidden relative max-w-[400px] min-w-[400px]">

        
        <IntegratedChat
          messages={messages}
          userCache={userCache}
          isCurrentUser={isCurrentUser}
          getUserEmail={getUserEmail}
          formatTime={formatTime}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>
      </div>
      )}
    </div>
  );
}
