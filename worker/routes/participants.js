const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const PusherService = require('../services/PusherService');

router.post('/join', async (req, res) => {
    const { roomId, userId, joinedAt } = req.body;
    
    try {
        await PusherService.sendEvent(`room-${roomId}`, 'user-joined', {
            user_id: userId,
            joined_at: joinedAt || new Date().toISOString()
        });
        
        logger.info('User joined room', { roomId, userId });
        res.json({ success: true });
    } catch (error) {
        logger.error('Error handling participant join', { error, roomId, userId });
        res.status(500).json({ error: 'Failed to process join request' });
    }
});

router.post('/leave', async (req, res) => {
    const { roomId, userId } = req.body;
    
    try {
        await PusherService.sendEvent(`room-${roomId}`, 'user-left', {
            user_id: userId
        });
        
        logger.info('User left room', { roomId, userId });
        res.json({ success: true });
    } catch (error) {
        logger.error('Error handling participant leave', { error, roomId, userId });
        res.status(500).json({ error: 'Failed to process leave request' });
    }
});

module.exports = router;
