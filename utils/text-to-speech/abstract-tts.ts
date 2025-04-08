// Abstract Text-to-Speech service
export interface TTSVoice {
  id: string;
  name: string;
  lang?: string;
  gender?: 'male' | 'female' | 'neutral';
}

export interface TTSMessage {
  id: string;
  content: string;
  userId: string;
  userName: string;
  timestamp: string;
  voice?: TTSVoice;
}

export interface TTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
}

export abstract class AbstractTTSService {
  protected queue: TTSMessage[] = [];
  protected isPlaying: boolean = false;
  protected userVoices: Record<string, TTSVoice> = {};
  protected readMessageIds: Set<string> = new Set();
  protected cachedVoices: TTSVoice[] | null = null;
  
  constructor(protected options: TTSOptions = {}) {
    this.loadState();
  }
  
  // Abstract methods that must be implemented by concrete classes
  abstract getAvailableVoices(): Promise<TTSVoice[]>;
  abstract speakText(text: string, voice: TTSVoice, options?: TTSOptions): Promise<void>;
  
  // Get cached voices or fetch them if not cached
  protected async getCachedVoices(): Promise<TTSVoice[]> {
    if (!this.cachedVoices) {
      try {
        this.cachedVoices = await this.getAvailableVoices();
      } catch (error) {
        console.error('Error fetching available voices:', error);
        return [];
      }
    }
    return this.cachedVoices || [];
  }
  
  // Queue a message to be read
  public queueMessage(message: TTSMessage): void {
    // Skip if already read
    if (this.readMessageIds.has(message.id)) {
      return;
    }
    
    // Assign a voice if not already assigned
    if (!message.voice && !this.userVoices[message.userId]) {
      this.assignRandomVoice(message.userId);
    }
    
    // Use the assigned voice
    const messageWithVoice = {
      ...message,
      voice: this.userVoices[message.userId]
    };
    
    // Add to queue
    this.queue.push(messageWithVoice);
    
    // Start processing if not already playing
    if (!this.isPlaying) {
      this.processQueue();
    }
  }
  
  // Fetch agent voice preference from the agents table
  protected async fetchAgentVoice(agentId: string): Promise<TTSVoice | null> {
    try {
      // Check if this is a UUID format (agent ID)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agentId);
      
      if (!isUUID) {
        return null;
      }
      
      // Use Supabase client to fetch the agent's voice preference
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );
      
      const { data, error } = await supabase
        .from('agents')
        .select('id, voice')
        .eq('id', agentId)
        .single();
      
      if (error || !data || !data.voice) {
        console.log(`No voice preference found for agent ${agentId}`);
        return null;
      }
      
      // Create a voice object from the agent's preference
      // Assuming the voice column contains an OpenAI voice ID like 'nova', 'alloy', etc.
      const voiceId = data.voice;
      
      // Try to find a matching voice in cached voices
      const voices = await this.getCachedVoices();
      const matchingVoice = voices.find(v => v.id === voiceId);
      
      if (matchingVoice) {
        return matchingVoice;
      }
      
      // Create a basic voice object if not found in available voices
      return {
        id: voiceId,
        name: voiceId,
        gender: 'neutral' // Default gender
      };
    } catch (error) {
      console.error('Error fetching agent voice:', error);
      return null;
    }
  }

  // Process the message queue
  protected async processQueue(): Promise<void> {
    if (this.queue.length === 0 || this.isPlaying) {
      return;
    }
    
    this.isPlaying = true;
    const message = this.queue.shift();
    
    if (message) {
      try {
        let voice = message.voice || this.userVoices[message.userId];
        
        // If no voice is assigned yet, try to fetch from agents table if it's an agent
        if (!voice) {
          const agentVoice = await this.fetchAgentVoice(message.userId);
          
          if (agentVoice) {
            // Save the agent voice for future use
            this.userVoices[message.userId] = agentVoice;
            voice = agentVoice;
          } else {
            // If not found in agents table, assign a random voice
            await this.assignRandomVoice(message.userId);
            voice = this.userVoices[message.userId];
          }
        }
        
        if (!voice) {
          throw new Error(`No voice available for user ${message.userId}`);
        }
        
        // Just use the message content directly without the prefix
        const textToRead = message.content;
        
        console.log(`Speaking message with voice ${voice.name || voice.id}`);
        
        // Speak the text
        await this.speakText(textToRead, voice, this.options);
        
        // Mark as read
        this.readMessageIds.add(message.id);
        this.saveState();
      } catch (error) {
        console.error('Error speaking message:', error);
      }
    }
    
    this.isPlaying = false;
    
    // Continue with next message if any
    this.processQueue();
  }
  
  // Assign a random voice to a user
  protected async assignRandomVoice(userId: string): Promise<void> {
    try {
      const voices = await this.getAvailableVoices();
      if (voices.length > 0) {
        const randomIndex = Math.floor(Math.random() * voices.length);
        this.userVoices[userId] = voices[randomIndex];
        console.log(`Assigned voice ${voices[randomIndex].name} to user ${userId}`);
        this.saveState();
      }
    } catch (error) {
      console.error('Error assigning random voice:', error);
    }
  }
  
  // Save state to localStorage
  protected saveState(): void {
    try {
      localStorage.setItem('tts-user-voices', JSON.stringify(this.userVoices));
      localStorage.setItem('tts-read-messages', JSON.stringify(Array.from(this.readMessageIds)));
    } catch (error) {
      console.error('Error saving TTS state:', error);
    }
  }
  
  // Load state from localStorage
  protected loadState(): void {
    try {
      const userVoices = localStorage.getItem('tts-user-voices');
      const readMessages = localStorage.getItem('tts-read-messages');
      
      if (userVoices) {
        this.userVoices = JSON.parse(userVoices);
      }
      
      if (readMessages) {
        this.readMessageIds = new Set(JSON.parse(readMessages));
      }
    } catch (error) {
      console.error('Error loading TTS state:', error);
    }
  }
  
  // Clear read message history
  public clearReadHistory(): void {
    this.readMessageIds.clear();
    this.saveState();
  }
  
  // Stop all speech and clear queue
  public stop(): void {
    this.queue = [];
    // Concrete implementations should override this to also stop current speech
  }
}
