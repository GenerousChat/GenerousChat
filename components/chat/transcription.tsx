import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '../ui/button';
import { ToggleActionButton } from '../ui/toggle-action-button';
import { useTTS } from '@/utils/tts-context';
import { useSpeaking } from '@/utils/speaking-context';

// Add type definitions for the Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

// Add the global window interface extension
declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface TranscriptionProps {
  className?: string;
  onTranscript?: (text: string) => void;
}

export function Transcription({ className, onTranscript }: TranscriptionProps) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const { stopTTS } = useTTS();
  const [speechDetected, setSpeechDetected] = useState(false);
  const { setParticipantSpeaking } = useSpeaking();
  
  // Get current user ID from localStorage or session
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Get the current user ID when component mounts
  useEffect(() => {
    // Try to get the user ID from localStorage
    const getUserId = async () => {
      try {
        // This is a simplified approach - in a real app, you would use a more robust method
        // to get the current user ID, such as from auth context or session
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (data.session?.user?.id) {
          setCurrentUserId(data.session.user.id);
        }
      } catch (error) {
        console.error('Error getting user ID:', error);
      }
    };
    
    getUserId();
  }, []);
  
  const startTranscription = useCallback(() => {
    if (!('webkitSpeechRecognition' in window)) {
      console.error('Speech recognition is not supported in this browser');
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition;
    const newRecognition = new SpeechRecognition();
    
    newRecognition.continuous = true;
    newRecognition.interimResults = true;

    newRecognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        // If any speech is detected (even non-final), stop TTS immediately
        if (!speechDetected && transcript.trim()) {
          console.log('Speech detected, stopping TTS');
          stopTTS();
          setSpeechDetected(true);
          
          // Update speaking state in context if we have a user ID
          if (currentUserId) {
            setParticipantSpeaking(currentUserId, 'transcribing', true);
          }
        }
        
        if (event.results[i].isFinal) {
          console.log('Transcription:', transcript);
          if (onTranscript && transcript.trim()) {
            onTranscript(transcript);
          }
          // Reset speech detected flag after final result
          setSpeechDetected(false);
          
          // Update speaking state in context if we have a user ID
          if (currentUserId) {
            setParticipantSpeaking(currentUserId, 'transcribing', false);
          }
        }
      }
    };

    newRecognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsTranscribing(false);
    };

    newRecognition.onend = () => {
      setIsTranscribing(false);
      setSpeechDetected(false);
      
      // Update speaking state in context if we have a user ID
      if (currentUserId) {
        setParticipantSpeaking(currentUserId, 'transcribing', false);
      }
    };

    setRecognition(newRecognition);
    newRecognition.start();
    setIsTranscribing(true);
  }, [onTranscript, currentUserId, setParticipantSpeaking, stopTTS]);

  const stopTranscription = useCallback(() => {
    if (recognition) {
      recognition.stop();
      setIsTranscribing(false);
      setSpeechDetected(false);
    }
  }, [recognition]);


  return (
    <div className={`p-3 ${className}`}>
      <ToggleActionButton
        onClick={isTranscribing ? stopTranscription : startTranscription}
        isActive={isTranscribing}
        activeColor="green"
        activeIcon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        }
        activeText="Transcribing..."
        inactiveIcon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        }
        inactiveText="Transcribe Voice"
      />
    </div>
  );
}
