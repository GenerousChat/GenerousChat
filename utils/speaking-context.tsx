"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTTS } from './tts-context';

// Define the types of speaking activities
export type SpeakingActivityType = 'transcribing' | 'tts' | 'none';

// Interface for the speaking state of a participant
export interface ParticipantSpeakingState {
  userId: string;
  activityType: SpeakingActivityType;
  isActive: boolean;
}

// Interface for the speaking context
interface SpeakingContextType {
  // Map of user IDs to their speaking state
  speakingStates: Record<string, ParticipantSpeakingState>;
  // Set a participant as speaking
  setParticipantSpeaking: (userId: string, activityType: SpeakingActivityType, isActive: boolean) => void;
  // Check if a participant is speaking
  isParticipantSpeaking: (userId: string) => boolean;
  // Get the speaking activity type for a participant
  getParticipantActivityType: (userId: string) => SpeakingActivityType;
}

// Create the context with default values
const SpeakingContext = createContext<SpeakingContextType>({
  speakingStates: {},
  setParticipantSpeaking: () => {},
  isParticipantSpeaking: () => false,
  getParticipantActivityType: () => 'none',
});

export const useSpeaking = () => useContext(SpeakingContext);

interface SpeakingProviderProps {
  children: React.ReactNode;
}

export function SpeakingProvider({ children }: SpeakingProviderProps) {
  const [speakingStates, setSpeakingStates] = useState<Record<string, ParticipantSpeakingState>>({});
  const { ttsServiceRef } = useTTS();

  // Set a participant as speaking
  const setParticipantSpeaking = (userId: string, activityType: SpeakingActivityType, isActive: boolean) => {
    setSpeakingStates(prev => ({
      ...prev,
      [userId]: {
        userId,
        activityType,
        isActive,
      },
    }));
  };

  // Check if a participant is speaking
  const isParticipantSpeaking = (userId: string): boolean => {
    return speakingStates[userId]?.isActive || false;
  };

  // Get the speaking activity type for a participant
  const getParticipantActivityType = (userId: string): SpeakingActivityType => {
    return speakingStates[userId]?.activityType || 'none';
  };

  // Monitor TTS service for speaking state changes
  useEffect(() => {
    // This would ideally hook into TTS service events
    // For now, we'll rely on components to update the speaking state
    const checkTTSState = () => {
      if (ttsServiceRef.current) {
        // In a real implementation, we would subscribe to TTS events
        // and update the speaking state accordingly
      }
    };

    const intervalId = setInterval(checkTTSState, 500);
    return () => clearInterval(intervalId);
  }, [ttsServiceRef]);

  return (
    <SpeakingContext.Provider 
      value={{ 
        speakingStates, 
        setParticipantSpeaking, 
        isParticipantSpeaking,
        getParticipantActivityType,
      }}
    >
      {children}
    </SpeakingContext.Provider>
  );
}
