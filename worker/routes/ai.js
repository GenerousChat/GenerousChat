/**
 * AI-related endpoints
 */
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const aiService = require('../services/ai');
const supabaseService = require('../services/supabase');

/**
 * POST /ai/test
 * Test AI response generation
 */
router.post('/test', async (req, res) => {
  try {
    logger.info('Testing AI response generation');
    const roomId = req.body.roomId || 'test-room';
    const forceHtml = req.body.forceHtml === true;

    // Override the random selection if forceHtml is true
    if (forceHtml) {
      // Temporarily modify Math.random to always return 0.1 (which is < 0.2)
      const originalRandom = Math.random;
      Math.random = () => 0.1;

      // Generate and send AI response with HTML
      await aiService.generateAIResponse(roomId);

      // Restore original Math.random
      Math.random = originalRandom;

      res.status(200).json({
        success: true,
        message: 'HTML content generated and sent to Pusher',
      });
    } else {
      // Generate and send regular AI response
      await aiService.generateAIResponse(roomId);

      res.status(200).json({
        success: true,
        message: 'AI response generated and sent to Pusher',
      });
    }
  } catch (error) {
    logger.error('Error testing AI response:', error);
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

/**
 * POST /ai/analyze
 * Analyze a message for visualization intent
 */
router.post('/analyze', async (req, res) => {
  try {
    const { roomId, messageId } = req.body;
    
    // Get the message from Supabase
    const roomMessages = supabaseService.recentMessages.filter(msg => msg.room_id === roomId);
    if (roomMessages.length === 0) {
      return res.status(404).json({ error: 'No messages found for this room' });
    }
    
    // Find the specific message or use the last one
    const message = messageId 
      ? roomMessages.find(msg => msg.id === messageId)
      : roomMessages[roomMessages.length - 1];
      
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Analyze the message
    const visualizationConfidence = await aiService.analyzeMessageForVisualizationIntent(message);
    
    logger.info('Message analysis completed', { 
      roomId, 
      messageId, 
      visualizationConfidence 
    });

    res.json({ 
      confidence: visualizationConfidence,
      shouldVisualize: visualizationConfidence > 0.7
    });
  } catch (error) {
    logger.error('Error analyzing message:', error);
    res.status(500).json({ error: 'Failed to analyze message' });
  }
});

/**
 * POST /ai/respond
 * Generate an AI response for a room
 */
router.post('/respond', async (req, res) => {
  try {
    const { roomId } = req.body;
    
    // Generate AI response
    const success = await aiService.generateAIResponse(roomId);
    
    if (success) {
      res.status(200).json({
        success: true,
        message: 'AI response generated and sent to Pusher',
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Could not generate AI response',
      });
    }
  } catch (error) {
    logger.error('Error generating AI response:', error);
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

/**
 * GET /ai/recent-messages
 * Get recent messages
 */
router.get('/recent-messages', (req, res) => {
  res.status(200).json({ messages: supabaseService.recentMessages });
});

module.exports = router;
