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
  private audioContextResetCount: number = 0;
  private maxResetAttempts: number = 3;
  private lastPlayAttempt: number = 0;
  private playbackMonitorInterval: number | null = null;

  constructor(private apiOptions: OpenAITTSOptions = {}) {
    super(apiOptions);
    
    // Load agent voices when initializing
    this.loadAgentVoices();
    
    // Initialize audio context when in browser environment
    if (typeof window !== 'undefined') {
      // Create audio context on user interaction to avoid autoplay restrictions
      const initAudioContext = () => {
        try {
          if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            console.log('Audio context initialized successfully');
          }
          // Remove event listeners once initialized
          document.removeEventListener('click', initAudioContext);
          document.removeEventListener('touchstart', initAudioContext);
        } catch (error) {
          console.error('Error initializing audio context:', error);
          this.recordError(error as Error);
        }
      };
      
      document.addEventListener('click', initAudioContext);
      document.addEventListener('touchstart', initAudioContext);
      
      // Initialize fallback speech synthesis
      try {
        if (window.speechSynthesis) {
          this.fallbackSynthesis = window.speechSynthesis;
          console.log('Fallback speech synthesis initialized');
        }
      } catch (error) {
        console.error('Error initializing fallback speech synthesis:', error);
        this.recordError(error as Error);
      }
      
      // Set up playback monitoring
      this.setupPlaybackMonitoring();
    }
  }
  
  // Set up monitoring to detect and recover from stalled playback
  private setupPlaybackMonitoring(): void {
    if (this.playbackMonitorInterval) {
      clearInterval(this.playbackMonitorInterval);
    }
    
    // Check every 10 seconds
    this.playbackMonitorInterval = window.setInterval(() => {
      try {
        // If we're supposedly playing but no activity for 30 seconds
        const inactivityThreshold = 30000; // 30 seconds
        if (this.isPlaying && 
            this.lastPlayAttempt > 0 && 
            Date.now() - this.lastPlayAttempt > inactivityThreshold) {
          
          console.warn('Playback appears stalled, attempting recovery...');
          
          // Force stop current playback
          this.stopCurrentAudio();
          
          // Reset playing state
          this.isPlaying = false;
          
          // Try to resume queue processing
          setTimeout(() => this.processQueue(), 1000);
        }
      } catch (error) {
        console.error('Error in playback monitoring:', error);
      }
    }, 10000);
  }
  
  // Reset audio context if needed
  private resetAudioContext(): boolean {
    try {
      if (this.audioContextResetCount >= this.maxResetAttempts) {
        console.warn('Maximum audio context reset attempts reached, switching to fallback');
        this.useFallback = true;
        return false;
      }
      
      if (this.audioContext) {
        // Close existing context
        this.audioContext.close().catch(err => console.error('Error closing audio context:', err));
      }
      
      // Create new context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.audioContextResetCount++;
      console.log(`Audio context reset (attempt ${this.audioContextResetCount})`);
      return true;
    } catch (error) {
      console.error('Error resetting audio context:', error);
      this.recordError(error as Error);
      this.useFallback = true;
      return false;
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
  
  // Stop current audio playback
  private stopCurrentAudio(): void {
    try {
      if (this.currentAudio) {
        this.currentAudio.onended = null; // Remove event listener
        this.currentAudio.onerror = null; // Remove event listener
        this.currentAudio.pause();
        
        try {
          // Try to reset the audio element
          this.currentAudio.currentTime = 0;
        } catch (e) {
          // Ignore errors when resetting currentTime
        }
        
        this.currentAudio = null;
      }
      
      // Also stop any speech synthesis if using fallback
      if (this.useFallback && this.fallbackSynthesis) {
        try {
          this.fallbackSynthesis.cancel();
        } catch (e) {
          console.error('Error cancelling speech synthesis:', e);
        }
      }
    } catch (error) {
      console.error('Error stopping current audio:', error);
      this.recordError(error as Error);
      // Force reset state
      this.currentAudio = null;
    }
  }
  
  // Override stop to cancel current audio
  public stop(): void {
    try {
      super.stop();
      this.stopCurrentAudio();
      
      // Clear any queued audio elements
      this.audioQueue = [];
      
      // Reset state flags
      this.isPlaying = false;
      
      console.log('TTS playback stopped and queue cleared');
    } catch (error) {
      console.error('Error in stop method:', error);
      this.recordError(error as Error);
      
      // Force reset state
      this.audioQueue = [];
      this.isPlaying = false;
      this.currentAudio = null;
    }
  }
  
  // Override isHealthy to add additional checks
  public isHealthy(): boolean {
    // First check the base implementation
    if (!super.isHealthy()) {
      return false;
    }
    
    // Check if we've exceeded reset attempts
    if (this.audioContextResetCount >= this.maxResetAttempts) {
      console.warn('Audio context has been reset too many times');
      return false;
    }
    
    return true;
  }
}
