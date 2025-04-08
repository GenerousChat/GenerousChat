"use client";

import { AbstractTTSService, TTSOptions, TTSVoice } from './abstract-tts';

export class GoogleTTSService extends AbstractTTSService {
  private speechSynthesis: SpeechSynthesis | null = null;
  private availableVoices: TTSVoice[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor(options: TTSOptions = {}) {
    super(options);
    
    // Initialize speech synthesis when in browser environment
    if (typeof window !== 'undefined') {
      this.speechSynthesis = window.speechSynthesis;
      
      // Load voices when they're available
      if (this.speechSynthesis.onvoiceschanged !== undefined) {
        this.speechSynthesis.onvoiceschanged = this.loadVoices.bind(this);
      }
      
      // Try to load voices immediately (they might already be available)
      this.loadVoices();
    }
  }

  private loadVoices(): void {
    if (!this.speechSynthesis) return;
    
    const synVoices = this.speechSynthesis.getVoices();
    this.availableVoices = synVoices.map(voice => ({
      id: voice.voiceURI,
      name: voice.name,
      lang: voice.lang,
      gender: this.determineGender(voice.name)
    }));
    
    console.log(`Loaded ${this.availableVoices.length} voices for Google TTS`);
  }
  
  private determineGender(voiceName: string): 'male' | 'female' | 'neutral' {
    // This is a simple heuristic - voice naming conventions differ across browsers
    const lowerName = voiceName.toLowerCase();
    if (lowerName.includes('female') || lowerName.includes('woman')) {
      return 'female';
    } else if (lowerName.includes('male') || lowerName.includes('man')) {
      return 'male';
    } else {
      // Try to guess based on common voice naming patterns
      if (/\b(f|female|girl)\d*\b/.test(lowerName)) {
        return 'female';
      } else if (/\b(m|male|boy)\d*\b/.test(lowerName)) {
        return 'male';
      }
      return 'neutral';
    }
  }

  async getAvailableVoices(): Promise<TTSVoice[]> {
    // If voices aren't loaded yet, wait a bit and try again
    if (this.availableVoices.length === 0 && this.speechSynthesis) {
      await new Promise(resolve => setTimeout(resolve, 100));
      this.loadVoices();
    }
    return this.availableVoices;
  }

  async speakText(text: string, voice: TTSVoice, options?: TTSOptions): Promise<void> {
    if (!this.speechSynthesis) {
      throw new Error('Speech synthesis not available');
    }
    
    return new Promise((resolve, reject) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Find the matching SpeechSynthesisVoice
        const synVoice = this.speechSynthesis!.getVoices().find(v => v.voiceURI === voice.id);
        if (synVoice) {
          utterance.voice = synVoice;
        } else {
          console.warn(`Voice ${voice.name} not found, using default voice`);
        }
        
        // Apply options
        const mergedOptions = { ...this.options, ...options };
        if (mergedOptions.rate !== undefined) utterance.rate = mergedOptions.rate;
        if (mergedOptions.pitch !== undefined) utterance.pitch = mergedOptions.pitch;
        if (mergedOptions.volume !== undefined) utterance.volume = mergedOptions.volume;
        
        // Set event handlers
        utterance.onend = () => {
          this.currentUtterance = null;
          resolve();
        };
        
        utterance.onerror = (event) => {
          this.currentUtterance = null;
          reject(new Error(`Speech synthesis error: ${event.error}`));
        };
        
        // Store the current utterance so we can cancel it if needed
        this.currentUtterance = utterance;
        
        // Speak the text
        if (this.speechSynthesis) {
          this.speechSynthesis.speak(utterance);
        } else {
          reject(new Error('Speech synthesis not available'));
        }
      } catch (error) {
        reject(error);
      }
    });
  }
  
  // Override stop to cancel current speech
  public stop(): void {
    super.stop();
    
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
  }
}
