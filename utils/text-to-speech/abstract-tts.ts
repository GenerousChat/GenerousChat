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
  protected lastActivityTimestamp: number = Date.now();
  protected errorCount: number = 0;
  protected maxErrorCount: number = 3;
  protected healthCheckTimestamp: number = Date.now();
  
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
    try {
      // Update activity timestamp
      this.lastActivityTimestamp = Date.now();
      
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
    } catch (error) {
      this.recordError(error as Error);
      console.error('Error queueing message:', error);
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
        .select('id, voice, gender')
        .eq('id', agentId)
        .single();
      
      if (error || !data) {
        console.log(`No voice preference found for agent ${agentId}`);
        return null;
      }
      
      // Create a voice object based on the agent's data
      // If there's a specific voice ID in the database, use that
      const voiceId = data.voice || '';
      
      // Make sure we have a valid gender value
      const gender = data.gender === 'male' || data.gender === 'female' || data.gender === 'neutral' 
        ? data.gender 
        : 'neutral';
      
      // Return a voice object with the agent's preferences
      return {
        id: voiceId,
        name: voiceId || 'Agent Voice',
        gender: gender
      };
    } catch (error) {
      console.error('Error fetching agent voice:', error);
      return null;
    }
  }

  // Process the message queue
  protected async processQueue(): Promise<void> {
    try {
      // Update activity timestamp
      this.lastActivityTimestamp = Date.now();
      
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
          
          // Reset error count on successful playback
          this.resetErrorCount();
        } catch (error) {
          this.recordError(error as Error);
          console.error('Error speaking message:', error);
        }
      }
      
      this.isPlaying = false;
      
      // Continue with next message if any
      this.processQueue();
    } catch (error) {
      // Ensure we reset the playing state even if an error occurs
      this.isPlaying = false;
      this.recordError(error as Error);
      console.error('Critical error in processQueue:', error);
      
      // Try to continue with the next message after a short delay
      setTimeout(() => {
        this.processQueue();
      }, 1000);
    }
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
    try {
      // Update activity timestamp
      this.lastActivityTimestamp = Date.now();
      
      this.queue = [];
      this.isPlaying = false; // Ensure playing state is reset
      // Concrete implementations should override this to also stop current speech
    } catch (error) {
      this.recordError(error as Error);
      console.error('Error stopping TTS:', error);
      
      // Force reset state in case of error
      this.queue = [];
      this.isPlaying = false;
    }
  }
  
  // Check if a message is in the queue
  public isMessageInQueue(messageId: string): boolean {
    // Check if the message is in the queue
    return this.queue.some(message => message.id === messageId) || this.isPlaying;
  }
  
  // Get the current queue length
  public getQueueLength(): number {
    return this.queue.length;
  }
  
  // Get a copy of the current queue
  public getQueue(): TTSMessage[] {
    return [...this.queue];
  }
  
  // Check if the service is currently playing
  public isPlaying(): boolean {
    return this.isPlaying;
  }
  
  // Get the ID of the currently playing message
  public getCurrentlyPlayingMessageId(): string | null {
    if (!this.isPlaying || this.queue.length === 0) {
      return null;
    }
    return this.queue[0]?.id || null;
  }
  
  // Check if the TTS service is healthy
  public isHealthy(): boolean {
    // Update health check timestamp
    this.healthCheckTimestamp = Date.now();
    
    // Check if there have been too many errors
    if (this.errorCount >= this.maxErrorCount) {
      console.warn('TTS service has too many errors, considered unhealthy');
      return false;
    }
    
    // Check if the service has been inactive for too long while in playing state
    const inactivityThreshold = 60000; // 1 minute
    if (this.isPlaying && Date.now() - this.lastActivityTimestamp > inactivityThreshold) {
      console.warn('TTS service has been inactive for too long while in playing state');
      return false;
    }
    
    return true;
  }
  
  // Reset error count
  public resetErrorCount(): void {
    this.errorCount = 0;
    this.lastActivityTimestamp = Date.now();
  }
  
  // Record an error
  protected recordError(error: Error): void {
    this.errorCount++;
    console.error('TTS error recorded:', error);
    
    // If we've reached the error threshold, log a warning
    if (this.errorCount >= this.maxErrorCount) {
      console.warn('TTS service has reached error threshold, may need reset');
    }
  }
}
