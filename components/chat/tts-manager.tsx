"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AbstractTTSService, TTSMessage } from "@/utils/text-to-speech/abstract-tts";
import { OpenAITTSService, OpenAITTSOptions } from "@/utils/text-to-speech/openai-tts";
import { Message } from "./hooks/useChatMessages";
import { useTTS } from "@/utils/tts-context";
import { useSpeaking } from "@/utils/speaking-context";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// Using Message type imported from useChatMessages

interface TTSManagerProps {
  messages: Message[];
  userCache: Record<string, { name: string; isAgent: boolean }>;
  currentUserId: string;
  newMessageReceived?: Message | null;
}

export function TTSManager({ messages, userCache, currentUserId, newMessageReceived }: TTSManagerProps ) {
  const { ttsServiceRef, systemState, lastError, resetTTSService } = useTTS();
  const { setParticipantSpeaking, isParticipantSpeaking } = useSpeaking();
  const [enabled, setEnabled] = useState(false);
  const [ttsService, setTtsService] = useState<AbstractTTSService | null>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const initialMessagesProcessed = useRef(false);
  const [ttsOptions, setTtsOptions] = useState<OpenAITTSOptions>({
    model: 'tts-1',
    speed: 1.0,
    preferredVoices: ['nova', 'alloy', 'echo'],
    volume: 1.0
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  type ServiceStatus = 'healthy' | 'warning' | 'error';
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>('healthy');
  const serviceRecreationAttempts = useRef<number>(0);
  const maxServiceRecreationAttempts = 3;
  const lastServiceCreationTime = useRef<number>(Date.now());
  
  // Initialize TTS service
  useEffect(() => {
    // Check if TTS is enabled in localStorage
    const savedEnabled = localStorage.getItem('tts-enabled');
    if (savedEnabled) {
      setEnabled(savedEnabled === 'true');
    }
    
    // Load saved options from localStorage
    const savedOptions = localStorage.getItem('tts-options');
    if (savedOptions) {
      try {
        const parsedOptions = JSON.parse(savedOptions);
        setTtsOptions(prev => ({ ...prev, ...parsedOptions }));
      } catch (error) {
        console.error('Error parsing TTS options from localStorage:', error);
      }
    }
    
    // Create the TTS service
    createTTSService();
    
    // Cleanup on unmount
    return () => {
      if (ttsService) {
        try {
          ttsService.stop();
          ttsServiceRef.current = null;
        } catch (error) {
          console.error('Error cleaning up TTS service:', error);
        }
      }
    };
  }, []);
  
  // Function to create a new TTS service
  const createTTSService = useCallback(() => {
    try {
      console.log('Creating new TTS service instance...');
      
      // Limit recreation attempts to prevent infinite loops
      if (serviceRecreationAttempts.current >= maxServiceRecreationAttempts) {
        console.error('Maximum TTS service recreation attempts reached');
        setServiceStatus('error');
        return;
      }
      
      // Enforce a minimum time between service recreations
      const minTimeBetweenRecreations = 5000; // 5 seconds
      const timeSinceLastCreation = Date.now() - lastServiceCreationTime.current;
      if (timeSinceLastCreation < minTimeBetweenRecreations) {
        console.log(`Delaying service recreation (${timeSinceLastCreation}ms since last attempt)`);
        setTimeout(createTTSService, minTimeBetweenRecreations - timeSinceLastCreation);
        return;
      }
      
      // Stop existing service if it exists
      if (ttsService) {
        try {
          ttsService.stop();
        } catch (error) {
          console.error('Error stopping existing TTS service:', error);
        }
      }
      
      // Create new service
      const service = new OpenAITTSService(ttsOptions);
      setTtsService(service);
      ttsServiceRef.current = service;
      setServiceStatus('healthy');
      
      // Update counters
      serviceRecreationAttempts.current++;
      lastServiceCreationTime.current = Date.now();
      
      console.log('TTS service created successfully');
    } catch (error) {
      console.error('Error creating TTS service:', error);
      setServiceStatus('error');
    }
  }, [ttsOptions, ttsService, ttsServiceRef]);
  
  // Mark all initial messages as processed when component mounts
  useEffect(() => {
    if (!initialMessagesProcessed.current && messages.length > 0) {
      // Mark all existing messages as processed without reading them
      messages.forEach(msg => {
        if (msg.type === 'chat') {
          processedMessageIds.current.add(msg.id);
        }
      });
      initialMessagesProcessed.current = true;
    }
  }, [messages]);
  
  // Monitor TTS system state and handle errors
  useEffect(() => {
    if (systemState === 'error' && serviceStatus !== 'error') {
      console.warn('TTS system error detected, service may need recreation');
      setServiceStatus('warning');
    } else if (systemState === 'recovering') {
      console.log('TTS system is recovering, recreating service...');
      createTTSService();
    }
  }, [systemState, serviceStatus, createTTSService]);

  // Use a simpler approach to manage speaking indicators
  // useEffect(() => {
  //   // This effect handles cleanup of speaking indicators when TTS is disabled
  //   if (!enabled && ttsService) {
  //     // Turn off all agent speaking indicators when TTS is disabled
  //     Object.keys(userCache).forEach(userId => {
  //       if (userCache[userId].isAgent) {
  //         setParticipantSpeaking(userId, 'tts', false);
  //       }
  //     });
  //   }
  // }, [enabled, ttsService, userCache, setParticipantSpeaking]);

  // Process only new messages received through Pusher
  useEffect(() => {
    if (!ttsService || !enabled || !newMessageReceived || serviceStatus === 'error') return;
    
    // Skip if already processed or it's the current user's message
    if (processedMessageIds.current.has(newMessageReceived.id) || 
        newMessageReceived.user_id === currentUserId) {
      return;
    }
    
    // Check if the user is an agent using the userCache
    const isAgent = userCache[newMessageReceived.user_id]?.isAgent || false;
    if (!isAgent) {
      console.log(`Skipping TTS for non-agent user ${newMessageReceived.user_id}`);
      return;
    }
    
    try {
      // Process the new chat message
      const userName = newMessageReceived.name || 
                       newMessageReceived.profile?.name ||
                       userCache[newMessageReceived.user_id]?.name || 
                       'Unknown User';
      
      const ttsMessage: TTSMessage = {
        id: newMessageReceived.id,
        content: newMessageReceived.content,
        userId: newMessageReceived.user_id,
        userName: userName,
        timestamp: newMessageReceived.created_at
      };
      
      // Queue the message with error handling
      try {
        ttsService.queueMessage(ttsMessage);
        processedMessageIds.current.add(newMessageReceived.id);
        // The TTSService will handle the speaking indicators internally
      } catch (error) {
        console.error('Error playing TTS message:', error);
        setServiceStatus('warning');
      }
    } catch (error) {
      console.error('Critical error processing message for TTS:', error);
      setServiceStatus('error');
    }
  }, [ttsService, enabled, newMessageReceived, currentUserId, userCache, serviceStatus, resetTTSService, setParticipantSpeaking]);

  // Toggle TTS
  const toggleTTS = () => {
    try {
      const newEnabled = !enabled;
      setEnabled(newEnabled);
      localStorage.setItem('tts-enabled', newEnabled.toString());
      
      if (!newEnabled && ttsService) {
        ttsService.stop();
        
        // Make sure to clear any speaking states when TTS is disabled
        Object.keys(userCache).forEach(userId => {
          if (userCache[userId].isAgent) {
            setParticipantSpeaking(userId, 'tts', false);
          }
        });
      } else if (newEnabled && serviceStatus === 'error') {
        // If enabling and service is in error state, try to recreate it
        createTTSService();
      }
    } catch (error) {
      console.error('Error toggling TTS:', error);
    }
  };
  
  // Update TTS options
  const updateTTSOptions = (newOptions: Partial<OpenAITTSOptions>) => {
    try {
      const updatedOptions = { ...ttsOptions, ...newOptions };
      setTtsOptions(updatedOptions);
      localStorage.setItem('tts-options', JSON.stringify(updatedOptions));
      
      // Reset service recreation counter when options are deliberately changed
      serviceRecreationAttempts.current = 0;
      
      // Recreate the TTS service with new options
      if (ttsService) {
        try {
          ttsService.stop();
        } catch (error) {
          console.error('Error stopping TTS service during options update:', error);
        }
      }
      
      // Create new service with updated options
      createTTSService();
    } catch (error) {
      console.error('Error updating TTS options:', error);
      setServiceStatus('warning');
    }
  };
  
  return (
    <div className="">
      <Button
        variant={enabled ? "default" : "outline"}
        size="sm"
        onClick={toggleTTS}
        title={enabled ? "Disable text-to-speech" : "Enable text-to-speech"}
        className={`flex items-center gap-2 ${serviceStatus === 'error' ? 'text-red-500' : 
                  serviceStatus === 'warning' ? 'text-amber-500' : ''}`}
      >
        <Bot className="h-4 w-4" />
        <span>Hear Agents</span>
        {serviceStatus === 'error' && (
          <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
        )}
        {serviceStatus === 'warning' && (
          <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-amber-500"></span>
        )}
      </Button>
    </div>
  );
}
