import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '../ui/button';
import { useTTS } from '@/utils/tts-context';

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
        }
        
        if (event.results[i].isFinal) {
          console.log('Transcription:', transcript);
          if (onTranscript && transcript.trim()) {
            onTranscript(transcript);
          }
          // Reset speech detected flag after final result
          setSpeechDetected(false);
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
    };

    setRecognition(newRecognition);
    newRecognition.start();
    setIsTranscribing(true);
  }, [onTranscript]);

  const stopTranscription = useCallback(() => {
    if (recognition) {
      recognition.stop();
      setIsTranscribing(false);
      setSpeechDetected(false);
    }
  }, [recognition]);

  return (
    <div className={`p-3 border-b ${className}`}>
      <Button
        onClick={isTranscribing ? stopTranscription : startTranscription}
        className="w-full flex items-center justify-center gap-2 text-xs"
        size="sm"
      >
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
        {isTranscribing ? 'Stop Transcribing' : 'Start Transcribing'}
      </Button>
    </div>
  );
}
