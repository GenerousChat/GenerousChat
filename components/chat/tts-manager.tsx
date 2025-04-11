"use client";

import { useEffect, useRef, useState } from "react";
import { AbstractTTSService, TTSMessage } from "@/utils/text-to-speech/abstract-tts";
import { OpenAITTSService, OpenAITTSOptions } from "@/utils/text-to-speech/openai-tts";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Settings } from "lucide-react";
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

type ChatMessage = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  users: {
    email: string;
  };
  name?: string;
  profile?: {
    name: string;
  };
  type: 'chat';
};

type StatusMessage = {
  type: 'status';
  statusType: 'join' | 'leave' | 'generation';
  userId: string;
  timestamp: string;
  message?: string; // Optional custom message for status updates
};

type Message = ChatMessage | StatusMessage;

interface TTSManagerProps {
  messages: Message[];
  userCache: Record<string, { name: string; isAgent: boolean }>;
  currentUserId: string;
  newMessageReceived?: Message | null; // New prop to track messages from Pusher
}

export function TTSManager({ messages, userCache, currentUserId, newMessageReceived }: TTSManagerProps ) {
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
    const service = new OpenAITTSService(ttsOptions);
    
    setTtsService(service);
    
    // Cleanup on unmount
    return () => {
      if (service) {
        service.stop();
      }
    };
  }, []);
  
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

  // Process only new messages received through Pusher
  useEffect(() => {
    if (!ttsService || !enabled || !newMessageReceived) return;
    // Skip if it's a status message or already processed or it's the current user's message
    if (newMessageReceived.type === 'status' || 
        processedMessageIds.current.has(newMessageReceived.id) || 
        newMessageReceived.user_id === currentUserId) {
      return;
    }
    
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
    
    ttsService.queueMessage(ttsMessage);
    processedMessageIds.current.add(newMessageReceived.id);
  }, [newMessageReceived, ttsService, enabled, userCache, currentUserId]);
  
  // Toggle TTS
  const toggleTTS = () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    localStorage.setItem('tts-enabled', newEnabled.toString());
    
    if (!newEnabled && ttsService) {
      ttsService.stop();
    }
  };
  
  // Update TTS options
  const updateTTSOptions = (newOptions: Partial<OpenAITTSOptions>) => {
    const updatedOptions = { ...ttsOptions, ...newOptions };
    setTtsOptions(updatedOptions);
    localStorage.setItem('tts-options', JSON.stringify(updatedOptions));
    
    // Recreate the TTS service with new options
    if (ttsService) {
      ttsService.stop();
    }
    const service = new OpenAITTSService(updatedOptions);
    setTtsService(service);
  };
  
  return (
    <div className="absolute top-4 right-4 z-10 flex gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTTS}
        title={enabled ? "Disable text-to-speech" : "Enable text-to-speech"}
      >
        {enabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
      </Button>
      
      <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" title="TTS Settings">
            <Settings className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Text-to-Speech Settings</h4>
              <p className="text-sm text-muted-foreground">
                Configure how the text-to-speech feature works.
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="tts-model">Model</Label>
              <Select 
                value={ttsOptions.model || 'tts-1'} 
                onValueChange={(value) => updateTTSOptions({ model: value as 'tts-1' | 'tts-1-hd' })}
              >
                <SelectTrigger id="tts-model">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tts-1">Standard (tts-1)</SelectItem>
                  <SelectItem value="tts-1-hd">High Definition (tts-1-hd)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <div className="flex justify-between">
                <Label htmlFor="tts-speed">Speech Speed: {ttsOptions.speed?.toFixed(2)}</Label>
              </div>
              <Slider
                id="tts-speed"
                min={0.25}
                max={4.0}
                step={0.05}
                value={[ttsOptions.speed || 1.0]}
                onValueChange={([value]) => updateTTSOptions({ speed: value })}
              />
            </div>
            
            <div className="grid gap-2">
              <div className="flex justify-between">
                <Label htmlFor="tts-volume">Volume: {ttsOptions.volume?.toFixed(2)}</Label>
              </div>
              <Slider
                id="tts-volume"
                min={0.1}
                max={1.0}
                step={0.05}
                value={[ttsOptions.volume || 1.0]}
                onValueChange={([value]) => updateTTSOptions({ volume: value })}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="read-new-only"
                checked={enabled}
                onCheckedChange={toggleTTS}
              />
              <Label htmlFor="read-new-only">Enable Text-to-Speech</Label>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
