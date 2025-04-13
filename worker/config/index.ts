import dotenv from 'dotenv';
dotenv.config({ path: ".env" });

export interface SupabaseConfig {
  url: string;
  serviceKey?: string;
  anonKey: string;
  messagesTable: string;
}

export interface PusherConfig {
  appId: string;
  key: string;
  secret: string;
  cluster: string;
}

export interface ServerConfig {
  port: number;
}

export interface AIResponseAlgorithm {
  rapidMessageThresholdMs: number;
  responseDelayMs: number;
  minMessagesBeforeResponse: number;
  maxConsecutiveUserMessages: number;
}

export interface AIConfig {
  htmlContentChance: number;
  responseAlgorithm: AIResponseAlgorithm;
}

export interface Config {
  supabase: SupabaseConfig;
  pusher: PusherConfig;
  server: ServerConfig;
  ai: AIConfig;
}

const config: Config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    messagesTable: process.env.MESSAGES_TABLE || 'messages',
  },
  
  pusher: {
    appId: process.env.PUSHER_APP_ID || '',
    key: process.env.PUSHER_KEY || '',
    secret: process.env.PUSHER_SECRET || '',
    cluster: process.env.PUSHER_CLUSTER || '',
  },

  server: {
    port: parseInt(process.env.PORT || '3001', 10),
  },

  ai: {
    htmlContentChance: parseInt(process.env.HTML_CONTENT_CHANCE || '90', 10),
    responseAlgorithm: {
      rapidMessageThresholdMs: parseInt(process.env.RAPID_MESSAGE_THRESHOLD_MS || '10000', 10),
      responseDelayMs: parseInt(process.env.RESPONSE_DELAY_MS || '5000', 10),
      minMessagesBeforeResponse: parseInt(process.env.MIN_MESSAGES_BEFORE_RESPONSE || '1', 10),
      maxConsecutiveUserMessages: parseInt(process.env.MAX_CONSECUTIVE_USER_MESSAGES || '5', 10)
    }
  }
};

export default config;
