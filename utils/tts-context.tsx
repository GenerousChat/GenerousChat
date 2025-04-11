"use client";

import React, { createContext, useContext, useRef } from 'react';
import { AbstractTTSService } from './text-to-speech/abstract-tts';

interface TTSContextType {
  // Reference to the current TTS service
  ttsServiceRef: React.MutableRefObject<AbstractTTSService | null>;
  // Function to stop all TTS and clear the queue
  stopTTS: () => void;
}

// Create the context with default values
const TTSContext = createContext<TTSContextType>({
  ttsServiceRef: { current: null },
  stopTTS: () => {},
});

export const useTTS = () => useContext(TTSContext);

interface TTSProviderProps {
  children: React.ReactNode;
}

export function TTSProvider({ children }: TTSProviderProps) {
  // Create a ref to store the TTS service instance
  const ttsServiceRef = useRef<AbstractTTSService | null>(null);

  // Function to stop TTS and clear the queue
  const stopTTS = () => {
    if (ttsServiceRef.current) {
      console.log('Stopping TTS due to human speech detection');
      ttsServiceRef.current.stop();
    }
  };

  return (
    <TTSContext.Provider value={{ ttsServiceRef, stopTTS }}>
      {children}
    </TTSContext.Provider>
  );
}
