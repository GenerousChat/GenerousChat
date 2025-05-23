// Load environment variables from .env file
import dotenv from 'dotenv';

// Configure dotenv to load from the parent directory's .env file
dotenv.config({ path: '../.env' });

import express from 'express';
import logger from './utils/logger.js';
import supabaseService, { Message, Participant } from './services/supabase.js'; 
import pusherService from './services/pusher.js';
import aiService from './services/ai.js';
// import routes from './routes/index.js';

async function handleMessageInserted(message: Message): Promise<void> {
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
async function handleParticipantJoined(participant: Participant): Promise<void> {
  try {
    // Send user joined event
    await pusherService.sendUserJoined(
      participant.room_id,
      participant.user_id,
      participant.joined_at || new Date().toISOString()
    );
    
    logger.info(`User join event forwarded to Pusher channel room-${participant.room_id}`);
  } catch (error) {
    logger.error('Error handling participant joined event:', error);
  }
}

// Participant left handler for Supabase real-time events
async function handleParticipantLeft(participant: Participant): Promise<void> {
  try {
    // Send user left event
    await pusherService.sendUserLeft(participant.room_id, participant.user_id);
    
    logger.info(`User left event forwarded to Pusher channel room-${participant.room_id}`);
  } catch (error) {
    logger.error('Error handling participant left event:', error);
  }
}

async function init(): Promise<void> {


  const app = express();
  
  app.use(express.json());

  // app.use('/', routes);

  try {
    logger.info('===== INITIALIZING APPLICATION =====');

    // Set up Supabase listeners
    await supabaseService.setupSupabaseListeners(
      handleMessageInserted,
      handleParticipantJoined,
      handleParticipantLeft
    );

    // Start the server
    const PORT = process.env.PORT || 3001;
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
