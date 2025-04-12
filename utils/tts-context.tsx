"use client";

import React, { createContext, useContext, useRef, useState, useEffect } from 'react';
import { AbstractTTSService } from './text-to-speech/abstract-tts';

// TTS System states
export type TTSSystemState = 'idle' | 'playing' | 'paused' | 'error' | 'recovering';

// Error types for better diagnostics
export type TTSErrorType = 'network' | 'browser' | 'audio' | 'resource' | 'unknown';

interface TTSContextType {
  // Reference to the current TTS service
  ttsServiceRef: React.MutableRefObject<AbstractTTSService | null>;
  // Function to stop all TTS and clear the queue
  stopTTS: () => void;
  // Current state of the TTS system
  systemState: TTSSystemState;
  // Last error encountered
  lastError: { type: TTSErrorType; message: string } | null;
  // Reset the TTS service (recovery mechanism)
  resetTTSService: () => void;
  // Check if the TTS service is healthy
  checkTTSHealth: () => boolean;
}

// Create the context with default values
const TTSContext = createContext<TTSContextType>({
  ttsServiceRef: { current: null },
  stopTTS: () => {},
  systemState: 'idle',
  lastError: null,
  resetTTSService: () => {},
  checkTTSHealth: () => false,
});

export const useTTS = () => useContext(TTSContext);

interface TTSProviderProps {
  children: React.ReactNode;
}

export function TTSProvider({ children }: TTSProviderProps) {
  // Create a ref to store the TTS service instance
  const ttsServiceRef = useRef<AbstractTTSService | null>(null);
  const [systemState, setSystemState] = useState<TTSSystemState>('idle');
  const [lastError, setLastError] = useState<{ type: TTSErrorType; message: string } | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recoveryAttempts = useRef<number>(0);
  
  // Function to stop TTS and clear the queue
  const stopTTS = () => {
    if (ttsServiceRef.current) {
      console.log('Stopping TTS due to human speech detection');
      try {
        ttsServiceRef.current.stop();
        setSystemState('idle');
      } catch (error) {
        console.error('Error stopping TTS:', error);
        setLastError({ type: 'unknown', message: 'Error stopping TTS: ' + (error as Error).message });
        setSystemState('error');
      }
    }
  };
  
  // Reset the TTS service (recovery mechanism)
  const resetTTSService = () => {
    console.log('Resetting TTS service...');
    setSystemState('recovering');
    
    // Stop current service if it exists
    if (ttsServiceRef.current) {
      try {
        ttsServiceRef.current.stop();
      } catch (error) {
        console.error('Error stopping TTS during reset:', error);
      }
    }
    
    // The actual service recreation will happen in the TTS manager
    // This just signals that a reset is needed
    recoveryAttempts.current++;
    
    // After a short delay, set state back to idle to allow recreation
    setTimeout(() => {
      setSystemState('idle');
    }, 1000);
  };
  
  // Check if the TTS service is healthy
  const checkTTSHealth = (): boolean => {
    if (!ttsServiceRef.current) return false;
    
    try {
      // Basic health check - can we access the service?
      const isHealthy = ttsServiceRef.current.isHealthy?.() ?? true;
      
      if (!isHealthy && systemState !== 'error' && systemState !== 'recovering') {
        console.warn('TTS service health check failed, initiating recovery...');
        setLastError({ type: 'unknown', message: 'TTS service health check failed' });
        setSystemState('error');
        resetTTSService();
        return false;
      }
      
      return isHealthy;
    } catch (error) {
      console.error('Error checking TTS health:', error);
      setLastError({ type: 'unknown', message: 'Error checking TTS health: ' + (error as Error).message });
      setSystemState('error');
      return false;
    }
  };
  
  // Set up periodic health checks
  useEffect(() => {
    // Check health every 30 seconds
    healthCheckIntervalRef.current = setInterval(() => {
      if (systemState !== 'recovering') {
        checkTTSHealth();
      }
    }, 30000);
    
    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, [systemState]);

  return (
    <TTSContext.Provider value={{ 
      ttsServiceRef, 
      stopTTS, 
      systemState, 
      lastError, 
      resetTTSService, 
      checkTTSHealth 
    }}>
      {children}
    </TTSContext.Provider>
  );
}
