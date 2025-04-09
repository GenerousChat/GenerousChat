"use client";

import { AbstractTTSService, TTSOptions, TTSVoice } from './abstract-tts';

export interface OpenAITTSOptions extends TTSOptions {
  model?: 'tts-1' | 'tts-1-hd';
  speed?: number; // Speed multiplier between 0.25 and 4.0
  preferredVoices?: string[]; // List of preferred voice IDs in order of preference
}

export class OpenAITTSService extends AbstractTTSService {
  private audioContext: AudioContext | null = null;
  private audioQueue: HTMLAudioElement[] = [];
  protected isPlaying: boolean = false;
  private fallbackSynthesis: SpeechSynthesis | null = null;
  private useFallback: boolean = false;
  private currentAudio: HTMLAudioElement | null = null;
  private agentVoices: Record<string, string> = {};

  constructor(private apiOptions: OpenAITTSOptions = {}) {
    super(apiOptions);
    
    // Load agent voices when initializing
    this.loadAgentVoices();
    
    // Initialize audio context when in browser environment
    if (typeof window !== 'undefined') {
      // Create audio context on user interaction to avoid autoplay restrictions
      const initAudioContext = () => {
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        // Remove event listeners once initialized
        document.removeEventListener('click', initAudioContext);
        document.removeEventListener('touchstart', initAudioContext);
      };
      
      document.addEventListener('click', initAudioContext);
      document.addEventListener('touchstart', initAudioContext);
      
      // Initialize fallback speech synthesis
      if (window.speechSynthesis) {
        this.fallbackSynthesis = window.speechSynthesis;
      }
    }
  }

  private async loadAgentVoices() {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );
      
      const { data, error } = await supabase
        .from('agents')
        .select('id, voice');
      
      if (!error && data) {
        // Cache all agent voices
        this.agentVoices = data.reduce((acc, agent) => {
          if (agent.voice) {
            acc[agent.id] = agent.voice;
          }
          return acc;
        }, {} as Record<string, string>);
      }
    } catch (error) {
      console.error('Error loading agent voices:', error);
    }
  }

  async getAvailableVoices(): Promise<TTSVoice[]> {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );
      
      const { data, error } = await supabase
        .from('agents')
        .select('id, voice, gender')
        .not('voice', 'is', null);
      
      if (!error && data) {
        return data.map(agent => ({
          id: agent.voice,
          name: agent.voice,
          gender: agent.gender || 'neutral'
        }));
      }
    } catch (error) {
      console.error('Error loading available voices:', error);
    }
    
    // Return empty array if query fails
    return [];
  }

  async speakText(text: string, voice: TTSVoice, options?: TTSOptions): Promise<void> {
    // If we've already determined to use fallback, skip the OpenAI API call
    if (this.useFallback) {
      return this.speakWithFallback(text, voice, options);
    }
    
    try {
      let openAIVoice = voice.id || 'nova';
      
      // If this is an agent, use their cached voice
      if (this.agentVoices[voice.id]) {
        openAIVoice = this.agentVoices[voice.id];
      }
      
      // Call our API endpoint
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice: openAIVoice,
          model: this.apiOptions.model || 'tts-1',
          speed: this.apiOptions.speed
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn('OpenAI TTS API error, falling back to browser TTS:', errorData);
        this.useFallback = true;
        return this.speakWithFallback(text, voice, options);
      }

      const data = await response.json();
      
      return new Promise((resolve, reject) => {
        // Convert base64 to blob
        const byteCharacters = atob(data.audio);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: data.contentType });
        
        // Create audio URL
        const audioUrl = URL.createObjectURL(blob);
        
        // Create and play audio element
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl); // Clean up
          this.currentAudio = null;
          resolve();
        };
        
        audio.onerror = (error) => {
          URL.revokeObjectURL(audioUrl); // Clean up
          this.currentAudio = null;
          console.warn('Error playing OpenAI TTS audio, falling back to browser TTS:', error);
          this.useFallback = true;
          this.speakWithFallback(text, voice, options).then(resolve).catch(reject);
        };
        
        this.currentAudio = audio;
        audio.play().catch((error) => {
          console.warn('Error playing OpenAI TTS audio, falling back to browser TTS:', error);
          this.useFallback = true;
          this.speakWithFallback(text, voice, options).then(resolve).catch(reject);
        });
      });
    } catch (error) {
      console.error('Error in OpenAI TTS, falling back to browser TTS:', error);
      this.useFallback = true;
      return this.speakWithFallback(text, voice, options);
    }
  }
  
  // Fallback to browser's built-in speech synthesis
  private speakWithFallback(text: string, voice: TTSVoice, options?: TTSOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.fallbackSynthesis) {
        return reject(new Error('Speech synthesis not available'));
      }
      
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Try to find a suitable voice
        const voices = this.fallbackSynthesis.getVoices();
        if (voices.length > 0) {
          // Try to match by gender if specified
          if (voice.gender) {
            const genderVoices = voices.filter(v => {
              const name = v.name.toLowerCase();
              if (voice.gender === 'female') return name.includes('female') || name.includes('woman');
              if (voice.gender === 'male') return name.includes('male') || name.includes('man');
              return true;
            });
            
            if (genderVoices.length > 0) {
              utterance.voice = genderVoices[Math.floor(Math.random() * genderVoices.length)];
            }
          }
          
          // If no voice selected yet, pick a random one
          if (!utterance.voice) {
            utterance.voice = voices[Math.floor(Math.random() * voices.length)];
          }
        }
        
        // Apply options
        const mergedOptions = { ...this.options, ...options };
        if (mergedOptions.rate !== undefined) utterance.rate = mergedOptions.rate;
        if (mergedOptions.pitch !== undefined) utterance.pitch = mergedOptions.pitch;
        if (mergedOptions.volume !== undefined) utterance.volume = mergedOptions.volume;
        
        // Set event handlers
        utterance.onend = () => {
          resolve();
        };
        
        utterance.onerror = (event) => {
          reject(new Error(`Speech synthesis error: ${event.error}`));
        };
        
        // Speak the text
        this.fallbackSynthesis.speak(utterance);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  // Override stop to cancel current audio
  public stop(): void {
    super.stop();
    
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
  }
}
