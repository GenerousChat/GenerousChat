/**
 * Supabase to Pusher Bridge Worker
 * This worker listens to Supabase database changes and forwards them to Pusher
 */
const express = require('express');
const config = require('./config');
const logger = require('./utils/logger');
const supabaseService = require('./services/supabase');
const pusherService = require('./services/pusher');
const aiService = require('./services/ai');
const routes = require('./routes');
const errorHandler = require('./middleware/error-handler');

// Express server setup
const app = express();
app.use(express.json());

// Register routes
app.use('/', routes);

// Error handling middleware
app.use(errorHandler);

// Message handler for Supabase real-time events
async function handleMessageInserted(message) {
  try {
    
    // Send to the appropriate room channel
    await pusherService.sendNewMessage(message.room_id, {
      id: message.id,
      content: message.content,
      created_at: message.created_at,
      user_id: message.user_id,
    });
    
    logger.info(`Message successfully forwarded to Pusher channel room-${message.room_id}`);

    // Check if message is from an AI agent
    const isAgent = await supabaseService.isUserAnAgent(message.user_id);
    
    // Only generate AI responses for messages from human users
    if (!isAgent) {
      logger.info('Message is from a human user, generating AI response...');
      logger.info(`Preparing to generate AI response for room ${message.room_id}`);
      
      // Generate AI response immediately
      aiService.generateAIResponse(message.room_id);
    } else {
      logger.info('Message is from an AI agent, skipping AI response generation');
    }
  } catch (error) {
    logger.error('Error handling message insertion:', error);
  }
}

// Participant joined handler for Supabase real-time events
async function handleParticipantJoined(participant) {
  try {
    // Send user joined event
    await pusherService.sendUserJoined(
      participant.room_id,
      participant.user_id,
      participant.joined_at
    );
    
    logger.info(`User join event forwarded to Pusher channel room-${participant.room_id}`);
  } catch (error) {
    logger.error('Error handling participant joined event:', error);
  }
}

// Participant left handler for Supabase real-time events
async function handleParticipantLeft(participant) {
  try {
    // Send user left event
    await pusherService.sendUserLeft(participant.room_id, participant.user_id);
    
    logger.info(`User left event forwarded to Pusher channel room-${participant.room_id}`);
  } catch (error) {
    logger.error('Error handling participant left event:', error);
  }
}

// Initialize the application
async function init() {
  try {
    logger.info('===== INITIALIZING APPLICATION =====');
    logger.info('Environment variables:');
    logger.info('- PUSHER_SECRET:', process.env.PUSHER_SECRET ? 'is set' : 'is NOT set');
    logger.info('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'is set' : 'is NOT set');
    logger.info('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'is set' : 'is NOT set');
    logger.info('- SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'is set' : 'is NOT set');
    logger.info('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'is set' : 'is NOT set');
    logger.info('- HTML_CONTENT_CHANCE:', process.env.HTML_CONTENT_CHANCE 
      ? process.env.HTML_CONTENT_CHANCE + '%' 
      : '90% (default)');
    logger.info('- Using Supabase key type:', process.env.SUPABASE_SERVICE_KEY 
      ? 'SERVICE ROLE (privileged)' 
      : 'ANON (limited)');
    
    // Fetch recent messages first
    await supabaseService.fetchRecentMessages();

    // Fetch AI agents
    await supabaseService.fetchAIAgents();

    // Set up Supabase listeners
    await supabaseService.setupSupabaseListeners(
      handleMessageInserted,
      handleParticipantJoined,
      handleParticipantLeft
    );

    // Start the server
    const PORT = config.server.port;
    app.listen(PORT, () => {
      logger.info(`Supabase to Pusher bridge worker running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Error initializing the application:', error);
    process.exit(1);
  }
}

// Start the application
init();
