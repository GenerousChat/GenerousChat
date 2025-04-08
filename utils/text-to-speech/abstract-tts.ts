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
  
  constructor(protected options: TTSOptions = {}) {
    this.loadState();
  }
  
  // Abstract methods that must be implemented by concrete classes
  abstract getAvailableVoices(): Promise<TTSVoice[]>;
  abstract speakText(text: string, voice: TTSVoice, options?: TTSOptions): Promise<void>;
  
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
  
  // Process the message queue
  protected async processQueue(): Promise<void> {
    if (this.queue.length === 0 || this.isPlaying) {
      return;
    }
    
    this.isPlaying = true;
    const message = this.queue.shift();
    
    if (message) {
      try {
        // Make sure the message has a voice assigned
        if (!message.voice && !this.userVoices[message.userId]) {
          await this.assignRandomVoice(message.userId);
        }
        
        const voice = message.voice || this.userVoices[message.userId];
        
        if (!voice) {
          throw new Error(`No voice available for user ${message.userId}`);
        }
        
        // Format the text to be read
        const textToRead = `${message.userName} says: ${message.content}`;
        
        console.log(`Speaking message from ${message.userName} with voice ${voice.name || voice.id}`);
        
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
