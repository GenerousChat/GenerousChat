// Type definitions for the worker modules

// Config module
declare module './config' {
  interface ServerConfig {
    port: number;
  }

  interface Config {
    server: ServerConfig;
  }

  const config: Config;
  export default config;
}

// Logger module
declare module './utils/logger' {
  interface Logger {
    info(message: string, ...meta: any[]): void;
    error(message: string, ...meta: any[]): void;
    warn(message: string, ...meta: any[]): void;
    debug(message: string, ...meta: any[]): void;
  }

  const logger: Logger;
  export default logger;
}

// Supabase service module
declare module './services/supabase' {
  import { Message, Participant } from './index';
  
  interface SupabaseService {
    fetchRecentMessages(): Promise<void>;
    fetchAIAgents(): Promise<void>;
    isUserAnAgent(userId: string): Promise<boolean>;
    setupSupabaseListeners(
      messageHandler: (message: Message) => Promise<void>,
      participantJoinedHandler: (participant: Participant) => Promise<void>,
      participantLeftHandler: (participant: Participant) => Promise<void>
    ): Promise<void>;
  }

  const supabaseService: SupabaseService;
  export default supabaseService;
}

// Pusher service module
declare module './services/pusher' {
  interface MessageData {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
  }

  interface PusherService {
    sendNewMessage(roomId: string, message: MessageData): Promise<void>;
    sendUserJoined(roomId: string, userId: string, joinedAt: string): Promise<void>;
    sendUserLeft(roomId: string, userId: string): Promise<void>;
  }

  const pusherService: PusherService;
  export default pusherService;
}

// AI service module
declare module './services/ai' {
  interface AIService {
    generateAIResponse(roomId: string): Promise<void>;
  }

  const aiService: AIService;
  export default aiService;
}

// Routes module
declare module './routes' {
  import { Router } from 'express';
  const router: Router;
  export default router;
}

// Error handler middleware
declare module './middleware/error-handler' {
  import { ErrorRequestHandler } from 'express';
  const errorHandler: ErrorRequestHandler;
  export default errorHandler;
}
