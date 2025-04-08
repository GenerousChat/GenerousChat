"use client";

import { useEffect, useRef, useState } from "react";
import { AbstractTTSService, TTSMessage } from "@/utils/text-to-speech/abstract-tts";
import { GoogleTTSService } from "@/utils/text-to-speech/google-tts";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";

type Message = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  name?: string;
};

interface TTSManagerProps {
  messages: Message[];
  userCache: Record<string, { name: string; isAgent: boolean }>;
  currentUserId: string;
}

export function TTSManager({ messages, userCache, currentUserId }: TTSManagerProps) {
  const [enabled, setEnabled] = useState(false);
  const [ttsService, setTtsService] = useState<AbstractTTSService | null>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());
  
  // Initialize TTS service
  useEffect(() => {
    // Check if TTS is enabled in localStorage
    const savedEnabled = localStorage.getItem('tts-enabled');
    if (savedEnabled) {
      setEnabled(savedEnabled === 'true');
    }
    
    // Create the TTS service
    const service = new GoogleTTSService({
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0
    });
    
    setTtsService(service);
    
    // Cleanup on unmount
    return () => {
      if (service) {
        service.stop();
      }
    };
  }, []);
  
  // Process new messages
  useEffect(() => {
    if (!ttsService || !enabled) return;
    
    // Find messages that haven't been processed yet
    const newMessages = messages.filter(msg => 
      !processedMessageIds.current.has(msg.id) && 
      msg.user_id !== currentUserId // Don't read your own messages
    );
    
    if (newMessages.length > 0) {
      // Queue new messages for TTS
      newMessages.forEach(message => {
        const userName = message.name || 
                         userCache[message.user_id]?.name || 
                         'Unknown User';
        
        const ttsMessage: TTSMessage = {
          id: message.id,
          content: message.content,
          userId: message.user_id,
          userName: userName,
          timestamp: message.created_at
        };
        
        ttsService.queueMessage(ttsMessage);
        processedMessageIds.current.add(message.id);
      });
    }
  }, [messages, ttsService, enabled, userCache, currentUserId]);
  
  // Toggle TTS
  const toggleTTS = () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    localStorage.setItem('tts-enabled', newEnabled.toString());
    
    if (!newEnabled && ttsService) {
      ttsService.stop();
    }
  };
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTTS}
      title={enabled ? "Disable text-to-speech" : "Enable text-to-speech"}
      className="absolute top-4 right-4 z-10"
    >
      {enabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
    </Button>
  );
}
