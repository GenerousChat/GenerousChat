/**
 * AI-related endpoints
 */
import express, { Request, Response } from 'express';
import logger from '../utils/logger.js';
import aiService from '../services/ai.js';
import supabaseService, { Message } from '../services/supabase.js';

const router = express.Router();

// Define interfaces for request bodies
interface TestAIRequestBody {
  roomId?: string;
  forceHtml?: boolean;
}

interface AnalyzeRequestBody {
  roomId: string;
  messageId?: string;
}

interface RespondRequestBody {
  roomId: string;
}

/**
 * POST /ai/test
 * Test AI response generation
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    logger.info('Testing AI response generation');
    const { roomId = 'test-room', forceHtml = false } = req.body as TestAIRequestBody;

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
    logger.error('Error testing AI response:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

/**
 * POST /ai/analyze
 * Analyze a message for visualization intent
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { roomId, messageId } = req.body as AnalyzeRequestBody;
    
    // Get the message from Supabase
    const { data: roomMessages, error } = await supabaseService.supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });
      
    if (error || !roomMessages || roomMessages.length === 0) {
      return res.status(404).json({ error: 'No messages found for this room' });
    }
    
    // Find the specific message or use the last one
    const message = messageId 
      ? roomMessages.find(msg => msg.id === messageId)
      : roomMessages[0];
      
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Create message history for context
    const messageHistory = roomMessages
      .slice(0, 25)
      .reverse()
      .map((msg: Message) => `- ${msg.user_id}: ${msg.content}`)
      .join("\n");
      
    // Get the last HTML generation for context
    const lastGeneration = await supabaseService.getLastGeneration(roomId);
    const lastGenerationHtml = lastGeneration?.html || "";
    
    // Analyze the message
    const visualizationConfidence = await aiService.analyzeMessageForVisualizationIntent(
      message as Message,
      lastGenerationHtml,
      messageHistory
    );
    
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
    logger.error('Error analyzing message:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to analyze message' });
  }
});

/**
 * POST /ai/respond
 * Generate an AI response for a room
 */
router.post('/respond', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.body as RespondRequestBody;
    
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
    logger.error('Error generating AI response:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

/**
 * GET /ai/recent-messages
 * Get recent messages
 */
router.get('/recent-messages', async (req: Request, res: Response) => {
  try {
    const { data: messages, error } = await supabaseService.supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
      
    if (error) {
      throw error;
    }
    
    res.status(200).json({ messages: messages });
  } catch (error) {
    logger.error('Error fetching recent messages:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to fetch recent messages' });
  }
});

export default router;
