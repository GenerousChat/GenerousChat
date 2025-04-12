require("dotenv").config({ path: "../.env" });

module.exports = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    messagesTable: process.env.MESSAGES_TABLE || 'messages',
  },
  
  pusher: {
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER,
  },

  server: {
    port: process.env.PORT || 3001,
  },

  ai: {
    htmlContentChance: process.env.HTML_CONTENT_CHANCE || 90,
    responseAlgorithm: {
      rapidMessageThresholdMs: parseInt(process.env.RAPID_MESSAGE_THRESHOLD_MS || 10000),
      responseDelayMs: parseInt(process.env.RESPONSE_DELAY_MS || 5000),
      minMessagesBeforeResponse: parseInt(process.env.MIN_MESSAGES_BEFORE_RESPONSE || 1),
      maxConsecutiveUserMessages: parseInt(process.env.MAX_CONSECUTIVE_USER_MESSAGES || 5)
    }
  }
};