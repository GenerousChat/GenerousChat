const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const AIService = require('../services/AIService');
const RoomService = require('../services/RoomService');

router.post('/analyze', async (req, res) => {
    const { roomId, messageId } = req.body;
    
    try {
        const roomService = new RoomService(req.app.locals.supabase);
        const messages = await roomService.getRoomMessages(roomId);
        const lastMessage = messages[messages.length - 1];

        const visualizationConfidence = await AIService.analyzeMessageForVisualizationIntent(lastMessage);
        
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
        logger.error('Error analyzing message', { error, roomId, messageId });
        res.status(500).json({ error: 'Failed to analyze message' });
    }
});

router.post('/respond', async (req, res) => {
    const { roomId, messageHistory, lastMessage } = req.body;
    
    try {
        const selectedAgent = await AIService.selectAgent(roomId, messageHistory, lastMessage);
        if (!selectedAgent) {
            return res.status(404).json({ error: 'No suitable agent found' });
        }

        const response = await AIService.generateResponse(
            roomId,
            messageHistory,
            lastMessage,
            selectedAgent.personality_prompt
        );

        logger.info('AI response generated', { 
            roomId, 
            agentId: selectedAgent.id 
        });

        res.json({ 
            response,
            agent: selectedAgent
        });
    } catch (error) {
        logger.error('Error generating AI response', { error, roomId });
        res.status(500).json({ error: 'Failed to generate AI response' });
    }
});

router.post('/visualize', async (req, res) => {
    const { roomId, messageHistory, lastMessage, expertAgentText } = req.body;
    
    try {
        const htmlContent = await AIService.generateVisualization(
            roomId,
            messageHistory,
            lastMessage,
            expertAgentText
        );

        logger.info('Visualization generated', { roomId });

        res.json({ 
            htmlContent,
            success: true
        });
    } catch (error) {
        logger.error('Error generating visualization', { error, roomId });
        res.status(500).json({ error: 'Failed to generate visualization' });
    }
});

module.exports = router;
